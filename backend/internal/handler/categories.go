package handler

import (
	"errors"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"taskly/internal/middleware"
)

type CategoryHandler struct{ DB *pgxpool.Pool }

type categoryDTO struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

type categoryInput struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

var colorRe = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

func (in *categoryInput) validate() error {
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || utf8.RuneCountInString(in.Name) > 50 {
		return badRequest("name is required (max 50 chars)")
	}
	if in.Color == "" {
		in.Color = "#6366f1"
	}
	if !colorRe.MatchString(in.Color) {
		return badRequest("color must look like #6366f1")
	}
	return nil
}

func (h *CategoryHandler) List(c *fiber.Ctx) error {
	rows, err := h.DB.Query(c.UserContext(),
		`SELECT id, name, color FROM categories WHERE user_id = $1 ORDER BY name`,
		middleware.UserID(c))
	if err != nil {
		return err
	}
	defer rows.Close()

	out := []categoryDTO{} // ไม่ให้ JSON เป็น null
	for rows.Next() {
		var d categoryDTO
		if err := rows.Scan(&d.ID, &d.Name, &d.Color); err != nil {
			return err
		}
		out = append(out, d)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return c.JSON(out)
}

func (h *CategoryHandler) Create(c *fiber.Ctx) error {
	var in categoryInput
	if err := c.BodyParser(&in); err != nil {
		return badRequest("invalid request body")
	}
	if err := in.validate(); err != nil {
		return err
	}
	var d categoryDTO
	err := h.DB.QueryRow(c.UserContext(),
		`INSERT INTO categories (user_id, name, color) VALUES ($1, $2, $3) RETURNING id, name, color`,
		middleware.UserID(c), in.Name, in.Color,
	).Scan(&d.ID, &d.Name, &d.Color)
	if isUniqueViolation(err) {
		return fiber.NewError(fiber.StatusConflict, "category name already exists")
	}
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(d)
}

func (h *CategoryHandler) Update(c *fiber.Ctx) error {
	id, err := paramID(c)
	if err != nil {
		return err
	}
	var in categoryInput
	if err := c.BodyParser(&in); err != nil {
		return badRequest("invalid request body")
	}
	if err := in.validate(); err != nil {
		return err
	}
	var d categoryDTO
	// เช็ค user_id ใน WHERE ทุกครั้ง: แก้ได้เฉพาะของตัวเอง
	err = h.DB.QueryRow(c.UserContext(),
		`UPDATE categories SET name = $1, color = $2 WHERE id = $3 AND user_id = $4 RETURNING id, name, color`,
		in.Name, in.Color, id, middleware.UserID(c),
	).Scan(&d.ID, &d.Name, &d.Color)
	if isUniqueViolation(err) {
		return fiber.NewError(fiber.StatusConflict, "category name already exists")
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return notFound("category not found")
	}
	if err != nil {
		return err
	}
	return c.JSON(d)
}

func (h *CategoryHandler) Delete(c *fiber.Ctx) error {
	id, err := paramID(c)
	if err != nil {
		return err
	}
	tag, err := h.DB.Exec(c.UserContext(),
		`DELETE FROM categories WHERE id = $1 AND user_id = $2`, id, middleware.UserID(c))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return notFound("category not found")
	}
	return c.SendStatus(fiber.StatusNoContent) // งานในหมวดนี้จะกลายเป็น "ไม่มีหมวด" (ON DELETE SET NULL)
}
