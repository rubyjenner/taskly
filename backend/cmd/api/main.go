package main

import (
	"context"
	"errors"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"

	"taskly/internal/handler"
	"taskly/internal/middleware"
	"taskly/migrations"
)

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	secret := os.Getenv("JWT_SECRET")
	if dbURL == "" || secret == "" {
		log.Fatal("DATABASE_URL and JWT_SECRET are required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("db ping: %v", err)
	}
	if err := migrations.Run(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	app := fiber.New(fiber.Config{
		// ส่ง error เป็น JSON {"error": "..."} เสมอ และไม่รั่ว error ภายใน
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			msg := "internal server error"
			var fe *fiber.Error
			if errors.As(err, &fe) {
				code, msg = fe.Code, fe.Message
			} else {
				log.Printf("error: %v", err)
			}
			return c.Status(code).JSON(fiber.Map{"error": msg})
		},
	})
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: env("ALLOWED_ORIGINS", "http://localhost:5173"),
		AllowHeaders: "Content-Type, Authorization",
		AllowMethods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
	}))

	app.Get("/health", func(c *fiber.Ctx) error { return c.JSON(fiber.Map{"status": "ok"}) })

	auth := &handler.AuthHandler{DB: pool, JWTSecret: []byte(secret)}
	api := app.Group("/api")
	api.Post("/auth/register", auth.Register)
	api.Post("/auth/login", auth.Login)

	authMW := middleware.Auth([]byte(secret))
	api.Get("/me", authMW, auth.Me)

	cats := &handler.CategoryHandler{DB: pool}
	api.Get("/categories", authMW, cats.List)
	api.Post("/categories", authMW, cats.Create)
	api.Put("/categories/:id", authMW, cats.Update)
	api.Delete("/categories/:id", authMW, cats.Delete)

	tasks := &handler.TaskHandler{DB: pool}
	api.Get("/tasks", authMW, tasks.List)
	api.Post("/tasks", authMW, tasks.Create)
	api.Get("/tasks/:id", authMW, tasks.Get)
	api.Put("/tasks/:id", authMW, tasks.Update)
	api.Patch("/tasks/:id/status", authMW, tasks.PatchStatus)
	api.Delete("/tasks/:id", authMW, tasks.Delete)

	api.Get("/dashboard", authMW, (&handler.DashboardHandler{DB: pool}).Get)
	api.Get("/users/search", authMW, (&handler.UserHandler{DB: pool}).Search)

	log.Fatal(app.Listen(":" + env("PORT", "8080")))
}
