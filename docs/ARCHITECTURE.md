# Taskly: สถาปัตยกรรมและ Flow

เอกสารนี้สรุปภาพรวมระบบ ฐานข้อมูล และขั้นตอนการทำงานหลักของ Taskly
แผนภาพทั้งหมดเขียนด้วย [Mermaid](https://mermaid.js.org/) ซึ่ง GitHub แสดงเป็นภาพให้อัตโนมัติ

## 1. ภาพรวมระบบ

```mermaid
flowchart LR
    user(["ผู้ใช้ (เบราว์เซอร์)"])

    subgraph render ["Render (Singapore)"]
        web["taskly-web<br/>React + Vite (static site)"]
        api["ttaskly-api<br/>Go Fiber (Docker)"]
        db[("PostgreSQL")]
    end

    user -->|"เปิดหน้าเว็บ"| web
    web -->|"HTTPS + JWT (REST /api)"| api
    api -->|"SQL (parameterized, pgx)"| db

    subgraph mw ["Middleware ใน API"]
        direction TB
        m1["Helmet: security headers"]
        m2["CORS: เฉพาะ origin ของเว็บ"]
        m3["Rate limit: เส้นทาง auth"]
        m4["Auth: ตรวจ JWT"]
        m1 --> m2 --> m3 --> m4
    end
    api -.-> mw
```

## 2. โครงสร้างฐานข้อมูล

```mermaid
erDiagram
    USERS ||--o{ CATEGORIES : "เป็นเจ้าของ"
    USERS ||--o{ TASKS : "เป็นเจ้าของ"
    USERS ||--o{ PASSWORD_RESETS : "ขอรีเซ็ต"
    CATEGORIES |o--o{ TASKS : "จัดหมวด"
    TASKS ||--o{ TASK_PARTICIPANTS : "แท็กผู้เกี่ยวข้อง"
    TASKS ||--o{ TASK_FILES : "ไฟล์แนบ"
    USERS |o--o{ TASK_PARTICIPANTS : "ถูกแท็ก"

    USERS {
        bigint id PK
        text name
        text email UK
        text password_hash "bcrypt"
        text phone
        text position
        text bio
        text avatar "data URL ขนาดเล็ก"
        text social
        timestamptz created_at
    }
    CATEGORIES {
        bigint id PK
        bigint user_id FK
        text name "unique ต่อผู้ใช้"
        text color
    }
    TASKS {
        bigint id PK
        bigint user_id FK
        bigint category_id FK "ว่างได้"
        text title
        text description
        task_status status "todo, doing, done"
        timestamptz due_at "ว่างได้"
        timestamptz completed_at "ใช้ทำกราฟแนวโน้ม"
        timestamptz created_at
        timestamptz updated_at
    }
    TASK_PARTICIPANTS {
        bigint id PK
        bigint task_id FK
        bigint user_id FK "ผู้ใช้ในระบบ"
        text name "หรือชื่ออิสระ"
    }
    TASK_FILES {
        bigint id PK
        bigint task_id FK "ลบงาน = ลบไฟล์"
        text name
        text mime
        int size "สูงสุด 3 MB"
        bytea data "เก็บใน PostgreSQL"
        timestamptz created_at
    }
    PASSWORD_RESETS {
        bigint id PK
        bigint user_id FK
        text token_hash UK "เก็บเฉพาะ SHA-256"
        timestamptz expires_at "30 นาที"
        timestamptz used_at "ใช้ได้ครั้งเดียว"
    }
```

> ไฟล์แนบเก็บเป็น `bytea` ใน PostgreSQL เพราะดิสก์ของโฮสต์ฟรีไม่ถาวร (ถ้าต้องรองรับไฟล์ใหญ่หรือจำนวนมาก ควรย้ายไปที่เก็บไฟล์ภายนอก เช่น object storage)

## 3. สมัครสมาชิกและเข้าสู่ระบบ

```mermaid
sequenceDiagram
    autonumber
    actor U as ผู้ใช้
    participant W as เว็บ (React)
    participant A as API (Go Fiber)
    participant D as PostgreSQL

    U->>W: กรอกอีเมลและรหัสผ่าน
    W->>W: ตรวจรหัสผ่านเบื้องต้น (UX เท่านั้น)
    W->>A: POST /api/auth/register หรือ /login
    A->>A: Rate limit ต่อ IP
    A->>A: validatePassword (8-72 ตัว มีตัวอักษรและตัวเลข)
    alt สมัครใหม่
        A->>D: INSERT users (bcrypt hash)
    else เข้าสู่ระบบ
        A->>D: SELECT password_hash ตามอีเมล
        A->>A: bcrypt compare
    end
    A-->>W: JWT (หมดอายุ 24 ชม.)
    W->>W: เก็บ token แล้วไปหน้า /tasks
    Note over W,A: ทุก request หลังจากนี้ส่ง Authorization: Bearer token
    W->>A: GET /api/tasks
    A->>A: middleware ตรวจ JWT ได้ user id
    A->>D: SELECT ... WHERE user_id = ผู้ใช้ปัจจุบัน
    A-->>W: เฉพาะงานของผู้ใช้คนนั้น
```

## 4. ลืมรหัสผ่านและตั้งรหัสใหม่

```mermaid
sequenceDiagram
    autonumber
    actor U as ผู้ใช้
    participant W as เว็บ
    participant A as API
    participant D as PostgreSQL

    U->>W: กรอกอีเมลในหน้า "ลืมรหัสผ่าน"
    W->>A: POST /api/auth/forgot-password
    A->>D: หา user ตามอีเมล
    A->>A: สุ่ม token 32 bytes
    A->>D: เก็บเฉพาะ SHA-256 ของ token (หมดอายุ 30 นาที)
    A-->>W: ข้อความเดียวกันเสมอ (ไม่บอกว่ามีอีเมลนี้หรือไม่)
    Note over A,W: โหมดทดลอง RESET_DEMO=true คืนลิงก์ในหน้าเว็บ<br/>ระบบจริงต้องส่งทางอีเมลแทน
    U->>W: เปิดลิงก์ /reset-password?token=...
    W->>A: POST /api/auth/reset-password (token + รหัสใหม่)
    A->>D: BEGIN แล้วหา token ที่ยังไม่ใช้และไม่หมดอายุ (FOR UPDATE)
    A->>D: อัปเดต password_hash และตั้ง used_at
    A->>D: COMMIT
    A-->>W: สำเร็จ แล้วพากลับหน้าเข้าสู่ระบบ
```

## 5. สถานะของงาน

```mermaid
stateDiagram-v2
    [*] --> todo : สร้างงาน
    todo --> doing : เริ่มทำ
    doing --> done : เสร็จ (บันทึก completed_at)
    todo --> done : เสร็จทันที
    done --> doing : เปิดงานกลับมาทำ
    done --> todo : ย้อนกลับ
    doing --> todo : พักงาน
    done --> [*] : ลบงาน
    note right of doing
        "เกินกำหนด" ไม่ใช่สถานะที่เก็บไว้
        คำนวณจาก due_at < เวลาปัจจุบัน
        และสถานะยังไม่ใช่ done
    end note
```

## 6. แท็กผู้เกี่ยวข้องและการแจ้งเตือน

```mermaid
flowchart TD
    A["เจ้าของงานสร้างหรือแก้งาน<br/>เลือกผู้ใช้ในระบบเป็นผู้เกี่ยวข้อง"] --> B["API ตรวจว่าผู้ใช้ที่แท็กมีอยู่จริง"]
    B --> C[("task_participants<br/>task_id + user_id")]
    C --> D["ผู้ถูกแท็กเรียก GET /api/tagged"]
    D --> E{"เห็นงานนี้แล้วหรือยัง"}
    E -->|"ยังไม่เห็น"| F["กระดิ่งแสดงจุดแดง"]
    E -->|"เห็นแล้ว"| G["ไม่แสดงจุดแดง"]
    F --> H["หน้า 'งานที่ถูกแท็กถึงฉัน'"]
    G --> H
    H --> I["คลิกเพื่อดูโปรไฟล์และข้อมูลติดต่อของเจ้าของงาน"]

    J["Dashboard: งานที่ยังไม่เสร็จ"] --> K{"เกินกำหนด หรือ<br/>ใกล้ครบกำหนดตามที่ตั้งไว้"}
    K -->|"ใช่"| F
    K -->|"ไม่"| G
```

## 7. ไฟล์แนบของงาน

```mermaid
flowchart TD
    A["ผู้ใช้เลือกไฟล์ในหน้าแก้ไขงาน"] --> B["POST /api/tasks/:id/files"]
    B --> C{"งานเป็นของผู้ใช้นี้หรือไม่"}
    C -->|"ไม่ใช่"| X1["404 ไม่พบงาน"]
    C -->|"ใช่"| D{"ไม่เกิน 3 MB และไม่เกิน 10 ไฟล์ต่องาน"}
    D -->|"เกิน"| X2["413 หรือ 400"]
    D -->|"ผ่าน"| E{"นามสกุลอยู่ในรายการที่อนุญาต<br/>(ไม่รวม svg, html, exe)"}
    E -->|"ไม่อนุญาต"| X3["400 ชนิดไฟล์ไม่ได้รับอนุญาต"]
    E -->|"อนุญาต"| F[("INSERT task_files<br/>เก็บเนื้อไฟล์เป็น bytea")]
    F --> G["ดาวน์โหลด: GET /api/tasks/:id/files/:fid<br/>เฉพาะเจ้าของงาน<br/>Content-Disposition: attachment + nosniff"]
```

## 8. การ deploy

```mermaid
flowchart LR
    dev["นักพัฒนา<br/>git push"] --> gh["GitHub<br/>rubyjenner/taskly"]
    gh -->|"auto deploy"| rweb["Render: taskly-web<br/>build ด้วย npm"]
    gh -->|"auto deploy"| rapi["Render: ttaskly-api<br/>build ด้วย Dockerfile"]
    rapi --> rdb[("Render PostgreSQL")]
    rapi -->|"รัน migration ตอนเริ่ม<br/>และ seed ข้อมูลทดลอง"| rdb

    envweb["ตัวแปรของเว็บ<br/>VITE_API_URL"] -.-> rweb
    envapi["ตัวแปรของ API<br/>DATABASE_URL, JWT_SECRET<br/>ALLOWED_ORIGINS, APP_URL<br/>SEED_DEMO, RESET_DEMO"] -.-> rapi
```

## 9. API หลัก

| กลุ่ม | เส้นทาง |
|---|---|
| ระบบ | `GET /health` (ไม่ต้องล็อกอิน) |
| Auth | `POST /api/auth/register`, `/login`, `/forgot-password`, `/reset-password` |
| บัญชี | `GET/PUT/DELETE /api/me`, `POST /api/me/password` |
| หมวดหมู่ | `GET/POST /api/categories`, `PUT/DELETE /api/categories/:id` |
| งาน | `GET/POST /api/tasks`, `GET/PUT/DELETE /api/tasks/:id`, `PATCH /api/tasks/:id/status` |
| ไฟล์แนบ | `GET/POST /api/tasks/:id/files`, `GET/DELETE /api/tasks/:id/files/:fid` |
| สรุปและทีม | `GET /api/dashboard`, `GET /api/tagged`, `GET /api/users/search` |

ทุกเส้นทางนอกจากกลุ่ม Auth ต้องแนบ JWT และทุก query กรองด้วยเจ้าของข้อมูล
