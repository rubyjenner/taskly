package handler

import (
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"taskly/internal/middleware"
)

const maxAttachmentSize int64 = 10 << 20 // 10 MiB

func cleanAttachmentName(name string) string {
	name = strings.TrimSpace(filepath.Base(name))
	if name == "." || name == "" {
		return "attachment"
	}
	if len(name) > 180 {
		name = name[:180]
	}
	return name
}

func (h *TaskHandler) UploadAttachment(c *fiber.Ctx) error {
	ctx := c.UserContext()
	uid := middleware.UserID(c)
	taskID, err := paramID(c)
	if err != nil {
		return err
	}

	var owner bool
	if err := h.DB.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2)`, taskID, uid).Scan(&owner); err != nil {
		return err
	}
	if !owner {
		return notFound("task not found")
	}

	fh, err := c.FormFile("file")
	if err != nil {
		return badRequest("file is required")
	}
	if fh.Size <= 0 {
		return badRequest("file is empty")
	}
	if fh.Size > maxAttachmentSize {
		return fiber.NewError(fiber.StatusRequestEntityTooLarge, "file is too large (max 10 MB)")
	}

	data, err := readMultipartFile(fh)
	if err != nil {
		return err
	}
	mimeType := fh.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}
	name := cleanAttachmentName(fh.Filename)

	var id int64
	if err := h.DB.QueryRow(ctx, `INSERT INTO task_attachments (task_id, file_name, mime_type, file_size, data) VALUES ($1,$2,$3,$4,$5) RETURNING id`, taskID, name, mimeType, fh.Size, data).Scan(&id); err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id": id, "name": name, "mime_type": mimeType, "size": fh.Size,
	})
}

func readMultipartFile(fh *multipart.FileHeader) ([]byte, error) {
	f, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, maxAttachmentSize+1))
	if err != nil {
		return nil, fmt.Errorf("read attachment: %w", err)
	}
	if int64(len(data)) > maxAttachmentSize {
		return nil, fiber.NewError(fiber.StatusRequestEntityTooLarge, "file is too large (max 10 MB)")
	}
	return data, nil
}

func (h *TaskHandler) DownloadAttachment(c *fiber.Ctx) error {
	ctx := c.UserContext()
	uid := middleware.UserID(c)
	taskID, err := paramID(c)
	if err != nil {
		return err
	}
	attachmentID, err := parsePositiveInt64(c.Params("attachmentID"))
	if err != nil {
		return badRequest("invalid attachment id")
	}

	var name, mimeType string
	var data []byte
	err = h.DB.QueryRow(ctx, `SELECT a.file_name, a.mime_type, a.data
        FROM task_attachments a JOIN tasks t ON t.id = a.task_id
        WHERE a.id = $1 AND a.task_id = $2 AND t.user_id = $3`, attachmentID, taskID, uid).Scan(&name, &mimeType, &data)
	if err != nil {
		return notFound("attachment not found")
	}
	c.Set(fiber.HeaderContentType, mimeType)
	c.Set(fiber.HeaderContentDisposition, fmt.Sprintf(`attachment; filename="%s"`, strings.ReplaceAll(name, `"`, "'")))
	return c.Send(data)
}

func (h *TaskHandler) DeleteAttachment(c *fiber.Ctx) error {
	ctx := c.UserContext()
	uid := middleware.UserID(c)
	taskID, err := paramID(c)
	if err != nil {
		return err
	}
	attachmentID, err := parsePositiveInt64(c.Params("attachmentID"))
	if err != nil {
		return badRequest("invalid attachment id")
	}
	tag, err := h.DB.Exec(ctx, `DELETE FROM task_attachments a USING tasks t WHERE a.id = $1 AND a.task_id = $2 AND t.id = a.task_id AND t.user_id = $3`, attachmentID, taskID, uid)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return notFound("attachment not found")
	}
	return c.SendStatus(fiber.StatusNoContent)
}
