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
  addTask: "เพิ่มงาน", searchPh: "ค้นหางาน…", allStatus: "สถานะ", allCategories: "หมวดหมู่",
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
  hello: "สวัสดี", tasksCount: "งานทั้งหมด", phone: "เบอร์โทร", position: "ตำแหน่ง / บทบาท", bio: "แนะนำตัวสั้น ๆ",
  contactInfo: "ข้อมูลติดต่อ", contactHint: "ใส่เฉพาะข้อมูลติดต่อทั่วไป ไม่ต้องใส่ข้อมูลอ่อนไหว เช่น เลขบัตรประชาชน", emailLogin: "อีเมล (ใช้เข้าสู่ระบบ)",
  dueToday: "วันนี้", dueTomorrow: "พรุ่งนี้", dueNextWeek: "สัปดาห์หน้า", clear: "ล้าง", dateLabel: "วันที่", timeLabel: "เวลา", timePickerTitle: "เลือกเวลา", timePickerDone: "ตกลง",
  noDueSet: "ยังไม่ได้กำหนดเวลา", peopleHint: "เลือกผู้ใช้ในระบบ หรือพิมพ์ชื่อแล้วกด Enter เพื่อเพิ่มชื่ออิสระ",
  peopleSearchPh: "ค้นหาผู้ใช้ หรือพิมพ์ชื่อ…", inSystem: "ผู้ใช้ในระบบ", freeName: "ชื่ออิสระ", noMatch: "ไม่พบผู้ใช้ — กด Enter เพื่อเพิ่มเป็นชื่ออิสระ",
  doneWeek: "เสร็จใน 7 วัน", trend: "7 วันที่ผ่านมา", createdLegend: "งานใหม่", doneLegend: "งานที่เสร็จ",
  focus: "งานที่ควรโฟกัส", focusEmpty: "ไม่มีงานที่ค้างพร้อมกำหนดเวลา เยี่ยมมาก!", tagged: "งานที่ถูกแท็กถึงฉัน", taggedHint: "งานของคนอื่นที่ระบุว่าคุณเกี่ยวข้อง",
  taggedEmpty: "ยังไม่มีใครแท็กคุณ", owner: "เจ้าของงาน", viewAll: "ดูงานทั้งหมด",

  navTagged: "งานที่ถูกแท็กถึงฉัน", notifications: "การแจ้งเตือน", notifEmpty: "ไม่มีการแจ้งเตือนใหม่",
  notifDueSoon: "ใกล้ครบกำหนด", notifOverdue: "เกินกำหนดแล้ว", notifTagged: "ถูกแท็กในงาน", profileMenu: "โปรไฟล์ของฉัน",
  setAccount: "บัญชีของฉัน", setSecurity: "รหัสผ่านและความปลอดภัย", setNotif: "การแจ้งเตือน", setAppearance: "การแสดงผล",
  accountInfo: "ข้อมูลบัญชี", changePhoto: "เปลี่ยนรูป", removePhoto: "ลบรูป",
  photoTooBig: "ไฟล์รูปต้องไม่เกิน 5 MB", photoInvalid: "เลือกไฟล์รูปภาพเท่านั้น", selectRole: "เลือกตำแหน่ง",
  notifDueToggle: "เตือนเมื่องานใกล้ครบกำหนด", notifLead: "เตือนล่วงหน้า", notifTaggedToggle: "แจ้งเตือนเมื่อถูกแท็กในงาน",
  lead3h: "3 ชั่วโมง", lead6h: "6 ชั่วโมง", lead24h: "24 ชั่วโมง", lead72h: "3 วัน",
  bannerSoon: "งานใกล้ครบกำหนด", bannerOverdue: "งานเกินกำหนด", reviewNow: "ดูเลย", clearFilter: "ล้างตัวกรอง",
  allPositions: "ทุกตำแหน่ง", callNow: "โทร", sendEmail: "ส่งอีเมล", noContact: "ยังไม่ได้ระบุ", taggedTask: "งานที่แท็ก", newBadge: "ใหม่",
  taggedPageHint: "รายชื่อคนที่แท็กคุณในงาน คลิกแต่ละคนเพื่อดูโปรไฟล์และช่องทางติดต่อ",
  searchPeople: "ค้นหาคนที่แท็กคุณ…", taggedTaskCount: "งานที่แท็กคุณ", social: "ช่องทางติดต่อโซเชียล", deleteAccount: "ลบบัญชี", deleteAccountHint: "การลบบัญชีจะลบงานและข้อมูลที่เกี่ยวข้องของบัญชีนี้อย่างถาวร", deleteAccountConfirm: "ยืนยันการลบบัญชี? การดำเนินการนี้ไม่สามารถย้อนกลับได้",
  errNetwork: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง", errLogin: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  errEmailTaken: "อีเมลนี้ถูกใช้สมัครแล้ว", errRate: "ลองหลายครั้งเกินไป กรุณารอ 15 นาที",
  errCurrentPw: "รหัสผ่านปัจจุบันไม่ถูกต้อง", errSamePw: "รหัสผ่านใหม่ต้องไม่ซ้ำรหัสเดิม", errPwWeak: "รหัสผ่านนี้เดาง่ายเกินไป",
  errCategoryDup: "มีหมวดหมู่ชื่อนี้อยู่แล้ว", errNotFound: "ไม่พบข้อมูลนี้", errSession: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
  errPhone: "เบอร์โทรใส่ได้เฉพาะตัวเลขและ + - ( )", errGeneric: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
  lpStart: "เริ่มใช้งานฟรี", lpHeadline: "งานเยอะแค่ไหน ก็ไม่หลุดกำหนด",
  lpSub: "Taskly จัดงานเป็นหมวด ตั้งเวลาส่ง แท็กคนที่เกี่ยวข้อง และเตือนก่อนถึงกำหนด ให้คุณเห็นทุกอย่างในที่เดียว",
  lpMockSoon: "ใกล้ครบกำหนด", lpF1T: "เตือนก่อนถึงกำหนด",
  lpF1D: "กระดิ่งเตือนงานที่ใกล้ครบกำหนดและงานที่เลยกำหนดแล้ว เลือกได้ว่าจะให้เตือนล่วงหน้ากี่ชั่วโมง",
  lpF2T: "แท็กคนที่เกี่ยวข้อง", lpF2D: "เลือกเพื่อนร่วมทีมจากในระบบ คนที่ถูกแท็กจะเห็นงานนั้นพร้อมช่องทางติดต่อของคุณ",
  lpF3T: "เห็นภาพรวมในหน้าเดียว", lpF3D: "ดูสัดส่วนงานตามสถานะและหมวดหมู่ แนวโน้ม 7 วัน และงานที่ควรโฟกัส กดที่ตัวเลขเพื่อไปดูรายการงานได้เลย",
  lpCtaT: "พร้อมจัดงานของคุณแล้วหรือยัง", lpCtaD: "สมัครได้ในไม่กี่วินาที หรือลองดูก่อนด้วยบัญชีทดลอง", lpFoot: "สร้างด้วย Go, React และ PostgreSQL",
};
export type Key = keyof typeof th;
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
  addTask: "Add task", searchPh: "Search tasks…", allStatus: "Status", allCategories: "Category",
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
  hello: "Hello", tasksCount: "Total tasks", phone: "Phone", position: "Position / role", bio: "Short bio",
  contactInfo: "Contact info", contactHint: "General contact details only — please don't enter sensitive data such as ID numbers.", emailLogin: "Email (used to log in)",
  dueToday: "Today", dueTomorrow: "Tomorrow", dueNextWeek: "Next week", clear: "Clear", dateLabel: "Date", timeLabel: "Time", timePickerTitle: "Select time", timePickerDone: "Done",
  noDueSet: "No due date set", peopleHint: "Pick a user, or type a name and press Enter to add a free-text name",
  peopleSearchPh: "Search users or type a name…", inSystem: "User", freeName: "Free name", noMatch: "No user found — press Enter to add as a free-text name",
  doneWeek: "Done in 7 days", trend: "Last 7 days", createdLegend: "New tasks", doneLegend: "Completed",
  focus: "Focus now", focusEmpty: "Nothing pending with a due date. Nice!", tagged: "Tagged to me", taggedHint: "Other people's tasks that involve you",
  taggedEmpty: "Nobody has tagged you yet", owner: "Owner", viewAll: "View all tasks",

  navTagged: "Tasks tagged to me", notifications: "Notifications", notifEmpty: "You're all caught up",
  notifDueSoon: "Due soon", notifOverdue: "Overdue", notifTagged: "Tagged in tasks", profileMenu: "My profile",
  setAccount: "My account", setSecurity: "Password & security", setNotif: "Notifications", setAppearance: "Appearance",
  accountInfo: "Account info", changePhoto: "Change photo", removePhoto: "Remove photo",
  photoTooBig: "Photo must be under 5 MB", photoInvalid: "Please choose an image file", selectRole: "Select a role",
  notifDueToggle: "Remind me when a task is due soon", notifLead: "Remind me ahead by", notifTaggedToggle: "Notify me when I'm tagged in a task",
  lead3h: "3 hours", lead6h: "6 hours", lead24h: "24 hours", lead72h: "3 days",
  bannerSoon: "tasks due soon", bannerOverdue: "overdue tasks", reviewNow: "Review", clearFilter: "Clear filters",
  allPositions: "All roles", callNow: "Call", sendEmail: "Email", noContact: "Not provided", taggedTask: "Tagged task", newBadge: "New",
  taggedPageHint: "People who tagged you in tasks. Click a person to see their profile and contact details.",
  searchPeople: "Search people who tagged you…", taggedTaskCount: "tasks tagged to you", social: "Social / contact link", deleteAccount: "Delete account", deleteAccountHint: "Deleting your account permanently removes its tasks and related data.", deleteAccountConfirm: "Delete this account? This action cannot be undone.",
  errNetwork: "Can't reach the server. Please try again.", errLogin: "Incorrect email or password",
  errEmailTaken: "This email is already registered", errRate: "Too many attempts. Please wait 15 minutes.",
  errCurrentPw: "Current password is incorrect", errSamePw: "New password must differ from the current one", errPwWeak: "That password is too easy to guess",
  errCategoryDup: "A category with this name already exists", errNotFound: "Not found", errSession: "Session expired. Please log in again.",
  errPhone: "Phone may contain digits and + - ( ) only", errGeneric: "Something went wrong. Please try again.",
  lpStart: "Get started free", lpHeadline: "However much is on your plate, nothing slips past its deadline",
  lpSub: "Taskly sorts work into categories, sets deadlines, tags the people involved and warns you before time runs out, all in one place.",
  lpMockSoon: "Due soon", lpF1T: "Reminders before the deadline",
  lpF1D: "The bell flags tasks that are due soon or already late. Choose how many hours ahead you want to be reminded.",
  lpF2T: "Tag the people involved", lpF2D: "Pick teammates from the system. Anyone you tag sees the task along with your contact details.",
  lpF3T: "The big picture on one page", lpF3D: "See work by status and category, a 7-day trend and what to focus on. Click any number to jump to those tasks.",
  lpCtaT: "Ready to get your work in order?", lpCtaD: "Sign up in seconds, or look around first with the demo account.", lpFoot: "Built with Go, React and PostgreSQL",
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

export function localizedName(name: string, lang: Lang) {
  if (lang === "en" && name === "ผู้ใช้ทดลอง") return "Demo User";
  if (lang === "th" && name === "Demo User") return "ผู้ใช้ทดลอง";
  return name;
}

export function usePrefs() {
  const c = useContext(PrefsCtx);
  if (!c) throw new Error("usePrefs must be used inside PrefsProvider");
  return c;
}
