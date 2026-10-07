# Taskly

To-Do List app: หลายผู้ใช้, หมวดหมู่, สถานะงาน, แท็กผู้เกี่ยวข้อง, ค้นหา/กรอง, dashboard, กำหนดเวลา

## รันในเครื่อง
```bash
cp .env.example .env     # แก้ค่า secret
docker compose up --build
curl localhost:8080/health
```

## Stack
Go (Fiber) · PostgreSQL · React (Vite) · Docker

## Deploy
- เว็บ: https://taskly-web.onrender.com
- API: https://ttaskly-api.onrender.com/health
- บัญชีทดลอง: `demo@taskly.app` / `Taskly2026` (มีงานตัวอย่างและเพื่อนร่วมทีมที่แท็กกัน เปิดแล้วเห็น dashboard ทันที)
- ฟรีเทียร์ของ Render จะหลับเมื่อไม่มีคนใช้ การเปิดครั้งแรกอาจใช้เวลาประมาณ 1 นาที

ข้อมูลทดลองสร้างอัตโนมัติเมื่อตั้ง `SEED_DEMO=true` (รันซ้ำได้ ไม่สร้างซ้ำ)
