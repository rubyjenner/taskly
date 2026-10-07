const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

// ปลุกเซิร์ฟเวอร์ (Render free tier หลับเมื่อไม่มีคนใช้) ตั้งแต่เปิดหน้า login ระหว่างที่ผู้ใช้กำลังกรอกข้อมูล
export const warmUp = () => { fetch(`${API}/health`).catch(() => {}); };

export type Status = "todo" | "doing" | "done";
export interface Participant { user_id?: number; name: string }
export interface Task {
  id: number; title: string; description: string; status: Status;
  category_id: number | null; category_name: string | null; category_color: string | null;
  due_at: string | null; overdue: boolean; created_at: string; updated_at: string;
  participants: Participant[];
}
export interface Category { id: number; name: string; color: string }
export interface TaskPage { data: Task[]; total: number; page: number; limit: number }

export const STATUSES: Status[] = ["todo", "doing", "done"];
export interface User { id: number; name: string; email: string; phone: string; position: string; bio: string; avatar: string; social: string }
export interface Owner { id: number; name: string; email: string; phone: string; position: string; bio: string; avatar: string; social: string }
export interface TaggedItem {
  id: number; title: string; description: string; status: Status; due_at: string | null;
  overdue: boolean; created_at: string; owner: Owner;
}
export interface UserHit { id: number; name: string }
export interface Dashboard {
  total: number; by_status: Record<Status, number>; overdue: number; due_soon: number;
  by_category: { id: number | null; name: string; color: string; count: number }[];
  completed_week: number;
  trend: { date: string; end?: string; created: number; completed: number }[];
  range_start?: string;
  range_end?: string;
  trend_period: "week" | "month" | "year";
  trend_anchor: string;
  focus: { id: number; title: string; status: Status; due_at: string | null; overdue: boolean; category_name: string | null; category_color: string | null }[];
  tagged: { id: number; title: string; status: Status; due_at: string | null; overdue: boolean; owner: string }[];
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const getToken = () => localStorage.getItem("token");
export const setToken = (t: string | null) =>
  t ? localStorage.setItem("token", t) : localStorage.removeItem("token");

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API}/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "network"); // เชื่อมต่อไม่ได้ (เซิร์ฟเวอร์หลับ/ออฟไลน์/CORS)
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) { setToken(null); location.href = "/login"; }
    throw new ApiError(res.status, data.error ?? "error");
  }
  return data as T;
}
