package handler

import (
	"context"
	"io"
	"mime"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"taskly/internal/middleware"
)

type FileHandler struct{ DB *pgxpool.Pool }

const (
	maxFileSize     = 3 << 20 // 3 MB ต่อไฟล์
	maxFilesPerTask = 10
)

// อนุญาตเฉพาะนามสกุลที่ใช้แนบงานทั่วไป (ไม่รวม svg/html/exe เพื่อกัน XSS และไฟล์อันตราย)
var allowedExt = map[string]bool{
	".pdf": true, ".png": true, ".jpg": true, ".jpeg": true, ".gif": true, ".webp": true,
	".txt": true, ".csv": true, ".md": true, ".doc": true, ".docx": true,
	".xls": true, ".xlsx": true, ".ppt": true, ".pptx": true, ".zip": true,
}

type fileDTO struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Size      int       `json:"size"`
	MIME      string    `json:"mime"`
	CreatedAt time.Time `json:"created_at"`
}

// งานต้องเป็นของผู้ใช้ปัจจุบันเท่านั้น
func (h *FileHandler) ownTask(ctx context.Context, uid, taskID int64) error {
	var ok bool
	if err := h.DB.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2)`, taskID, uid).Scan(&ok); err != nil {
		return err
	}
	if !ok {
		return notFound("task not found")
	}
	return nil
}

// GET /api/tasks/:id/files
func (h *FileHandler) List(c *fiber.Ctx) error {
	id, err := paramID(c)
	if err != nil {
		return err
	}
	ctx, uid := c.UserContext(), middleware.UserID(c)
	if err := h.ownTask(ctx, uid, id); err != nil {
		return err
	}
	rows, err := h.DB.Query(ctx, `SELECT id, name, size, mime, created_at FROM task_files WHERE task_id = $1 ORDER BY id`, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []fileDTO{}
	for rows.Next() {
		var f fileDTO
		if err := rows.Scan(&f.ID, &f.Name, &f.Size, &f.MIME, &f.CreatedAt); err != nil {
			return err
		}
		out = append(out, f)
	}
	return c.JSON(out)
}

// POST /api/tasks/:id/files (multipart/form-data, field "file")
func (h *FileHandler) Upload(c *fiber.Ctx) error {
	id, err := paramID(c)
	if err != nil {
		return err
	}
	ctx, uid := c.UserContext(), middleware.UserID(c)
	if err := h.ownTask(ctx, uid, id); err != nil {
		return err
	}
	fh, err := c.FormFile("file")
	if err != nil {
		return badRequest("file is required")
	}
	if fh.Size > maxFileSize {
		return fiber.NewError(fiber.StatusRequestEntityTooLarge, "file too large (max 3 MB)")
	}
	name := strings.TrimSpace(filepath.Base(fh.Filename))
	ext := strings.ToLower(filepath.Ext(name))
	if name == "" || name == "." || utf8.RuneCountInString(name) > 200 {
		return badRequest("invalid file name")
	}
	if !allowedExt[ext] {
		return badRequest("file type not allowed")
	}
	var n int
	if err := h.DB.QueryRow(ctx, `SELECT COUNT(*) FROM task_files WHERE task_id = $1`, id).Scan(&n); err != nil {
		return err
	}
	if n >= maxFilesPerTask {
		return badRequest("too many files (max 10 per task)")
	}

	src, err := fh.Open()
	if err != nil {
		return err
	}
	defer src.Close()
	data, err := io.ReadAll(io.LimitReader(src, maxFileSize+1))
	if err != nil {
		return err
	}
	if len(data) > maxFileSize {
		return fiber.NewError(fiber.StatusRequestEntityTooLarge, "file too large (max 3 MB)")
	}
	mt := mime.TypeByExtension(ext)
	if mt == "" {
		mt = "application/octet-stream"
	}

	f := fileDTO{Name: name, Size: len(data), MIME: mt}
	if err := h.DB.QueryRow(ctx,
		`INSERT INTO task_files (task_id, name, mime, size, data) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
		id, f.Name, f.MIME, f.Size, data).Scan(&f.ID, &f.CreatedAt); err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(f)
}

func fileParams(c *fiber.Ctx) (taskID, fileID int64, err error) {
	if taskID, err = paramID(c); err != nil {
		return
	}
	fileID, err = strconv.ParseInt(c.Params("fid"), 10, 64)
	if err != nil || fileID <= 0 {
		err = badRequest("invalid file id")
	}
	return
}

// GET /api/tasks/:id/files/:fid — ดาวน์โหลด (เฉพาะเจ้าของงาน)
func (h *FileHandler) Download(c *fiber.Ctx) error {
	taskID, fileID, err := fileParams(c)
	if err != nil {
		return err
	}
	var name, mt string
	var data []byte
	err = h.DB.QueryRow(c.UserContext(), `
		SELECT f.name, f.mime, f.data FROM task_files f JOIN tasks t ON t.id = f.task_id
		WHERE f.id = $1 AND f.task_id = $2 AND t.user_id = $3`,
		fileID, taskID, middleware.UserID(c)).Scan(&name, &mt, &data)
	if err != nil {
		return notFound("file not found")
	}
	c.Set("Content-Type", mt)
	c.Set("Content-Disposition", "attachment; filename*=UTF-8''"+url.PathEscape(name))
	c.Set("X-Content-Type-Options", "nosniff")
	return c.Send(data)
}

// DELETE /api/tasks/:id/files/:fid
func (h *FileHandler) Delete(c *fiber.Ctx) error {
	taskID, fileID, err := fileParams(c)
	if err != nil {
		return err
	}
	tag, err := h.DB.Exec(c.UserContext(), `
		DELETE FROM task_files f USING tasks t
		WHERE f.id = $1 AND f.task_id = $2 AND t.id = f.task_id AND t.user_id = $3`,
		fileID, taskID, middleware.UserID(c))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return notFound("file not found")
	}
	return c.SendStatus(fiber.StatusNoContent)
}
