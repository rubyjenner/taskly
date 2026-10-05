package migrations

import (
	"context"
	"embed"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed *.sql
var files embed.FS

// Run รันไฟล์ .sql ทั้งหมดตามลำดับชื่อไฟล์ (SQL ต้องเป็น idempotent)
func Run(ctx context.Context, pool *pgxpool.Pool) error {
	entries, err := files.ReadDir(".")
	if err != nil {
		return err
	}
	for _, e := range entries {
		b, err := files.ReadFile(e.Name())
		if err != nil {
			return err
		}
		// simple protocol เพื่อให้รันหลาย statement ในไฟล์เดียวได้
		if _, err := pool.Exec(ctx, string(b), pgx.QueryExecModeSimpleProtocol); err != nil {
			return fmt.Errorf("migration %s: %w", e.Name(), err)
		}
	}
	return nil
}
