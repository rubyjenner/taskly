import { useQuery } from "@tanstack/react-query";
import { api, Dashboard, TaggedItem, TaskPage } from "./api";
import { useNotifPrefs, useSeen, useSeenDue, useSeenNav } from "./notify";

// รวมการแจ้งเตือนทั้งหมด: งานเกินกำหนด / ใกล้ครบกำหนด (ตามที่ผู้ใช้ตั้งไว้) / งานที่ถูกแท็กและยังไม่เคยเปิดดู
export function useAlerts() {
  const [prefs] = useNotifPrefs();
  const seen = useSeen();
  const seenDue = useSeenDue();
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dashboard>("/dashboard"), refetchInterval: 60_000 });
  const tagged = useQuery({ queryKey: ["tagged"], queryFn: () => api<TaggedItem[]>("/tagged"), refetchInterval: 60_000 });

  // งานเกินกำหนด / ใกล้ครบกำหนดทั้งหมด (ไม่จำกัดแค่ 6 งานของ dashboard) ใช้คำนวณจุดแดงในเมนู
  const seenNav = useSeenNav();
  const late = useQuery({ queryKey: ["alerts", "overdue"], queryFn: () => api<TaskPage>("/tasks?overdue=true&limit=100"), refetchInterval: 60_000 });
  const soonQ = useQuery({ queryKey: ["alerts", "soon"], queryFn: () => api<TaskPage>("/tasks?due_soon=true&limit=100"), refetchInterval: 60_000 });
  const navKeys = [
    ...(late.data?.data ?? []).filter((x) => x.overdue).map((x) => `${x.id}o`),
    ...(soonQ.data?.data ?? []).map((x) => `${x.id}s`),
  ];
  const navDot = navKeys.some((k) => !seenNav.includes(k));

  const now = Date.now();
  const focus = prefs.dueSoon ? dash.data?.focus ?? [] : [];
  const overdue = focus.filter((f) => f.overdue && !seenDue.includes(f.id));
  const soon = focus.filter((f) => !f.overdue && f.due_at && new Date(f.due_at).getTime() - now <= prefs.leadHours * 3_600_000 && !seenDue.includes(f.id));
  const newTagged = prefs.tagged ? (tagged.data ?? []).filter((x) => x.status !== "done" && !seen.includes(x.id)) : [];
  return { overdue, soon, newTagged, navKeys, navDot, tagged: tagged.data ?? [], hasAlert: overdue.length + soon.length + newTagged.length > 0 };
}
