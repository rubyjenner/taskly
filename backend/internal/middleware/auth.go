package middleware

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

const UserIDKey = "userID"

// Auth ตรวจ Bearer token แล้วเก็บ userID (int64) ไว้ใน c.Locals
func Auth(secret []byte) fiber.Handler {
	return func(c *fiber.Ctx) error {
		h := c.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			return fiber.NewError(fiber.StatusUnauthorized, "missing token")
		}
		tokenStr := strings.TrimPrefix(h, "Bearer ")

		claims := &jwt.RegisteredClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims,
			func(t *jwt.Token) (any, error) { return secret, nil },
			jwt.WithValidMethods([]string{"HS256"}),
		)
		if err != nil || !token.Valid {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
		}
		id, err := strconv.ParseInt(claims.Subject, 10, 64)
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid token subject")
		}
		c.Locals(UserIDKey, id)
		return c.Next()
	}
}

// UserID ดึง userID ที่ middleware เก็บไว้
func UserID(c *fiber.Ctx) int64 {
	id, _ := c.Locals(UserIDKey).(int64)
	return id
}
