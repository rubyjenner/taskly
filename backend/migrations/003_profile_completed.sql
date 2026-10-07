-- ข้อมูลติดต่อในโปรไฟล์ (ไม่เก็บข้อมูลอ่อนไหว) และเวลาที่งานเสร็จ (ใช้ทำกราฟแนวโน้มใน dashboard)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone    TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio      TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
UPDATE tasks SET completed_at = updated_at WHERE status = 'done' AND completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks (user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_participants_user ON task_participants (user_id);
