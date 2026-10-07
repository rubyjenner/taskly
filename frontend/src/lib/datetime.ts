import type { Lang } from "./prefs";

const loc = (lang: Lang) => (lang === "th" ? "th-TH" : "en-GB");

// API ส่งเวลาเป็น UTC (ลงท้าย Z) → แสดงเป็นเวลาไทย
export const formatDue = (iso: string | null, lang: Lang = "th") =>
  iso ? new Date(iso).toLocaleString(loc(lang), { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) : "-";

// ช่วงเวลาแบบสั้น: "5 นาที" / "3 ชั่วโมง" / "2 วัน" (อย่างน้อย 1 นาที)
function span(sec: number, lang: Lang) {
  const mins = Math.max(1, Math.floor(sec / 60));
  const [n, unit] = mins < 60 ? [mins, "m"] : mins < 1440 ? [Math.floor(mins / 60), "h"] : [Math.floor(mins / 1440), "d"];
  if (lang === "th") return `${n} ${{ m: "นาที", h: "ชั่วโมง", d: "วัน" }[unit]}`;
  const word = { m: "minute", h: "hour", d: "day" }[unit];
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// "เมื่อสักครู่" → "1 นาทีที่แล้ว" → ... → "23 ชั่วโมงที่แล้ว" → "1 วันที่แล้ว" (เกิน 30 วันแสดงเป็นวันที่)
export function timeAgo(iso: string, lang: Lang, now = Date.now()) {
  const diff = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diff < 60) return lang === "th" ? "เมื่อสักครู่" : "just now";
  if (diff >= 30 * 86400) return new Date(iso).toLocaleDateString(loc(lang), { dateStyle: "medium" });
  return lang === "th" ? `${span(diff, lang)}ที่แล้ว` : `${span(diff, lang)} ago`;
}

// เวลาที่เหลือ/เกินกำหนด: "อีก 5 ชั่วโมง" / "เกินกำหนด 2 วัน"
export function dueRel(iso: string, lang: Lang, now = Date.now()) {
  const diff = Math.floor((new Date(iso).getTime() - now) / 1000);
  const s = span(Math.abs(diff), lang);
  if (diff < 0) return lang === "th" ? `เกินกำหนด ${s}` : `${s} overdue`;
  return lang === "th" ? `อีก ${s}` : `in ${s}`;
}

export const toApiDate = (local: string) => (local ? new Date(local).toISOString() : null);

export const toInputValue = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
