-- ไฟล์แนบของรายงาน: เก็บใน PostgreSQL เพื่อไม่พึ่ง disk ของโฮสต์ที่อาจไม่ถาวร
CREATE TABLE IF NOT EXISTS task_attachments (
  id         BIGSERIAL PRIMARY KEY,
  task_id    BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name  TEXT NOT NULL,
  mime_type  TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size  BIGINT NOT NULL,
  data       BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments (task_id, created_at DESC);
