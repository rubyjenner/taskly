import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type Lang = "th" | "en";
export type Theme = "light" | "dark";

const th = {
  tagline: "จัดงาน ติดตามสถานะ รู้ว่าอะไรใกล้ถึงกำหนด",
  login: "เข้าสู่ระบบ", register: "สมัครสมาชิก", email: "อีเมล", password: "รหัสผ่าน",
  confirmPassword: "ยืนยันรหัสผ่าน", name: "ชื่อ", forgot: "ลืมรหัสผ่าน?",
  noAccount: "ยังไม่มีบัญชี?", haveAccount: "มีบัญชีแล้ว?",
  connecting: "กำลังเชื่อมต่อเซิร์ฟเวอร์ ครั้งแรกอาจใช้เวลาประมาณ 1 นาที…",
  pwHint: "อย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข",
  pwInvalid: "รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีทั้งตัวอักษรและตัวเลข",
  pwMismatch: "รหัสผ่านไม่ตรงกัน", pwWeak: "อ่อน", pwFair: "พอใช้", pwStrong: "แข็งแรง",
  navTasks: "งานของฉัน", navDashboard: "ภาพรวม", navAccount: "บัญชี", logout: "ออกจากระบบ",
  settings: "ตั้งค่า", language: "ภาษา", theme: "ธีม", light: "สว่าง", dark: "มืด",
  addTask: "เพิ่มงาน", searchPh: "ค้นหางาน…", allStatus: "ทุกสถานะ", allCategories: "ทุกหมวดหมู่",
  categoryLabel: "หมวดหมู่", noCategory: "ไม่มีหมวดหมู่", addCategoryPh: "ชื่อหมวดหมู่ใหม่…",
  addCategory: "เพิ่มหมวดหมู่", noTasks: "ยังไม่มีงาน กด “เพิ่มงาน” เพื่อเริ่มต้น", loading: "กำลังโหลด…",
  prev: "ก่อนหน้า", next: "ถัดไป", page: "หน้า", edit: "แก้ไข", del: "ลบ", view: "ดูรายละเอียด",
  confirmDelete: "ลบงานนี้ใช่ไหม?", todo: "รอทำ", doing: "กำลังทำ", done: "เสร็จแล้ว",
  newTask: "เพิ่มงานใหม่", editTask: "แก้ไขงาน", titlePh: "ชื่องาน", descPh: "รายละเอียด (ไม่บังคับ)",
  statusLabel: "สถานะ", dueLabel: "กำหนดเวลา", participants: "ผู้ที่เกี่ยวข้อง",
  participantPh: "พิมพ์ชื่อแล้วกด Enter", add: "เพิ่ม", cancel: "ยกเลิก", save: "บันทึก",
  details: "รายละเอียดงาน", created: "เพิ่มเมื่อ", edited: "แก้ไขแล้ว", due: "กำหนด",
  overdue: "เกินกำหนด", noDue: "ไม่ได้กำหนดเวลา", noDesc: "ไม่มีรายละเอียด", close: "ปิด",
  dashTitle: "ภาพรวมงานของคุณ", total: "งานทั้งหมด", completion: "ความคืบหน้า",
  dueSoon: "ใกล้ถึงกำหนด (3 วัน)", byStatus: "แยกตามสถานะ", byCategory: "แยกตามหมวดหมู่",
  dashEmpty: "ยังไม่มีข้อมูล เพิ่มงานแรกของคุณได้เลย",
  profile: "ข้อมูลส่วนตัว", saved: "บันทึกแล้ว", changePw: "เปลี่ยนรหัสผ่าน",
  currentPw: "รหัสผ่านปัจจุบัน", newPw: "รหัสผ่านใหม่", pwChanged: "เปลี่ยนรหัสผ่านเรียบร้อย",
  forgotTitle: "ลืมรหัสผ่าน", forgotDesc: "กรอกอีเมลที่ใช้สมัคร ระบบจะสร้างลิงก์สำหรับตั้งรหัสผ่านใหม่",
  sendLink: "ขอลิงก์รีเซ็ต", sentMsg: "ถ้าอีเมลนี้มีอยู่ในระบบ ลิงก์รีเซ็ตรหัสผ่านถูกสร้างแล้ว",
  demoLink: "โหมดทดลอง: ลิงก์รีเซ็ต (ระบบจริงจะส่งทางอีเมล)", backLogin: "กลับไปหน้าเข้าสู่ระบบ",
  resetTitle: "ตั้งรหัสผ่านใหม่", resetBtn: "ตั้งรหัสผ่าน",
  resetDone: "ตั้งรหัสผ่านใหม่เรียบร้อย กรุณาเข้าสู่ระบบ", noToken: "ลิงก์ไม่ถูกต้องหรือหมดอายุ",
  justNow: "เมื่อสักครู่", show: "แสดง", hide: "ซ่อน",
};
type Key = keyof typeof th;
const en: Record<Key, string> = {
  tagline: "Organize tasks, track status, see what's due soon",
  login: "Log in", register: "Sign up", email: "Email", password: "Password",
  confirmPassword: "Confirm password", name: "Name", forgot: "Forgot password?",
  noAccount: "No account yet?", haveAccount: "Already have an account?",
  connecting: "Connecting to the server — the first request may take up to a minute…",
  pwHint: "At least 8 characters with letters and numbers",
  pwInvalid: "Password must be at least 8 characters with letters and numbers",
  pwMismatch: "Passwords do not match", pwWeak: "Weak", pwFair: "Fair", pwStrong: "Strong",
  navTasks: "My tasks", navDashboard: "Dashboard", navAccount: "Account", logout: "Log out",
  settings: "Settings", language: "Language", theme: "Theme", light: "Light", dark: "Dark",
  addTask: "Add task", searchPh: "Search tasks…", allStatus: "All statuses", allCategories: "All categories",
  categoryLabel: "Category", noCategory: "No category", addCategoryPh: "New category name…",
  addCategory: "Add category", noTasks: "No tasks yet. Click “Add task” to get started.", loading: "Loading…",
  prev: "Previous", next: "Next", page: "Page", edit: "Edit", del: "Delete", view: "View details",
  confirmDelete: "Delete this task?", todo: "To do", doing: "In progress", done: "Done",
  newTask: "New task", editTask: "Edit task", titlePh: "Task title", descPh: "Description (optional)",
  statusLabel: "Status", dueLabel: "Due date", participants: "People involved",
  participantPh: "Type a name and press Enter", add: "Add", cancel: "Cancel", save: "Save",
  details: "Task details", created: "Added", edited: "Edited", due: "Due",
  overdue: "Overdue", noDue: "No due date", noDesc: "No description", close: "Close",
  dashTitle: "Your task overview", total: "Total tasks", completion: "Progress",
  dueSoon: "Due soon (3 days)", byStatus: "By status", byCategory: "By category",
  dashEmpty: "No data yet. Add your first task!",
  profile: "Profile", saved: "Saved", changePw: "Change password",
  currentPw: "Current password", newPw: "New password", pwChanged: "Password changed",
  forgotTitle: "Forgot password", forgotDesc: "Enter your email and we'll create a password reset link.",
  sendLink: "Request reset link", sentMsg: "If this email exists, a reset link has been created.",
  demoLink: "Demo mode: reset link (a real system would email it)", backLogin: "Back to log in",
  resetTitle: "Set a new password", resetBtn: "Set password",
  resetDone: "Password updated. Please log in.", noToken: "This link is invalid or has expired.",
  justNow: "just now", show: "Show", hide: "Hide",
};
const dict = { th, en };

interface Ctx { lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void; t: (k: Key) => string }
const PrefsCtx = createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("lang") as Lang) || "th");
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem("theme") as Theme) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  useEffect(() => { localStorage.setItem("lang", lang); document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return <PrefsCtx.Provider value={{ lang, setLang, theme, setTheme, t: (k) => dict[lang][k] }}>{children}</PrefsCtx.Provider>;
}

export function usePrefs() {
  const c = useContext(PrefsCtx);
  if (!c) throw new Error("usePrefs must be used inside PrefsProvider");
  return c;
}
