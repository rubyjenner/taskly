-- ไฟล์แนบของงาน: เก็บใน Postgres (ดิสก์ของโฮสต์ฟรีไม่ถาวร) จำกัดไฟล์ละ 3 MB ที่ฝั่ง API
CREATE TABLE IF NOT EXISTS task_files (
  id         BIGSERIAL PRIMARY KEY,
  task_id    BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  mime       TEXT NOT NULL DEFAULT 'application/octet-stream',
  size       INT NOT NULL,
  data       BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_files_task ON task_files (task_id);
