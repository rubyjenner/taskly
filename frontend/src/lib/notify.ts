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
const SEEN_DUE = "seenDue";
const get = (key: string): number[] => { try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; } };
const mark = (key: string, ids: number[]) => {
  const merged = Array.from(new Set([...get(key), ...ids]));
  localStorage.setItem(key, JSON.stringify(merged.slice(-1000)));
  window.dispatchEvent(new Event("notif-change"));
};
export const getSeen = () => get(SEEN_TAGGED);
export const getSeenDue = () => get(SEEN_DUE);
export const markSeen = (ids: number[]) => mark(SEEN_TAGGED, ids);
export const markSeenDue = (ids: number[]) => mark(SEEN_DUE, ids);
export function useSeen() {
  const [seen, setSeen] = useState<number[]>(getSeen);
  useEffect(() => { const on = () => setSeen(getSeen()); window.addEventListener("notif-change", on); return () => window.removeEventListener("notif-change", on); }, []);
  return seen;
}
export function useSeenDue() {
  const [seen, setSeen] = useState<number[]>(getSeenDue);
  useEffect(() => { const on = () => setSeen(getSeenDue()); window.addEventListener("notif-change", on); return () => window.removeEventListener("notif-change", on); }, []);
  return seen;
}
