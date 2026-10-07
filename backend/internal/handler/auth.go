package handler

import (
	"errors"
	"net/mail"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"taskly/internal/middleware"
)

type AuthHandler struct {
	DB        *pgxpool.Pool
	JWTSecret []byte
	AppURL    string // ใช้สร้างลิงก์รีเซ็ตรหัสผ่าน
	ResetDemo bool   // true = คืนลิงก์รีเซ็ตใน response (โหมดทดลอง ไม่มีระบบส่งอีเมล)
}

type userDTO struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Position string `json:"position"`
	Bio      string `json:"bio"`
	Avatar   string `json:"avatar"`
	Social   string `json:"social"`
}

func (h *AuthHandler) issueToken(userID int64) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   strconv.FormatInt(userID, 10),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(h.JWTSecret)
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if req.Name == "" || utf8.RuneCountInString(req.Name) > 100 {
		return fiber.NewError(fiber.StatusBadRequest, "name is required (max 100 chars)")
	}
	if _, err := mail.ParseAddress(req.Email); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid email")
	}
	if err := validatePassword(req.Password, req.Email); err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	var id int64
	err = h.DB.QueryRow(c.UserContext(),
		`INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
		req.Name, req.Email, string(hash),
	).Scan(&id)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique_violation
			return fiber.NewError(fiber.StatusConflict, "email already registered")
		}
		return err
	}

	token, err := h.issueToken(id)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"token": token,
		"user":  userDTO{ID: id, Name: req.Name, Email: req.Email},
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))

	var u userDTO
	var hash string
	err := h.DB.QueryRow(c.UserContext(),
		`SELECT id, name, email, phone, position, bio, password_hash FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Position, &u.Bio, &hash)

	// ข้อความเดียวกันทั้ง "ไม่มี user" และ "รหัสผิด" เพื่อกันการเดาอีเมล
	invalid := fiber.NewError(fiber.StatusUnauthorized, "invalid email or password")
	if errors.Is(err, pgx.ErrNoRows) {
		return invalid
	}
	if err != nil {
		return err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil {
		return invalid
	}

	token, err := h.issueToken(u.ID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"token": token, "user": u})
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	var u userDTO
	err := h.DB.QueryRow(c.UserContext(),
		`SELECT id, name, email, phone, position, bio, avatar, social FROM users WHERE id = $1`, middleware.UserID(c),
	).Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Position, &u.Bio, &u.Avatar, &u.Social)
	if errors.Is(err, pgx.ErrNoRows) {
		return fiber.NewError(fiber.StatusUnauthorized, "user not found")
	}
	if err != nil {
		return err
	}
	return c.JSON(u)
}
