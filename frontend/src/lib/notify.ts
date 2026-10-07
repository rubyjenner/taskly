import { useEffect, useState } from "react";

export interface NotifPrefs { dueSoon: boolean; leadHours: number; tagged: boolean }
const KEY = "notifPrefs";
const DEFAULTS: NotifPrefs = { dueSoon: true, leadHours: 24, tagged: true };
const read = (): NotifPrefs => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return DEFAULTS; }
};
export function useNotifPrefs() {
  const [prefs, setPrefs] = useState<NotifPrefs>(read);
  useEffect(() => { const on = () => setPrefs(read()); window.addEventListener("notif-change", on); return () => window.removeEventListener("notif-change", on); }, []);
  const update = (patch: Partial<NotifPrefs>) => { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch })); window.dispatchEvent(new Event("notif-change")); };
  return [prefs, update] as const;
}

const SEEN_TAGGED = "seenTagged";
const SEEN_DUE_TS = "seenDueAt";
const get = (key: string): number[] => { try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; } };
const mark = (key: string, ids: number[]) => {
  const merged = Array.from(new Set([...get(key), ...ids]));
  localStorage.setItem(key, JSON.stringify(merged.slice(-1000)));
  window.dispatchEvent(new Event("notif-change"));
};
export const getSeen = () => get(SEEN_TAGGED);
// เตือนเรื่องกำหนดส่ง: ปิดแล้วจะเงียบ 6 ชั่วโมง ถ้างานยังค้างอยู่จะเตือนซ้ำ (กันลืมงานที่เกินกำหนด)
const DUE_QUIET_MS = 6 * 3_600_000;
const readDue = (): Record<string, number> => { try { const v = JSON.parse(localStorage.getItem(SEEN_DUE_TS) ?? "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { return {}; } };
export const getSeenDue = (): number[] => {
  const now = Date.now();
  return Object.entries(readDue()).filter(([, ts]) => now - ts < DUE_QUIET_MS).map(([id]) => Number(id));
};
export const markSeen = (ids: number[]) => mark(SEEN_TAGGED, ids);
export const markSeenDue = (ids: number[]) => {
  const now = Date.now();
  const cur = Object.fromEntries(Object.entries(readDue()).filter(([, ts]) => now - ts < DUE_QUIET_MS));
  for (const id of ids) cur[String(id)] = now;
  localStorage.setItem(SEEN_DUE_TS, JSON.stringify(cur));
  window.dispatchEvent(new Event("notif-change"));
};
export function useSeen() {
  const [seen, setSeen] = useState<number[]>(getSeen);
  useEffect(() => { const on = () => setSeen(getSeen()); window.addEventListener("notif-change", on); return () => window.removeEventListener("notif-change", on); }, []);
  return seen;
}
export function useSeenDue() {
  const [seen, setSeen] = useState<number[]>(getSeenDue);
  useEffect(() => {
    const on = () => setSeen(getSeenDue());
    const tick = setInterval(on, 60_000); // ให้ช่วงเงียบหมดอายุแล้วเตือนซ้ำเอง
    window.addEventListener("notif-change", on);
    return () => { window.removeEventListener("notif-change", on); clearInterval(tick); };
  }, []);
  return seen;
}

// จุดแดงข้างเมนู "เกินกำหนด": key = "<id>o" (เกินกำหนด) หรือ "<id>s" (ใกล้ครบกำหนด)
// เปิดหน้าเกินกำหนดแล้วถือว่าเห็นแล้ว จุดจะหาย และกลับมาเมื่อมีงานใหม่เข้าเงื่อนไข (หรืองานเดิมเปลี่ยนจากใกล้ครบ → เกินกำหนด)
const SEEN_NAV = "seenNavDue";
const readNav = (): string[] => { try { const v = JSON.parse(localStorage.getItem(SEEN_NAV) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
export const markNavSeen = (keys: string[]) => {
  localStorage.setItem(SEEN_NAV, JSON.stringify(Array.from(new Set([...readNav(), ...keys])).slice(-1000)));
  window.dispatchEvent(new Event("notif-change"));
};
export function useSeenNav() {
  const [seen, setSeen] = useState<string[]>(readNav);
  useEffect(() => { const on = () => setSeen(readNav()); window.addEventListener("notif-change", on); return () => window.removeEventListener("notif-change", on); }, []);
  return seen;
}
