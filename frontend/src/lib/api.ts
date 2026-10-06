const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

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
export interface User { id: number; name: string; email: string }
export interface Dashboard {
  total: number; by_status: Record<Status, number>; overdue: number; due_soon: number;
  by_category: { name: string; color: string; count: number }[];
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const getToken = () => localStorage.getItem("token");
export const setToken = (t: string | null) =>
  t ? localStorage.setItem("token", t) : localStorage.removeItem("token");

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) { setToken(null); location.href = "/login"; }
    throw new ApiError(res.status, data.error ?? "เกิดข้อผิดพลาด");
  }
  return data as T;
}
