import type { Lang } from "./prefs";

const loc = (lang: Lang) => (lang === "th" ? "th-TH" : "en-GB");

// API ส่งเวลาเป็น UTC (ลงท้าย Z) → แสดงเป็นเวลาไทย
export const formatDue = (iso: string | null, lang: Lang = "th") =>
  iso ? new Date(iso).toLocaleString(loc(lang), { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) : "-";

// "1 นาทีที่แล้ว" → ... → "23 ชั่วโมงที่แล้ว" → "1 วันที่แล้ว" (เกิน 30 วันแสดงเป็นวันที่)
export function timeAgo(iso: string, lang: Lang, now = Date.now()) {
  const diff = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diff < 60) return lang === "th" ? "เมื่อสักครู่" : "just now";
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "always" });
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), "hour");
  const days = Math.floor(diff / 86400);
  if (days < 30) return rtf.format(-days, "day");
  return new Date(iso).toLocaleDateString(loc(lang), { dateStyle: "medium" });
}

export const toApiDate = (local: string) => (local ? new Date(local).toISOString() : null);

export const toInputValue = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
