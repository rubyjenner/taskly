import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, ListChecks } from "lucide-react";
import { api, Dashboard as Data, STATUSES } from "../lib/api";
import { usePrefs } from "../lib/prefs";

const BAR: Record<string, string> = { todo: "#94a3b8", doing: "#f59e0b", done: "#10b981" };

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone?: string }) {
  return (
    <div className="card p-4">
      <div className="muted flex items-center gap-2 text-sm" style={tone ? { color: tone } : undefined}>{icon}{label}</div>
      <p className="mt-2 text-3xl font-bold" style={tone ? { color: tone } : undefined}>{value}</p>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="muted">{value}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--soft)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = usePrefs();
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => api<Data>("/dashboard") });
  if (q.isLoading) return <p className="muted py-10 text-center">{t("loading")}</p>;
  if (q.isError) return <p className="py-10 text-center text-red-500">{q.error.message}</p>;
  const d = q.data!;
  if (d.total === 0) return <p className="muted py-10 text-center">{t("dashEmpty")}</p>;
  const pct = Math.round((d.by_status.done / d.total) * 100);
  const maxCat = Math.max(...d.by_category.map((c) => c.count), 1);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">{t("dashTitle")}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<ListChecks size={16} />} label={t("total")} value={d.total} />
        <Stat icon={<CheckCircle2 size={16} />} label={t("done")} value={d.by_status.done} tone="#10b981" />
        <Stat icon={<Clock size={16} />} label={t("dueSoon")} value={d.due_soon} tone="#f59e0b" />
        <Stat icon={<AlertTriangle size={16} />} label={t("overdue")} value={d.overdue} tone="#ef4444" />
      </div>

      <div className="card p-5">
        <div className="mb-2 flex justify-between text-sm font-medium"><span>{t("completion")}</span><span>{pct}%</span></div>
        <div className="h-3 overflow-hidden rounded-full" style={{ background: "var(--soft)" }}>
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold">{t("byStatus")}</h2>
          {STATUSES.map((s) => <Bar key={s} label={t(s)} value={d.by_status[s]} max={d.total} color={BAR[s]} />)}
        </div>
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold">{t("byCategory")}</h2>
          {d.by_category.map((c) => (
            <Bar key={c.name} label={c.name === "Uncategorized" ? t("noCategory") : c.name} value={c.count} max={maxCat} color={c.color} />
          ))}
        </div>
      </div>
    </div>
  );
}
