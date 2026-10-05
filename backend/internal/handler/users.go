package handler

import (
	"strings"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserHandler struct{ DB *pgxpool.Pool }

// GET /api/users/search?q=  ใช้เลือกผู้ใช้มาแท็กในงาน
// คืนแค่ id + name (ไม่คืนอีเมลของคนอื่น) และค้นด้วยชื่อ หรืออีเมลแบบตรงเป๊ะเท่านั้น
func (h *UserHandler) Search(c *fiber.Ctx) error {
	q := strings.TrimSpace(c.Query("q"))
	if utf8.RuneCountInString(q) < 2 {
		return badRequest("q must be at least 2 characters")
	}
	rows, err := h.DB.Query(c.UserContext(),
		`SELECT id, name FROM users WHERE name ILIKE $1 OR email = $2 ORDER BY name LIMIT 10`,
		"%"+likeEscaper.Replace(q)+"%", strings.ToLower(q))
	if err != nil {
		return err
	}
	defer rows.Close()

	type item struct {
		ID   int64  `json:"id"`
		Name string `json:"name"`
	}
	out := []item{}
	for rows.Next() {
		var it item
		if err := rows.Scan(&it.ID, &it.Name); err != nil {
			return err
		}
		out = append(out, it)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return c.JSON(out)
}
