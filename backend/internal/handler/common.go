package handler

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgconn"
)

// escape ตัวอักษรพิเศษของ LIKE/ILIKE เพื่อไม่ให้ผู้ใช้ใส่ % หรือ _ มาเปลี่ยนความหมายการค้นหา
var likeEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func badRequest(msg string) error { return fiber.NewError(fiber.StatusBadRequest, msg) }
func notFound(msg string) error   { return fiber.NewError(fiber.StatusNotFound, msg) }

func paramID(c *fiber.Ctx) (int64, error) {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil || id <= 0 {
		return 0, badRequest("invalid id")
	}
	return id, nil
}

// parseTime รับ RFC3339 (แนะนำ) หรือวันที่ล้วน YYYY-MM-DD (ตีความเป็น UTC)
func parseTime(s string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	return time.Parse("2006-01-02", s)
}
