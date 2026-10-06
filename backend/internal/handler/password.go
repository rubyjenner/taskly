package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"unicode"
)

var commonPasswords = map[string]bool{
	"password1": true, "password123": true, "12345678a": true, "qwerty123": true,
	"abc12345": true, "iloveyou1": true, "admin1234": true, "welcome123": true,
}

// validatePassword: 8-72 ตัว (bcrypt จำกัด 72 bytes), ต้องมีตัวอักษร + ตัวเลข, ไม่ใช่รหัสยอดนิยม/อีเมลตัวเอง
func validatePassword(pw, email string) error {
	if len(pw) < 8 || len(pw) > 72 {
		return badRequest("password must be 8-72 characters")
	}
	var letter, digit bool
	for _, r := range pw {
		if unicode.IsLetter(r) {
			letter = true
		}
		if unicode.IsDigit(r) {
			digit = true
		}
	}
	if !letter || !digit {
		return badRequest("password must contain letters and numbers")
	}
	if commonPasswords[strings.ToLower(pw)] || (email != "" && strings.EqualFold(pw, email)) {
		return badRequest("password is too common or guessable")
	}
	return nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
