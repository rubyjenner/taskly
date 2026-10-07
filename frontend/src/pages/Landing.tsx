import { Link } from "react-router-dom";
import { CheckCheck, CheckCircle2, ListTodo } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-2xl text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2d3fe3] text-white shadow-lg">
            <CheckCheck size={34} strokeWidth={2.5} />
          </div>

          <p className="text-base font-medium text-slate-500 dark:text-slate-400">
            ยินดีต้อนรับสู่
          </p>
          <h1 className="display mt-2 text-6xl font-bold tracking-tight text-[#2d3fe3] sm:text-7xl">
            Taskly
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 sm:text-xl">
            จัดการงานของคุณให้ง่ายขึ้น
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="rounded-xl bg-[#2d3fe3] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#2535c9] hover:shadow-lg"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              to="/register"
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-8 py-3.5 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:bg-[var(--soft)]"
            >
              สมัครสมาชิก
            </Link>
          </div>

          <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-3 text-left">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <ListTodo className="text-[#2d3fe3]" size={21} />
              <p className="mt-2 text-xs font-semibold">จัดการงาน</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <CheckCircle2 className="text-emerald-500" size={21} />
              <p className="mt-2 text-xs font-semibold">ติดตามสถานะ</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <CheckCheck className="text-amber-500" size={21} />
              <p className="mt-2 text-xs font-semibold">ทำงานให้สำเร็จ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
