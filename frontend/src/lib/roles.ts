import type { Lang } from "./prefs";

// ตำแหน่ง/บทบาทที่ให้เลือก (เก็บค่าเป็นชื่ออังกฤษ แสดงตามภาษาที่เลือก) ค่าอื่นที่ผู้ใช้เคยพิมพ์เองก็ยังแสดงได้
export const ROLES: { value: string; th: string; en: string }[] = [
  { value: "Product Owner", th: "Product Owner", en: "Product Owner" },
  { value: "Project Manager", th: "ผู้จัดการโครงการ", en: "Project Manager" },
  { value: "Backend Developer", th: "นักพัฒนา Backend", en: "Backend Developer" },
  { value: "Frontend Developer", th: "นักพัฒนา Frontend", en: "Frontend Developer" },
  { value: "Full Stack Developer", th: "นักพัฒนา Full Stack", en: "Full Stack Developer" },
  { value: "UI/UX Designer", th: "นักออกแบบ UI/UX", en: "UI/UX Designer" },
  { value: "QA Engineer", th: "ผู้ทดสอบระบบ (QA)", en: "QA Engineer" },
  { value: "Data Analyst", th: "นักวิเคราะห์ข้อมูล", en: "Data Analyst" },
  { value: "Student / Intern", th: "นักศึกษา / ฝึกงาน", en: "Student / Intern" },
  { value: "Other", th: "อื่น ๆ", en: "Other" },
];
export const roleLabel = (value: string, lang: Lang) => ROLES.find((r) => r.value === value)?.[lang] ?? value;
