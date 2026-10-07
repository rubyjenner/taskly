import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, ListChecks, Users } from "lucide-react";
import { api, Dashboard as Data, STATUSES } from "../lib/api";
import { usePrefs } from "../lib/prefs";
import { dueRel } from "../lib/datetime";
import { errText } from "../lib/errors";

// วันนี้ตามเวลาไทย (YYYY-MM-DD) ไม่ขึ้นกับ timezone ของเครื่อง
const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
const parseDay = (s: string) => new Date(`${s}T12:00:00`);

const COLOR: Record<string, string> = { todo: "#94a3b8", doing: "#f59e0b", done: "#10b981" };

function Stat({ icon, label, value, tone, to, alert }: { icon: React.ReactNode; label: string; value: number | string; tone: string; to?: string; alert?: boolean }) {
  const cls = "card block p-4 transition hover:-translate-y-0.5 hover:shadow-md";
  const body = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${tone} 15%, transparent)`, color: tone }}>{icon}</span>
      <p className={`mt-3 text-3xl font-bold ${alert ? "text-red-500" : ""}`}>{value}</p>
      <p className="muted text-sm">{label}</p>
    </>
  );
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Bar({ label, value, max, color, to }: { label: string; value: number; max: number; color: string; to?: string }) {
  const body = (
    <>
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="muted">{value}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--soft)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }} />
      </div>
    </>
  );
  return to ? <Link to={to} className="-mx-2 block rounded-lg px-2 py-1 hover:bg-[var(--soft)]">{body}</Link> : <div>{body}</div>;
}

// โดนัทสถานะด้วย conic-gradient (ไม่ต้องใช้ไลบรารีกราฟ)
function Donut({ values, total, pct }: { values: number[]; total: number; pct: number }) {
  let acc = 0;
  const stops = values.map((v, i) => {
    const from = (acc / total) * 100; acc += v;
    return `${COLOR[STATUSES[i]]} ${from}% ${(acc / total) * 100}%`;
  }).join(", ");
  return (
    <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }}>
      <div className="absolute inset-3.5 flex flex-col items-center justify-center rounded-full" style={{ background: "var(--card)" }}>
        <span className="text-2xl font-bold">{pct}%</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t, lang } = usePrefs();
  const [selectedStatus, setSelectedStatus] = useState<"todo" | "doing" | "done" | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");
  const [anchor, setAnchor] = useState(todayStr);
  const q = useQuery({
    queryKey: ["dashboard", period, anchor],
    queryFn: () => api<Data>(`/dashboard?period=${period}&anchor=${anchor}`),
  });
  if (q.isLoading) return <p className="muted py-10 text-center">{t("loading")}</p>;
  if (q.isError) return <p className="py-10 text-center text-red-500">{errText(q.error, t)}</p>;
  const d = q.data!;
  if (d.total === 0 && d.tagged.length === 0) return <p className="muted py-10 text-center">{t("dashEmpty")}</p>;
  const overallPct = d.total ? Math.round((d.by_status.done / d.total) * 100) : 0;
  const centerPct = selectedStatus ? Math.round((d.by_status[selectedStatus] / Math.max(d.total, 1)) * 100) : overallPct;
  const maxCat = Math.max(...d.by_category.map((c) => c.count), 1);
  const maxTrend = Math.max(...d.trend.flatMap((x) => [x.created, x.completed]), 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const toAnchor = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const anchorDate = parseDay(anchor);
  const movePeriod = (direction: -1 | 1) => {
    const next = new Date(anchorDate);
    if (period === "week") next.setDate(next.getDate() + direction * 7);
    else {
      next.setDate(1); // กันวันล้นเดือน เช่น 31 ต.ค. + 1 เดือน กลายเป็น 1 ธ.ค.
      if (period === "month") next.setMonth(next.getMonth() + direction);
      else next.setFullYear(next.getFullYear() + direction);
    }
    setAnchor(toAnchor(next));
  };
  const goToday = () => setAnchor(todayStr());

  // th-TH = พ.ศ. (เช่น 2569), en-US = ค.ศ. (เช่น 2026)
  const dateLocale = lang === "th" ? "th-TH" : "en-US";
  const fmtFull = (date: Date) => date.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });
  const fmtYear = (date: Date) => date.toLocaleDateString(dateLocale, { year: "numeric" });
  const fmtMonth = (date: Date) => date.toLocaleDateString(dateLocale, { month: "long", year: "numeric" });

  // ช่วงที่แสดง ใช้ค่าจาก backend โดยตรง จะได้ตรงกับแท่งกราฟเสมอ
  const first = d.trend[0], last = d.trend[d.trend.length - 1];
  const rangeStart = parseDay(d.range_start ?? first?.date ?? anchor);
  const rangeEnd = parseDay(d.range_end ?? last?.end ?? last?.date ?? anchor);

  // ปี: แสดงแค่ "ปี พ.ศ. 2569" ไม่มีช่วงปีต่อท้าย (แท่งกราฟเป็น ม.ค.–ธ.ค. ของปีนั้น)
  const periodHeading = period === "week" ? (lang === "th" ? "สัปดาห์" : "Week")
    : period === "month" ? (lang === "th" ? "เดือน" : "Month")
    : lang === "th" ? `ปี พ.ศ. ${fmtYear(anchorDate)}` : `Year ${fmtYear(anchorDate)}`;
  const periodSub = period === "month" ? fmtMonth(anchorDate)
    : period === "year" ? ""
    : `${fmtFull(rangeStart)} – ${fmtFull(rangeEnd)}`;

  // ป้ายใต้แท่ง: [บรรทัดหลัก, บรรทัดรอง]
  const barLabel = (x: Data["trend"][number], i: number): [string, string] => {
    const s = parseDay(x.date);
    if (period === "year") return [s.toLocaleDateString(dateLocale, { month: "short" }), ""];
    if (period === "month") {
      const e = parseDay(x.end ?? x.date);
      return [lang === "th" ? `สัปดาห์ ${i + 1}` : `Week ${i + 1}`, s.getTime() === e.getTime() ? `${s.getDate()}` : `${s.getDate()}–${e.getDate()}`];
    }
    return [s.toLocaleDateString(dateLocale, { weekday: "short" }), String(s.getDate())];
  };
  const barTip = (x: Data["trend"][number]) => {
    const s = parseDay(x.date), e = parseDay(x.end ?? x.date);
    if (period === "year") return s.toLocaleDateString(dateLocale, { month: "long", year: "numeric" });
    return s.getTime() === e.getTime() ? fmtFull(s) : `${fmtFull(s)} – ${fmtFull(e)}`;
  };

  // แท่งที่ครอบคลุมวันนี้ (ไฮไลต์) / ปุ่มถัดไปปิดเมื่ออยู่ช่วงปัจจุบันแล้ว (อนาคตยังไม่มีข้อมูล)
  const today = todayStr();
  const isNow = (x: Data["trend"][number]) => x.date <= today && today <= (x.end ?? x.date);
  const atPresent = (d.range_end ?? last?.end ?? last?.date ?? anchor) >= today;

  // แกน Y: ปัดเพดานเป็นเลขคู่ (อย่างน้อย 4) เพื่อให้เส้นกริด 0 / กลาง / บน เป็นจำนวนเต็มเสมอ
  const niceTop = Math.max(4, Math.ceil(maxTrend / 2) * 2);
  const sumCreated = d.trend.reduce((n, x) => n + x.created, 0);
  const sumDone = d.trend.reduce((n, x) => n + x.completed, 0);
  const tipPos = (i: number) => (i < 2 ? "left-0" : i >= d.trend.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2");
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">{t("dashTitle")}</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<ListChecks size={18} />} label={t("total")} value={d.total} tone="#6366f1" />
        <Stat icon={<CheckCircle2 size={18} />} label={t("doneWeek")} value={d.completed_week} tone="#10b981" />
        <Stat icon={<Clock size={18} />} label={t("dueSoon")} value={d.due_soon} tone="#f59e0b" />
        <Stat icon={<AlertTriangle size={18} />} label={t("overdue")} value={d.overdue} tone="#ef4444" to="/tasks?overdue=1" alert={d.overdue > 0} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold">{t("myStatus")}</h2>
          <div className="flex items-center gap-5">
            <Donut values={STATUSES.map((s) => d.by_status[s])} total={Math.max(d.total, 1)} pct={centerPct} />
            <ul className="flex-1 space-y-2 text-sm">
              {STATUSES.map((s) => {
                const value = d.by_status[s];
                const selected = selectedStatus === s;
                return <li key={s}>
                  <button type="button" onClick={() => setSelectedStatus(selected ? null : s)} className={`-mx-2 flex w-[calc(100%+1rem)] items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-[var(--soft)] ${selected ? "bg-[var(--soft)]" : ""}`}>
                    <span className="flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR[s] }} />{t(s)}</span>
                    <span className="text-right"><b>{value}</b></span>
                  </button>
                  
                </li>;
              })}
            </ul>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{periodHeading}</h2>
              {periodSub && <p className="muted mt-1 text-xs">{periodSub}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn !h-8 !w-8 !p-0" onClick={() => movePeriod(-1)} aria-label={t("prev")} title={t("prev")}>
                <ChevronLeft size={16} />
              </button>
              <button type="button" className="btn !h-8 !px-3 text-xs" onClick={goToday} disabled={atPresent && anchor === today}>
                {lang === "th" ? "วันนี้" : "Today"}
              </button>
              <button type="button" className="btn !h-8 !w-8 !p-0" onClick={() => movePeriod(1)} disabled={atPresent} aria-label={t("next")} title={t("next")}>
                <ChevronRight size={16} />
              </button>
              <select className="input !h-8 !w-auto !py-1 text-xs" aria-label={periodHeading} value={period} onChange={(e) => setPeriod(e.target.value as "week" | "month" | "year")}>
                <option value="week">{lang === "th" ? "สัปดาห์" : "Week"}</option>
                <option value="month">{lang === "th" ? "เดือน" : "Month"}</option>
                <option value="year">{lang === "th" ? "ปี" : "Year"}</option>
              </select>
            </div>
          </div>

          {/* สรุปของช่วงที่เลือก + คำอธิบายสี: แท่งกว้างจาง = งานใหม่, แท่งแคบเข้ม = งานที่เสร็จ */}
          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span className="flex items-center gap-2">
              <i className="inline-block h-3 w-3.5 rounded-sm border" style={{ background: "color-mix(in srgb, #818cf8 25%, transparent)", borderColor: "#818cf8" }} />
              <span className="muted">{t("createdLegend")}</span><b>{sumCreated}</b>
            </span>
            <span className="flex items-center gap-2">
              <i className="inline-block h-3 w-1.5 rounded-sm" style={{ background: "#10b981" }} />
              <span className="muted">{t("doneLegend")}</span><b>{sumDone}</b>
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative h-40 w-5 shrink-0 text-right text-[10px] muted" aria-hidden="true">
              {[niceTop, niceTop / 2, 0].map((v) => <span key={v} className="absolute right-0 -translate-y-1/2 leading-none" style={{ bottom: `${(v / niceTop) * 100}%` }}>{v}</span>)}
            </div>
            <div className="relative h-40 min-w-0 flex-1">
              {[0, 0.5, 1].map((f) => <i key={f} className="pointer-events-none absolute inset-x-0 border-t" style={{ bottom: `${f * 100}%`, borderColor: "var(--border)", borderStyle: f === 0 ? "solid" : "dashed" }} />)}
              <div className={`absolute inset-0 flex items-stretch ${d.trend.length > 8 ? "gap-0.5 sm:gap-1.5" : "gap-2 sm:gap-3"}`}>
                {d.trend.map((x, i) => {
                  const createdPct = d.total ? Math.round((x.created / d.total) * 100) : 0;
                  const completedPct = d.total ? Math.round((x.completed / d.total) * 100) : 0;
                  const now = isNow(x);
                  return (
                    <div key={x.date} tabIndex={0} role="img" aria-label={`${barTip(x)}: ${x.created} ${t("createdLegend")}, ${x.completed} ${t("doneLegend")}`}
                      className="group relative flex min-w-0 flex-1 items-end justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      style={now ? { background: "var(--soft)" } : undefined}>
                      <div className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] shadow-md group-hover:block group-focus-visible:block ${tipPos(i)}`} style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                        <p className="mb-0.5 font-semibold">{barTip(x)}</p>
                        <p><span style={{ color: "#818cf8" }}>●</span> {t("createdLegend")} {x.created} ({createdPct}%)</p>
                        <p><span style={{ color: "#10b981" }}>●</span> {t("doneLegend")} {x.completed} ({completedPct}%)</p>
                      </div>
                      <div className="relative h-full w-[72%] max-w-[40px]">
                        {x.created > 0 && <div className="absolute bottom-0 w-full rounded-t-md border border-b-0" style={{ height: `${(x.created / niceTop) * 100}%`, minHeight: 4, background: "color-mix(in srgb, #818cf8 25%, transparent)", borderColor: "#818cf8" }} />}
                        {x.completed > 0 && <div className="absolute bottom-0 left-1/2 w-[46%] -translate-x-1/2 rounded-t" style={{ height: `${(x.completed / niceTop) * 100}%`, minHeight: 4, background: "#10b981" }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
              {sumCreated + sumDone === 0 && <p className="muted pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs">{t("chartEmpty")}</p>}
            </div>
          </div>

          <div className={`mt-1.5 flex pl-7 ${d.trend.length > 8 ? "gap-0.5 sm:gap-1.5" : "gap-2 sm:gap-3"}`}>
            {d.trend.map((x, i) => {
              const [main, sub] = barLabel(x, i);
              const now = isNow(x);
              return (
                <div key={x.date} className="min-w-0 flex-1 text-center">
                  <p className={`truncate text-[11px] leading-tight ${now ? "font-semibold" : "muted"}`} style={now ? { color: "var(--primary)" } : undefined}>{main}</p>
                  {sub && <p className={`text-[11px] leading-none ${now ? "font-semibold" : "muted"}`} style={now ? { color: "var(--primary)" } : undefined}>{sub}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">{t("focus")}</h2>
          {d.focus.length === 0 ? <p className="muted text-sm">{t("focusEmpty")}</p> : (
            <ul className="space-y-2.5">
              {d.focus.map((f) => (
                <li key={f.id}>
                  <Link to={`/tasks?open=${f.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1 text-sm hover:bg-[var(--soft)]">
                    <i className="h-8 w-1 shrink-0 rounded-full" style={{ background: f.overdue ? "#ef4444" : COLOR[f.status] }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{f.title}</p>
                      <p className={`text-xs ${f.overdue ? "font-medium text-red-500" : "muted"}`}>{f.due_at && dueRel(f.due_at, lang)}</p>
                    </div>
                    {f.category_name && <span className="shrink-0 rounded-full px-2 py-0.5 text-xs text-white" style={{ background: f.category_color ?? "#6366f1" }}>{f.category_name}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/tasks" className="mt-3 inline-block text-sm" style={{ color: "var(--primary)" }}>{t("viewAll")} →</Link>
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Users size={16} />{t("tagged")}</h2>
          <p className="muted mb-3 text-xs">{t("taggedHint")}</p>
          {d.tagged.length === 0 ? <p className="muted text-sm">{t("taggedEmpty")}</p> : (
            <ul className="space-y-2.5">
              {d.tagged.map((x) => (
                <li key={x.id}>
                  <Link to={`/tagged?open=${x.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1 text-sm hover:bg-[var(--soft)]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ background: "var(--soft)", color: "var(--primary)" }}>{Array.from(x.owner)[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{x.title}</p>
                    <p className="muted truncate text-xs">{t("owner")}: {x.owner}{x.due_at && x.status !== "done" ? ` · ${dueRel(x.due_at, lang)}` : ""}</p>
                  </div>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-xs" style={{ background: `color-mix(in srgb, ${COLOR[x.status]} 20%, transparent)`, color: COLOR[x.status] }}>{t(x.status)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/tagged" className="mt-3 inline-block text-sm" style={{ color: "var(--primary)" }}>{t("viewAll")} →</Link>
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">{t("byCategory")}</h2>
        {d.by_category.map((c) => (
          <Bar key={c.name} label={c.name === "Uncategorized" ? t("noCategory") : c.name} value={c.count} max={maxCat} color={c.color} to={c.id ? `/tasks?category_id=${c.id}` : undefined} />
        ))}
      </div>
    </div>
  );
}
