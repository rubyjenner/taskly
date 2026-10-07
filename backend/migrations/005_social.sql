-- ช่องทางติดต่อเพิ่มเติมสำหรับโปรไฟล์
ALTER TABLE users ADD COLUMN IF NOT EXISTS social TEXT NOT NULL DEFAULT '';
