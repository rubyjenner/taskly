import type { Lang } from "./prefs";

// ข้อมูลตัวอย่างจาก seed (ชื่อคน, ชื่องาน, bio) เก็บในฐานข้อมูลเป็นภาษาไทย ไม่ใช่ข้อความของระบบ
// จึงแปลตอนรับข้อมูลจาก API เฉพาะข้อความที่ตรงเป๊ะกับข้อมูลตัวอย่างเท่านั้น (ข้อมูลที่ผู้ใช้พิมพ์เองไม่ถูกแตะ)
const PAIRS: [th: string, en: string][] = [
  // คน
  ["ผู้ใช้ทดลอง", "Demo User"], ["สมชาย ใจดี", "Somchai Jaidee"], ["มาลี สุขสันต์", "Malee Suksan"], ["ปิติ วงศ์ไทย", "Piti Wongthai"],
  ["บัญชีทดลองสำหรับดูการทำงานของ Taskly", "Demo account for exploring how Taskly works"], ["พี่เลี้ยง", "Mentor"],
  // งานของบัญชีทดลอง
  ["ส่งรายงานความคืบหน้าประจำสัปดาห์", "Submit the weekly progress report"],
  ["สรุปงานที่ทำ ปัญหา และแผนสัปดาห์หน้า ส่งให้หัวหน้าทีม", "Summarize work done, issues and next week's plan, then send it to the team lead"],
  ["ตอบกลับอีเมลลูกค้า", "Reply to customer emails"],
  ["เตรียมสไลด์นำเสนอผลงาน", "Prepare the project presentation slides"],
  ["ใช้ข้อมูลจาก dashboard ล่าสุด", "Use the latest data from the dashboard"],
  ["Deploy เวอร์ชันทดลองขึ้น Render", "Deploy the demo version to Render"],
  ["ตรวจ CORS และตัวแปรสภาพแวดล้อมให้เรียบร้อย", "Check CORS and environment variables"],
  ["ทบทวนโค้ดของ API งาน", "Review the task API code"],
  ["ประชุมวางแผนสปรินต์", "Sprint planning meeting"],
  ["อ่านเอกสาร PostgreSQL เรื่อง index", "Read the PostgreSQL docs on indexes"],
  ["ฝึกเขียน unit test ด้วย Go", "Practice writing unit tests in Go"],
  ["นัดตรวจสุขภาพประจำปี", "Book the annual health check-up"],
  ["จัดระเบียบโน้ตและไฟล์เอกสาร", "Organize notes and documents"],
  ["ออกแบบโครงสร้างฐานข้อมูล", "Design the database schema"],
  ["เขียน API สมัครสมาชิก/เข้าสู่ระบบ", "Build the register/login API"],
  ["สร้างหน้า Tasks พร้อมค้นหาและกรอง", "Build the Tasks page with search and filters"],
  ["เพิ่มหน้า Dashboard", "Add the Dashboard page"],
  ["ตั้งค่า Docker Compose", "Set up Docker Compose"],
  ["อัปเดตเอกสาร README", "Update the README"],
  ["ทดสอบการ reset รหัสผ่าน", "Test the password reset"],
  ["อ่านบทความเรื่อง Clean Architecture", "Read the article on Clean Architecture"],
  // งานของเพื่อนร่วมทีม
  ["เขียน unit test ให้ task handler", "Write unit tests for the task handler"],
  ["ครอบคลุมกรณี 404 และการแบ่งหน้า", "Cover 404 cases and pagination"],
  ["ปรับ index ให้การค้นหาเร็วขึ้น", "Tune the index to speed up search"],
  ["ตั้งค่า CI สำหรับ build อัตโนมัติ", "Set up CI for automatic builds"],
  ["ออกแบบหน้า Login ใหม่", "Redesign the Login page"],
  ["ปรับให้รองรับมือถือ", "Make it mobile-friendly"],
  ["เลือกชุดสีและฟอนต์", "Choose the color palette and fonts"],
  ["ทดสอบ flow สมัครสมาชิกบนมือถือ", "Test the sign-up flow on mobile"],
  ["เขียน test case สำหรับ Dashboard", "Write test cases for the Dashboard"],
];
const TO_EN = new Map(PAIRS);
const TO_TH = new Map(PAIRS.map(([th, en]) => [en, th]));

export function localizeDeep<T>(value: T, lang: Lang): T {
  const map = lang === "en" ? TO_EN : TO_TH;
  const walk = (x: unknown): unknown => {
    if (typeof x === "string") return map.get(x) ?? x;
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, walk(v)]));
    return x;
  };
  return walk(value) as T;
}
