package handler

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"taskly/internal/middleware"
)

// ข้อมูลติดต่อของเจ้าของงาน: ผู้ใช้เป็นคนกรอกในโปรไฟล์เองเพื่อให้คนที่ถูกแท็กติดต่อได้ (ไม่มีข้อมูลอ่อนไหว)
type ownerProfile struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Position string `json:"position"`
	Bio      string `json:"bio"`
	Avatar   string `json:"avatar"`
	Social   string `json:"social"`
}

type taggedItem struct {
	ID          int64        `json:"id"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	Status      string       `json:"status"`
	DueAt       *time.Time   `json:"due_at"`
	Overdue     bool         `json:"overdue"`
	CreatedAt   time.Time    `json:"created_at"`
	Owner       ownerProfile `json:"owner"`
}

// GET /api/tagged — งานของคนอื่นที่แท็กผู้ใช้คนนี้ พร้อมโปรไฟล์ของคนที่แท็ก
// เห็นได้เฉพาะงานที่ถูกแท็กถึงตัวเองเท่านั้น (เงื่อนไข p.user_id = ผู้ใช้ปัจจุบัน)
func (h *DashboardHandler) Tagged(c *fiber.Ctx) error {
	rows, err := h.DB.Query(c.UserContext(), `
		SELECT t.id, t.title, t.description, t.status::text, t.due_at,
		       COALESCE(t.status <> 'done' AND t.due_at < now(), false), t.created_at,
		       u.id, u.name, u.email, u.phone, u.position, u.bio, u.avatar, u.social
		FROM task_participants p
		JOIN tasks t ON t.id = p.task_id
		JOIN users u ON u.id = t.user_id
		WHERE p.user_id = $1 AND t.user_id <> $1
		ORDER BY (t.status = 'done'), t.due_at NULLS LAST, t.id DESC
		LIMIT 200`, middleware.UserID(c))
	if err != nil {
		return err
	}
	defer rows.Close()

	out := []taggedItem{}
	for rows.Next() {
		var it taggedItem
		o := &it.Owner
		if err := rows.Scan(&it.ID, &it.Title, &it.Description, &it.Status, &it.DueAt, &it.Overdue, &it.CreatedAt,
			&o.ID, &o.Name, &o.Email, &o.Phone, &o.Position, &o.Bio, &o.Avatar, &o.Social); err != nil {
			return err
		}
		out = append(out, it)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return c.JSON(out)
}
