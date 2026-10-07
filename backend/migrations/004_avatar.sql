-- รูปโปรไฟล์: เก็บเป็น data URL ขนาดเล็ก (ย่อเหลือ 256px ที่ฝั่งเบราว์เซอร์) เพราะดิสก์ของโฮสต์ฟรีไม่ถาวร
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT NOT NULL DEFAULT '';
