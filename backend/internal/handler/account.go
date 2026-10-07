package handler

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"strings"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"taskly/internal/middleware"
)

// PUT /api/me  {"name": "...", "phone": "...", "position": "...", "bio": "..."}
// เก็บเฉพาะข้อมูลติดต่อทั่วไป ไม่เก็บข้อมูลอ่อนไหว (เลขบัตร ที่อยู่ ฯลฯ)
func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	var req struct {
		Name     string  `json:"name"`
		Phone    string  `json:"phone"`
		Position string  `json:"position"`
		Bio      string  `json:"bio"`
		Avatar   *string `json:"avatar"`
		Social   string  `json:"social"` // nil = ไม่แก้, "" = ลบรูป, อื่นๆ = data URL ของรูปใหม่
	}
	if err := c.BodyParser(&req); err != nil {
		return badRequest("invalid request body")
	}
	name := strings.TrimSpace(req.Name)
	phone := strings.TrimSpace(req.Phone)
	position := strings.TrimSpace(req.Position)
	bio := strings.TrimSpace(req.Bio)
	social := strings.TrimSpace(req.Social)
	if name == "" || utf8.RuneCountInString(name) > 100 {
		return badRequest("name is required (max 100 chars)")
	}
	if utf8.RuneCountInString(phone) > 20 || strings.Trim(phone, "0123456789+-() ") != "" {
		return badRequest("phone may contain digits, + - ( ) and spaces only (max 20 chars)")
	}
	if utf8.RuneCountInString(position) > 100 {
		return badRequest("position is too long (max 100 chars)")
	}
	if utf8.RuneCountInString(social) > 300 {
		return badRequest("social is too long (max 300 chars)")
	}
	if utf8.RuneCountInString(bio) > 300 {
		return badRequest("bio is too long (max 300 chars)")
	}
	if req.Avatar != nil && *req.Avatar != "" {
		a := *req.Avatar
		ok := strings.HasPrefix(a, "data:image/jpeg;base64,") || strings.HasPrefix(a, "data:image/png;base64,") || strings.HasPrefix(a, "data:image/webp;base64,")
		if !ok || len(a) > 200_000 {
			return badRequest("avatar must be a small jpeg, png or webp image")
		}
	}
	var u userDTO
	err := h.DB.QueryRow(c.UserContext(),
		`UPDATE users SET name = $1, phone = $2, position = $3, bio = $4, avatar = COALESCE($5::text, avatar), social = $6 WHERE id = $7
		 RETURNING id, name, email, phone, position, bio, avatar, social`,
		name, phone, position, bio, req.Avatar, social, middleware.UserID(c)).Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Position, &u.Bio, &u.Avatar, &u.Social)
	if err != nil {
		return err
	}
	return c.JSON(u)
}

// POST /api/me/password  {"current_password": "...", "new_password": "..."}
// หมายเหตุ: ใช้ 400 (ไม่ใช่ 401) เมื่อรหัสปัจจุบันผิด เพราะ frontend ตีความ 401 ว่า token หมดอายุ
func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	var req struct {
		Current string `json:"current_password"`
		New     string `json:"new_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return badRequest("invalid request body")
	}
	ctx := c.UserContext()
	uid := middleware.UserID(c)

	var hash, email string
	if err := h.DB.QueryRow(ctx, `SELECT password_hash, email FROM users WHERE id = $1`, uid).Scan(&hash, &email); err != nil {
		return err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Current)) != nil {
		return badRequest("current password is incorrect")
	}
	if req.New == req.Current {
		return badRequest("new password must be different from the current one")
	}
	if err := validatePassword(req.New, email); err != nil {
		return err
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.New), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if _, err := h.DB.Exec(ctx, `UPDATE users SET password_hash = $1 WHERE id = $2`, string(newHash), uid); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"message": "password changed"})
}

// POST /api/auth/forgot-password  {"email": "..."}
// ตอบเหมือนกันเสมอ (ไม่บอกว่าอีเมลมีอยู่หรือไม่) token สุ่ม 32 bytes เก็บเฉพาะ hash หมดอายุ 30 นาที ใช้ได้ครั้งเดียว
// ยังไม่มีระบบส่งอีเมล: ถ้าตั้ง RESET_DEMO=true จะคืนลิงก์ใน response (ไว้ให้ผู้ตรวจทดลอง) และ log ลิงก์
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&req); err != nil {
		return badRequest("invalid request body")
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	resp := fiber.Map{"message": "If that email exists, a reset link has been created."}
	ctx := c.UserContext()

	var uid int64
	err := h.DB.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, email).Scan(&uid)
	if errors.Is(err, pgx.ErrNoRows) {
		return c.JSON(resp)
	}
	if err != nil {
		return err
	}

	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return err
	}
	token := hex.EncodeToString(buf)

	if _, err := h.DB.Exec(ctx, `UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`, uid); err != nil {
		return err
	}
	if _, err := h.DB.Exec(ctx,
		`INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '30 minutes')`,
		uid, hashToken(token)); err != nil {
		return err
	}

	if h.ResetDemo {
		link := h.AppURL + "/reset-password?token=" + token
		log.Printf("[demo] password reset link for user %d: %s", uid, link)
		resp["reset_link"] = link
	}
	return c.JSON(resp)
}

// POST /api/auth/reset-password  {"token": "...", "password": "..."}
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return badRequest("invalid request body")
	}
	if err := validatePassword(req.Password, ""); err != nil {
		return err
	}
	ctx := c.UserContext()

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var uid int64
	err = tx.QueryRow(ctx,
		`SELECT user_id FROM password_resets
		 WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() FOR UPDATE`,
		hashToken(req.Token)).Scan(&uid)
	if errors.Is(err, pgx.ErrNoRows) {
		return badRequest("invalid or expired reset link")
	}
	if err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET password_hash = $1 WHERE id = $2`, string(hash), uid); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`, uid); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"message": "password updated"})
}

// DELETE /api/me
func (h *AuthHandler) DeleteAccount(c *fiber.Ctx) error {
	if _, err := h.DB.Exec(c.UserContext(), `DELETE FROM users WHERE id = $1`, middleware.UserID(c)); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}
