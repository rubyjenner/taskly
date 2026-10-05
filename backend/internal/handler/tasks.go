package handler

import (
	"context"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"taskly/internal/middleware"
)

type TaskHandler struct{ DB *pgxpool.Pool }

var validStatus = map[string]bool{"todo": true, "doing": true, "done": true}

type participantDTO struct {
	UserID *int64 `json:"user_id,omitempty"` // ผู้ใช้ในระบบ
	Name   string `json:"name"`              // ชื่ออิสระ (ถ้าไม่ใช่ผู้ใช้ในระบบ) / ชื่อที่ resolve แล้วตอนอ่าน
}

type taskDTO struct {
	ID            int64            `json:"id"`
	Title         string           `json:"title"`
	Description   string           `json:"description"`
	Status        string           `json:"status"`
	CategoryID    *int64           `json:"category_id"`
	CategoryName  *string          `json:"category_name"`
	CategoryColor *string          `json:"category_color"`
	DueAt         *time.Time       `json:"due_at"`
	Overdue       bool             `json:"overdue"`
	CreatedAt     time.Time        `json:"created_at"`
	UpdatedAt     time.Time        `json:"updated_at"`
	Participants  []participantDTO `json:"participants"`
}

type taskInput struct {
	Title        string           `json:"title"`
	Description  string           `json:"description"`
	Status       string           `json:"status"`
	CategoryID   *int64           `json:"category_id"`
	DueAt        *time.Time       `json:"due_at"`
	Participants []participantDTO `json:"participants"`
}

const taskSelect = `SELECT t.id, t.title, t.description, t.status::text, t.category_id,
	c.name, c.color, t.due_at, t.created_at, t.updated_at
	FROM tasks t LEFT JOIN categories c ON c.id = t.category_id`

func (in *taskInput) validate() error {
	in.Title = strings.TrimSpace(in.Title)
	if in.Title == "" || utf8.RuneCountInString(in.Title) > 200 {
		return badRequest("title is required (max 200 chars)")
	}
	if utf8.RuneCountInString(in.Description) > 2000 {
		return badRequest("description too long (max 2000 chars)")
	}
	if in.Status == "" {
		in.Status = "todo"
	}
	if !validStatus[in.Status] {
		return badRequest("status must be todo, doing or done")
	}
	if len(in.Participants) > 20 {
		return badRequest("too many participants (max 20)")
	}
	for i := range in.Participants {
		p := &in.Participants[i]
		p.Name = strings.TrimSpace(p.Name)
		if p.UserID == nil && (p.Name == "" || utf8.RuneCountInString(p.Name) > 100) {
			return badRequest("each participant needs a user_id or a name (max 100 chars)")
		}
	}
	return nil
}

// checkRefs: category ต้องเป็นของ user นี้, participant ที่เป็น user ต้องมีอยู่จริง
func (h *TaskHandler) checkRefs(ctx context.Context, uid int64, in *taskInput) error {
	if in.CategoryID != nil {
		var ok bool
		err := h.DB.QueryRow(ctx,
			`SELECT EXISTS (SELECT 1 FROM categories WHERE id = $1 AND user_id = $2)`,
			*in.CategoryID, uid).Scan(&ok)
		if err != nil {
			return err
		}
		if !ok {
			return badRequest("category not found")
		}
	}
	set := map[int64]bool{}
	for _, p := range in.Participants {
		if p.UserID != nil {
			set[*p.UserID] = true
		}
	}
	if len(set) > 0 {
		ids := make([]int64, 0, len(set))
		for id := range set {
			ids = append(ids, id)
		}
		var n int
		if err := h.DB.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE id = ANY($1)`, ids).Scan(&n); err != nil {
			return err
		}
		if n != len(ids) {
			return badRequest("participant user not found")
		}
	}
	return nil
}

func saveParticipants(ctx context.Context, tx pgx.Tx, taskID int64, ps []participantDTO) error {
	for _, p := range ps {
		var err error
		if p.UserID != nil {
			_, err = tx.Exec(ctx,
				`INSERT INTO task_participants (task_id, user_id) VALUES ($1, $2)`, taskID, *p.UserID)
		} else {
			_, err = tx.Exec(ctx,
				`INSERT INTO task_participants (task_id, name) VALUES ($1, $2)`, taskID, p.Name)
		}
		if err != nil {
			return err
		}
	}
	return nil
}

func scanTasks(rows pgx.Rows) ([]taskDTO, error) {
	defer rows.Close()
	now := time.Now()
	out := []taskDTO{}
	for rows.Next() {
		var t taskDTO
		if err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.CategoryID,
			&t.CategoryName, &t.CategoryColor, &t.DueAt, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		t.Overdue = t.DueAt != nil && t.Status != "done" && t.DueAt.Before(now)
		t.Participants = []participantDTO{}
		out = append(out, t)
	}
	return out, rows.Err()
}

// attachParticipants ดึงผู้เกี่ยวข้องของทุกงานใน query เดียว (เลี่ยง N+1)
func (h *TaskHandler) attachParticipants(ctx context.Context, tasks []taskDTO) error {
	if len(tasks) == 0 {
		return nil
	}
	ids := make([]int64, len(tasks))
	idx := make(map[int64]int, len(tasks))
	for i, t := range tasks {
		ids[i] = t.ID
		idx[t.ID] = i
	}
	rows, err := h.DB.Query(ctx,
		`SELECT p.task_id, p.user_id, COALESCE(u.name, p.name, '')
		 FROM task_participants p LEFT JOIN users u ON u.id = p.user_id
		 WHERE p.task_id = ANY($1) ORDER BY p.id`, ids)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var taskID int64
		var p participantDTO
		if err := rows.Scan(&taskID, &p.UserID, &p.Name); err != nil {
			return err
		}
		i := idx[taskID]
		tasks[i].Participants = append(tasks[i].Participants, p)
	}
	return rows.Err()
}

func (h *TaskHandler) getOne(ctx context.Context, uid, id int64) (*taskDTO, error) {
	rows, err := h.DB.Query(ctx, taskSelect+` WHERE t.id = $1 AND t.user_id = $2`, id, uid)
	if err != nil {
		return nil, err
	}
	tasks, err := scanTasks(rows)
	if err != nil {
		return nil, err
	}
	if len(tasks) == 0 {
		return nil, notFound("task not found")
	}
	if err := h.attachParticipants(ctx, tasks); err != nil {
		return nil, err
	}
	return &tasks[0], nil
}

// GET /api/tasks?q=&status=&category_id=&participant=&due_from=&due_to=&overdue=true&sort=&order=&page=&limit=
func (h *TaskHandler) List(c *fiber.Ctx) error {
	ctx := c.UserContext()
	uid := middleware.UserID(c)

	where := []string{"t.user_id = $1"} // กรองด้วยเจ้าของเสมอ
	args := []any{uid}
	add := func(cond string, v any) {
		args = append(args, v)
		where = append(where, strings.ReplaceAll(cond, "?", "$"+strconv.Itoa(len(args))))
	}

	if q := strings.TrimSpace(c.Query("q")); q != "" {
		add(`(t.title ILIKE ? OR t.description ILIKE ?)`, "%"+likeEscaper.Replace(q)+"%")
	}
	if s := c.Query("status"); s != "" {
		if !validStatus[s] {
			return badRequest("invalid status")
		}
		add(`t.status::text = ?`, s)
	}
	if s := c.Query("category_id"); s != "" {
		id, err := strconv.ParseInt(s, 10, 64)
		if err != nil {
			return badRequest("invalid category_id")
		}
		add(`t.category_id = ?`, id)
	}
	if s := strings.TrimSpace(c.Query("participant")); s != "" {
		add(`EXISTS (SELECT 1 FROM task_participants p LEFT JOIN users u ON u.id = p.user_id
			WHERE p.task_id = t.id AND (p.name ILIKE ? OR u.name ILIKE ?))`,
			"%"+likeEscaper.Replace(s)+"%")
	}
	if s := c.Query("due_from"); s != "" {
		t, err := parseTime(s)
		if err != nil {
			return badRequest("invalid due_from")
		}
		add(`t.due_at >= ?`, t)
	}
	if s := c.Query("due_to"); s != "" {
		t, err := parseTime(s)
		if err != nil {
			return badRequest("invalid due_to")
		}
		if len(s) == 10 { // วันที่ล้วน: รวมทั้งวัน
			t = t.AddDate(0, 0, 1)
		}
		add(`t.due_at < ?`, t)
	}
	if c.Query("overdue") == "true" {
		where = append(where, `t.status <> 'done' AND t.due_at < now()`)
	}

	// sort ใช้ whitelist เท่านั้น (ห้ามต่อ string จาก client ลง SQL ตรงๆ)
	sortCol := map[string]string{
		"created_at": "t.created_at", "due_at": "t.due_at", "title": "t.title",
	}[c.Query("sort", "created_at")]
	if sortCol == "" {
		return badRequest("invalid sort")
	}
	dir := "DESC"
	if strings.EqualFold(c.Query("order"), "asc") {
		dir = "ASC"
	}

	page := max(c.QueryInt("page", 1), 1)
	limit := min(max(c.QueryInt("limit", 20), 1), 100)
	whereSQL := strings.Join(where, " AND ")

	var total int
	if err := h.DB.QueryRow(ctx, "SELECT COUNT(*) FROM tasks t WHERE "+whereSQL, args...).Scan(&total); err != nil {
		return err
	}

	args = append(args, limit, (page-1)*limit)
	sql := taskSelect + " WHERE " + whereSQL +
		" ORDER BY " + sortCol + " " + dir + " NULLS LAST, t.id DESC" +
		" LIMIT $" + strconv.Itoa(len(args)-1) + " OFFSET $" + strconv.Itoa(len(args))
	rows, err := h.DB.Query(ctx, sql, args...)
	if err != nil {
		return err
	}
	tasks, err := scanTasks(rows)
	if err != nil {
		return err
	}
	if err := h.attachParticipants(ctx, tasks); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"data": tasks, "total": total, "page": page, "limit": limit})
}

func (h *TaskHandler) Get(c *fiber.Ctx) error {
	id, err := paramID(c)
	if err != nil {
		return err
	}
	t, err := h.getOne(c.UserContext(), middleware.UserID(c), id)
	if err != nil {
		return err
	}
	return c.JSON(t)
}

func (h *TaskHandler) Create(c *fiber.Ctx) error {
	ctx := c.UserContext()
	uid := middleware.UserID(c)

	var in taskInput
	if err := c.BodyParser(&in); err != nil {
		return badRequest("invalid request body")
	}
	if err := in.validate(); err != nil {
		return err
	}
	if err := h.checkRefs(ctx, uid, &in); err != nil {
		return err
	}

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var id int64
	err = tx.QueryRow(ctx,
		`INSERT INTO tasks (user_id, category_id, title, description, status, due_at)
		 VALUES ($1, $2, $3, $4, $5::task_status, $6) RETURNING id`,
		uid, in.CategoryID, in.Title, in.Description, in.Status, in.DueAt,
	).Scan(&id)
	if err != nil {
		return err
	}
	if err := saveParticipants(ctx, tx, id, in.Participants); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}

	t, err := h.getOne(ctx, uid, id)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(t)
}

func (h *TaskHandler) Update(c *fiber.Ctx) error {
	ctx := c.UserContext()
	uid := middleware.UserID(c)
	id, err := paramID(c)
	if err != nil {
		return err
	}

	var in taskInput
	if err := c.BodyParser(&in); err != nil {
		return badRequest("invalid request body")
	}
	if err := in.validate(); err != nil {
		return err
	}
	if err := h.checkRefs(ctx, uid, &in); err != nil {
		return err
	}

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx,
		`UPDATE tasks SET category_id = $1, title = $2, description = $3,
		 status = $4::task_status, due_at = $5, updated_at = now()
		 WHERE id = $6 AND user_id = $7`,
		in.CategoryID, in.Title, in.Description, in.Status, in.DueAt, id, uid)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return notFound("task not found")
	}
	if _, err := tx.Exec(ctx, `DELETE FROM task_participants WHERE task_id = $1`, id); err != nil {
		return err
	}
	if err := saveParticipants(ctx, tx, id, in.Participants); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}

	t, err := h.getOne(ctx, uid, id)
	if err != nil {
		return err
	}
	return c.JSON(t)
}

// PATCH /api/tasks/:id/status  {"status":"doing"}
func (h *TaskHandler) PatchStatus(c *fiber.Ctx) error {
	ctx := c.UserContext()
	uid := middleware.UserID(c)
	id, err := paramID(c)
	if err != nil {
		return err
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return badRequest("invalid request body")
	}
	if !validStatus[body.Status] {
		return badRequest("status must be todo, doing or done")
	}
	tag, err := h.DB.Exec(ctx,
		`UPDATE tasks SET status = $1::task_status, updated_at = now() WHERE id = $2 AND user_id = $3`,
		body.Status, id, uid)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return notFound("task not found")
	}
	t, err := h.getOne(ctx, uid, id)
	if err != nil {
		return err
	}
	return c.JSON(t)
}

func (h *TaskHandler) Delete(c *fiber.Ctx) error {
	id, err := paramID(c)
	if err != nil {
		return err
	}
	tag, err := h.DB.Exec(c.UserContext(),
		`DELETE FROM tasks WHERE id = $1 AND user_id = $2`, id, middleware.UserID(c))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return notFound("task not found")
	}
	return c.SendStatus(fiber.StatusNoContent)
}
