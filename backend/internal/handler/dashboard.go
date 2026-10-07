package handler

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"taskly/internal/middleware"
)

type DashboardHandler struct{ DB *pgxpool.Pool }

type categoryCount struct {
	ID    *int64 `json:"id"` // null = งานที่ไม่มีหมวด
	Name  string `json:"name"`
	Color string `json:"color"`
	Count int    `json:"count"`
}

// หนึ่งแท่งของกราฟ: ช่วงวันที่ start–end (YYYY-MM-DD, เวลาไทย)
// week = 1 วัน, month = 1 สัปดาห์ (ตัดให้อยู่ในเดือนนั้น), year = 1 เดือน (ม.ค.–ธ.ค.)
type trendDay struct {
	Date      string `json:"date"` // วันแรกของช่วง
	End       string `json:"end"`  // วันสุดท้ายของช่วง
	Created   int    `json:"created"`
	Completed int    `json:"completed"`
}

type bucket struct{ start, end time.Time }

// trendBuckets คำนวณช่วงวันที่ของแต่ละแท่งใน Go (ไม่พึ่งการคำนวณวันที่ใน SQL)
func trendBuckets(period string, anchor time.Time) []bucket {
	day := func(y int, m time.Month, d int) time.Time { return time.Date(y, m, d, 0, 0, 0, 0, time.UTC) }
	a := day(anchor.Year(), anchor.Month(), anchor.Day())
	out := []bucket{}
	switch period {
	case "month":
		first := day(a.Year(), a.Month(), 1)
		last := first.AddDate(0, 1, -1)
		ws := first.AddDate(0, 0, -((int(first.Weekday()) + 6) % 7)) // จันทร์ของสัปดาห์แรก
		for ; !ws.After(last); ws = ws.AddDate(0, 0, 7) {
			s, e := ws, ws.AddDate(0, 0, 6)
			if s.Before(first) {
				s = first
			}
			if e.After(last) {
				e = last
			}
			out = append(out, bucket{s, e})
		}
	case "year":
		for m := time.January; m <= time.December; m++ { // 12 แท่ง ม.ค.–ธ.ค. ของปีที่เลือก
			s := day(a.Year(), m, 1)
			out = append(out, bucket{s, s.AddDate(0, 1, -1)})
		}
	default:
		ms := a.AddDate(0, 0, -((int(a.Weekday()) + 6) % 7)) // จันทร์-อาทิตย์
		for i := 0; i < 7; i++ {
			d := ms.AddDate(0, 0, i)
			out = append(out, bucket{d, d})
		}
	}
	return out
}

type focusTask struct {
	ID            int64      `json:"id"`
	Title         string     `json:"title"`
	Status        string     `json:"status"`
	DueAt         *time.Time `json:"due_at"`
	Overdue       bool       `json:"overdue"`
	CategoryName  *string    `json:"category_name"`
	CategoryColor *string    `json:"category_color"`
}

// งานของคนอื่นที่แท็กผู้ใช้คนนี้ไว้ (เห็นได้เฉพาะงานที่ถูกแท็กถึงตัวเองเท่านั้น)
type taggedTask struct {
	ID      int64      `json:"id"`
	Title   string     `json:"title"`
	Status  string     `json:"status"`
	DueAt   *time.Time `json:"due_at"`
	Overdue bool       `json:"overdue"`
	Owner   string     `json:"owner"`
}

// GET /api/dashboard
func (h *DashboardHandler) Get(c *fiber.Ctx) error {
	ctx := c.UserContext()
	uid := middleware.UserID(c)

	var total, todo, doing, done, overdue, dueSoon, completedWeek int
	err := h.DB.QueryRow(ctx, `
		SELECT COUNT(*),
		  COUNT(*) FILTER (WHERE status = 'todo'),
		  COUNT(*) FILTER (WHERE status = 'doing'),
		  COUNT(*) FILTER (WHERE status = 'done'),
		  COUNT(*) FILTER (WHERE status <> 'done' AND due_at < now()),
		  COUNT(*) FILTER (WHERE status <> 'done' AND due_at BETWEEN now() AND now() + interval '3 days'),
		  COUNT(*) FILTER (WHERE completed_at >= now() - interval '7 days')
		FROM tasks WHERE user_id = $1`, uid,
	).Scan(&total, &todo, &doing, &done, &overdue, &dueSoon, &completedWeek)
	if err != nil {
		return err
	}

	// สัดส่วนตามหมวด
	rows, err := h.DB.Query(ctx, `
		SELECT c.id, COALESCE(c.name, 'Uncategorized'), COALESCE(c.color, '#9ca3af'), COUNT(*)
		FROM tasks t LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.user_id = $1
		GROUP BY c.id, c.name, c.color
		ORDER BY COUNT(*) DESC`, uid)
	if err != nil {
		return err
	}
	cats := []categoryCount{}
	for rows.Next() {
		var cc categoryCount
		if err := rows.Scan(&cc.ID, &cc.Name, &cc.Color, &cc.Count); err != nil {
			rows.Close()
			return err
		}
		cats = append(cats, cc)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	// แนวโน้มตามช่วงเวลาที่เลือก
	// period = week/month/year และ anchor ใช้กำหนดช่วงที่ต้องการดู
	// week: 7 แท่ง (จันทร์-อาทิตย์), month: แท่งละสัปดาห์ครอบคลุมทั้งเดือน, year: 12 แท่งตามเดือนของปีนั้น
	period := c.Query("period", "week")
	if period != "month" && period != "year" {
		period = "week"
	}
	anchor := c.Query("anchor", "")
	if anchor == "" {
		anchor = time.Now().In(time.FixedZone("Asia/Bangkok", 7*60*60)).Format("2006-01-02")
	}
	if _, err := time.Parse("2006-01-02", anchor); err != nil {
		anchor = time.Now().In(time.FixedZone("Asia/Bangkok", 7*60*60)).Format("2006-01-02")
	}

	anchorT, _ := time.Parse("2006-01-02", anchor)
	buckets := trendBuckets(period, anchorT)
	starts := make([]string, len(buckets))
	ends := make([]string, len(buckets))
	for i, b := range buckets {
		starts[i] = b.start.Format("2006-01-02")
		ends[i] = b.end.Format("2006-01-02")
	}

	rows, err = h.DB.Query(ctx, `
		WITH b AS (
			SELECT s::date AS s, e::date AS e, n
			FROM unnest($2::text[], $3::text[]) WITH ORDINALITY AS x(s, e, n)
		)
		SELECT (SELECT COUNT(*) FROM tasks t
		         WHERE t.user_id = $1
		           AND (t.created_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN b.s AND b.e),
		       (SELECT COUNT(*) FROM tasks t
		         WHERE t.user_id = $1 AND t.completed_at IS NOT NULL
		           AND (t.completed_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN b.s AND b.e)
		FROM b ORDER BY b.n`, uid, starts, ends)
	if err != nil {
		return err
	}
	trend := []trendDay{}
	for i := 0; rows.Next(); i++ {
		td := trendDay{Date: starts[i], End: ends[i]}
		if err := rows.Scan(&td.Created, &td.Completed); err != nil {
			rows.Close()
			return err
		}
		trend = append(trend, td)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	// งานที่ควรโฟกัส: ยังไม่เสร็จและมีกำหนดเวลา เรียงจากใกล้สุด (เกินกำหนดจะอยู่บนสุด)
	rows, err = h.DB.Query(ctx, `
		SELECT t.id, t.title, t.status::text, t.due_at, t.due_at < now(), c.name, c.color
		FROM tasks t LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.user_id = $1 AND t.status <> 'done' AND t.due_at IS NOT NULL
		ORDER BY t.due_at LIMIT 6`, uid)
	if err != nil {
		return err
	}
	focus := []focusTask{}
	for rows.Next() {
		var f focusTask
		if err := rows.Scan(&f.ID, &f.Title, &f.Status, &f.DueAt, &f.Overdue, &f.CategoryName, &f.CategoryColor); err != nil {
			rows.Close()
			return err
		}
		focus = append(focus, f)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	// งานของคนอื่นที่แท็กฉัน (ยังไม่เสร็จก่อน แล้วค่อยเรียงตามกำหนด)
	rows, err = h.DB.Query(ctx, `
		SELECT t.id, t.title, t.status::text, t.due_at, COALESCE(t.status <> 'done' AND t.due_at < now(), false), u.name
		FROM task_participants p
		JOIN tasks t ON t.id = p.task_id
		JOIN users u ON u.id = t.user_id
		WHERE p.user_id = $1 AND t.user_id <> $1
		ORDER BY (t.status = 'done'), t.due_at NULLS LAST, t.id DESC LIMIT 6`, uid)
	if err != nil {
		return err
	}
	tagged := []taggedTask{}
	for rows.Next() {
		var tt taggedTask
		if err := rows.Scan(&tt.ID, &tt.Title, &tt.Status, &tt.DueAt, &tt.Overdue, &tt.Owner); err != nil {
			rows.Close()
			return err
		}
		tagged = append(tagged, tt)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"total":          total,
		"by_status":      fiber.Map{"todo": todo, "doing": doing, "done": done},
		"overdue":        overdue,
		"due_soon":       dueSoon,
		"completed_week": completedWeek,
		"by_category":    cats,
		"trend":          trend,
		"trend_period":   period,
		"trend_anchor":   anchor,
		"range_start":    starts[0],
		"range_end":      ends[len(ends)-1],
		"focus":          focus,
		"tagged":         tagged,
	})
}
