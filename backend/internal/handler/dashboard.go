package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"taskly/internal/middleware"
)

type DashboardHandler struct{ DB *pgxpool.Pool }

type categoryCount struct {
	Name  string `json:"name"`
	Color string `json:"color"`
	Count int    `json:"count"`
}

func (h *DashboardHandler) Get(c *fiber.Ctx) error {
	ctx := c.UserContext()
	uid := middleware.UserID(c)

	var total, todo, doing, done, overdue, dueSoon int
	err := h.DB.QueryRow(ctx, `
		SELECT COUNT(*),
		  COUNT(*) FILTER (WHERE status = 'todo'),
		  COUNT(*) FILTER (WHERE status = 'doing'),
		  COUNT(*) FILTER (WHERE status = 'done'),
		  COUNT(*) FILTER (WHERE status <> 'done' AND due_at < now()),
		  COUNT(*) FILTER (WHERE status <> 'done' AND due_at BETWEEN now() AND now() + interval '3 days')
		FROM tasks WHERE user_id = $1`, uid,
	).Scan(&total, &todo, &doing, &done, &overdue, &dueSoon)
	if err != nil {
		return err
	}

	rows, err := h.DB.Query(ctx, `
		SELECT COALESCE(c.name, 'Uncategorized'), COALESCE(c.color, '#9ca3af'), COUNT(*)
		FROM tasks t LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.user_id = $1
		GROUP BY c.id, c.name, c.color
		ORDER BY COUNT(*) DESC`, uid)
	if err != nil {
		return err
	}
	defer rows.Close()

	cats := []categoryCount{}
	for rows.Next() {
		var cc categoryCount
		if err := rows.Scan(&cc.Name, &cc.Color, &cc.Count); err != nil {
			return err
		}
		cats = append(cats, cc)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"total":       total,
		"by_status":   fiber.Map{"todo": todo, "doing": doing, "done": done},
		"overdue":     overdue,
		"due_soon":    dueSoon,
		"by_category": cats,
	})
}
