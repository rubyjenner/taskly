// Package seed สร้างบัญชีทดลองและงานตัวอย่างสำหรับให้ผู้ตรวจเปิดเว็บแล้วเห็น dashboard ทันที
// เปิดใช้ด้วย SEED_DEMO=true และรันซ้ำได้ปลอดภัย (ถ้ามีบัญชีทดลองแล้วจะข้าม)
package seed

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const (
	DemoEmail    = "demo@taskly.app"
	DemoPassword = "Taskly2026"
)

type person struct {
	key, name, email, position, phone, bio string
}

var people = []person{
	{"demo", "ผู้ใช้ทดลอง", DemoEmail, "Product Owner", "081-234-5678", "บัญชีทดลองสำหรับดูการทำงานของ Taskly"},
	{"somchai", "สมชาย ใจดี", "somchai@taskly.app", "Backend Developer", "082-345-6789", ""},
	{"malee", "มาลี สุขสันต์", "malee@taskly.app", "UI Designer", "083-456-7890", ""},
	{"piti", "ปิติ วงศ์ไทย", "piti@taskly.app", "QA Engineer", "", ""},
}

// เวลาทั้งหมดเป็น "ชั่วโมงเทียบกับตอนนี้" เพื่อให้ข้อมูลดูสดใหม่ทุกครั้งที่ seed
// due: + = อนาคต, - = เกินกำหนด, nil = ไม่กำหนด / created, done: กี่ชั่วโมงที่แล้ว / edited: แก้ไขเมื่อกี่ชั่วโมงที่แล้ว
type task struct {
	owner, title, desc, cat, status string
	due                             *int
	created                         int
	done                            *int
	edited                          *int
	tag                             []string // key ของผู้ใช้ในระบบ หรือขึ้นต้นด้วย "@" = ชื่ออิสระ
}

func n(v int) *int { return &v }

var cats = map[string][][2]string{
	"demo":    {{"งานประจำ", "#6366f1"}, {"โปรเจกต์", "#10b981"}, {"เรียนรู้", "#f59e0b"}, {"ส่วนตัว", "#ec4899"}},
	"somchai": {{"Backend", "#0ea5e9"}},
	"malee":   {{"Design", "#a855f7"}},
	"piti":    {{"Testing", "#ef4444"}},
}

var tasks = []task{
	// ---- ของบัญชีทดลอง ----
	{"demo", "ส่งรายงานความคืบหน้าประจำสัปดาห์", "สรุปงานที่ทำ ปัญหา และแผนสัปดาห์หน้า ส่งให้หัวหน้าทีม", "งานประจำ", "todo", n(-20), 100, nil, nil, []string{"@พี่เลี้ยง"}},
	{"demo", "ตอบกลับอีเมลลูกค้า", "", "งานประจำ", "doing", n(-3), 60, nil, n(2), nil},
	{"demo", "เตรียมสไลด์นำเสนอผลงาน", "ใช้ข้อมูลจาก dashboard ล่าสุด", "โปรเจกต์", "doing", n(20), 48, nil, n(5), []string{"malee"}},
	{"demo", "Deploy เวอร์ชันทดลองขึ้น Render", "ตรวจ CORS และตัวแปรสภาพแวดล้อมให้เรียบร้อย", "โปรเจกต์", "todo", n(30), 30, nil, nil, []string{"somchai", "piti"}},
	{"demo", "ทบทวนโค้ดของ API งาน", "", "โปรเจกต์", "todo", n(50), 24, nil, nil, []string{"somchai"}},
	{"demo", "ประชุมวางแผนสปรินต์", "", "งานประจำ", "todo", n(70), 12, nil, nil, []string{"malee", "piti", "somchai"}},
	{"demo", "อ่านเอกสาร PostgreSQL เรื่อง index", "", "เรียนรู้", "todo", n(120), 8, nil, nil, nil},
	{"demo", "ฝึกเขียน unit test ด้วย Go", "", "เรียนรู้", "doing", n(96), 72, nil, n(30), nil},
	{"demo", "นัดตรวจสุขภาพประจำปี", "", "ส่วนตัว", "todo", nil, 5, nil, nil, nil},
	{"demo", "จัดระเบียบโน้ตและไฟล์เอกสาร", "", "ส่วนตัว", "todo", nil, 3, nil, nil, nil},
	{"demo", "ออกแบบโครงสร้างฐานข้อมูล", "users, categories, tasks, task_participants", "โปรเจกต์", "done", n(-100), 150, n(110), nil, []string{"somchai"}},
	{"demo", "เขียน API สมัครสมาชิก/เข้าสู่ระบบ", "", "โปรเจกต์", "done", n(-72), 140, n(80), nil, nil},
	{"demo", "สร้างหน้า Tasks พร้อมค้นหาและกรอง", "", "โปรเจกต์", "done", n(-50), 130, n(52), n(53), []string{"malee"}},
	{"demo", "เพิ่มหน้า Dashboard", "", "โปรเจกต์", "done", n(-30), 120, n(30), nil, nil},
	{"demo", "ตั้งค่า Docker Compose", "", "งานประจำ", "done", n(-20), 100, n(22), nil, nil},
	{"demo", "อัปเดตเอกสาร README", "", "งานประจำ", "done", n(-6), 90, n(6), nil, []string{"piti"}},
	{"demo", "ทดสอบการ reset รหัสผ่าน", "", "โปรเจกต์", "done", nil, 80, n(2), n(2), []string{"piti"}},
	{"demo", "อ่านบทความเรื่อง Clean Architecture", "", "เรียนรู้", "done", nil, 60, n(40), nil, nil},
	// ---- งานของเพื่อนร่วมทีม (บางงานแท็กบัญชีทดลอง) ----
	{"somchai", "เขียน unit test ให้ task handler", "ครอบคลุมกรณี 404 และการแบ่งหน้า", "Backend", "doing", n(26), 40, nil, n(3), []string{"demo"}},
	{"somchai", "ปรับ index ให้การค้นหาเร็วขึ้น", "", "Backend", "todo", n(60), 20, nil, nil, []string{"demo", "piti"}},
	{"somchai", "ตั้งค่า CI สำหรับ build อัตโนมัติ", "", "Backend", "done", n(-12), 70, n(10), nil, []string{"demo"}},
	{"malee", "ออกแบบหน้า Login ใหม่", "ปรับให้รองรับมือถือ", "Design", "doing", n(-5), 50, nil, n(4), []string{"demo"}},
	{"malee", "เลือกชุดสีและฟอนต์", "", "Design", "done", n(-40), 90, n(48), nil, nil},
	{"piti", "ทดสอบ flow สมัครสมาชิกบนมือถือ", "", "Testing", "todo", n(40), 15, nil, nil, []string{"demo", "malee"}},
	{"piti", "เขียน test case สำหรับ Dashboard", "", "Testing", "todo", n(90), 6, nil, nil, nil},
}

// Run สร้างข้อมูลทดลอง (ข้ามถ้ามีบัญชีทดลองอยู่แล้ว)
func Run(ctx context.Context, pool *pgxpool.Pool) error {
	var exists bool
	if err := pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM users WHERE email = $1)`, DemoEmail).Scan(&exists); err != nil {
		return err
	}
	if exists {
		log.Printf("seed: demo data already present, skipping")
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(DemoPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	uid := map[string]int64{}
	for _, p := range people {
		var id int64
		err := tx.QueryRow(ctx,
			`INSERT INTO users (name, email, password_hash, position, phone, bio) VALUES ($1,$2,$3,$4,$5,$6)
			 ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			p.name, p.email, string(hash), p.position, p.phone, p.bio).Scan(&id)
		if err != nil {
			return err
		}
		uid[p.key] = id
	}

	cid := map[string]int64{} // owner|ชื่อหมวด -> id
	for owner, list := range cats {
		for _, c := range list {
			var id int64
			if err := tx.QueryRow(ctx,
				`INSERT INTO categories (user_id, name, color) VALUES ($1,$2,$3) RETURNING id`,
				uid[owner], c[0], c[1]).Scan(&id); err != nil {
				return err
			}
			cid[owner+"|"+c[0]] = id
		}
	}

	for _, t := range tasks {
		if err := insertTask(ctx, tx, uid, cid, t); err != nil {
			return err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	log.Printf("seed: created %d users and %d tasks (login %s / %s)", len(people), len(tasks), DemoEmail, DemoPassword)
	return nil
}

func insertTask(ctx context.Context, tx pgx.Tx, uid, cid map[string]int64, t task) error {
	// ชั่วโมง -> timestamp ใน SQL (NULL ถ้าไม่ระบุ)
	const q = `
	INSERT INTO tasks (user_id, category_id, title, description, status, due_at, created_at, updated_at, completed_at)
	VALUES ($1, $2, $3, $4, $5::task_status,
	  CASE WHEN $6::int IS NULL THEN NULL ELSE now() + $6::int * interval '1 hour' END,
	  now() - $7::int * interval '1 hour',
	  COALESCE(now() - $9::int * interval '1 hour', now() - $8::int * interval '1 hour', now() - $7::int * interval '1 hour'),
	  CASE WHEN $8::int IS NULL THEN NULL ELSE now() - $8::int * interval '1 hour' END)
	RETURNING id`
	var id int64
	if err := tx.QueryRow(ctx, q, uid[t.owner], cid[t.owner+"|"+t.cat], t.title, t.desc, t.status,
		t.due, t.created, t.done, t.edited).Scan(&id); err != nil {
		return err
	}
	for _, k := range t.tag {
		if len(k) > 0 && k[0] == '@' {
			if _, err := tx.Exec(ctx, `INSERT INTO task_participants (task_id, name) VALUES ($1,$2)`, id, k[1:]); err != nil {
				return err
			}
			continue
		}
		if _, err := tx.Exec(ctx, `INSERT INTO task_participants (task_id, user_id) VALUES ($1,$2)`, id, uid[k]); err != nil {
			return err
		}
	}
	return nil
}
