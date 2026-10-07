import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, Moon, Sun } from "lucide-react";
import { usePrefs } from "../lib/prefs";
import { warmUp } from "../lib/api";

const AV = ["#ffb84d", "#ff6b57", "#58c4a7"];

function Stack({ names }: { names: string[] }) {
  return (
    <span className="flex -space-x-2">
      {names.map((n, i) => (
        <span key={n} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-slate-900" style={{ background: AV[i % 3] }}>{n}</span>
      ))}
    </span>
  );
}

export default function Landing() {
  const { t, lang, setLang, theme, setTheme } = usePrefs();
  useEffect(warmUp, []);
  const th = lang === "th";
  const rows = th
    ? [["ส่งรายงานความคืบหน้า", "อีก 2 ชั่วโมง", "#ff6b57", ["ส", "ม"]], ["เตรียมสไลด์นำเสนอ", "พรุ่งนี้ 17:00", "#f5a524", ["ม", "ป", "ส"]]]
    : [["Send weekly progress report", "in 2 hours", "#ff6b57", ["S", "M"]], ["Prepare the demo slides", "tomorrow 17:00", "#f5a524", ["M", "P", "S"]]];

  return (
    <div>
      <section className="lp-hero">
        <div className="mx-auto max-w-5xl px-5">
          <header className="flex items-center justify-between py-5">
            <span className="flex items-center gap-2 text-lg font-bold display">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#2d3fe3]"><CheckCheck size={18} /></span>Taskly
            </span>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex rounded-full border border-white/40 p-0.5">
                {(["th", "en"] as const).map((l) => (
                  <button key={l} onClick={() => setLang(l)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lang === l ? "bg-white text-[#2d3fe3]" : "text-white/80"}`}>{l.toUpperCase()}</button>
                ))}
              </div>
              <button aria-label={t("theme")} className="rounded-full border border-white/40 p-2" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}</button>
              <Link to="/login" className="hidden px-3 py-2 font-medium sm:inline">{t("login")}</Link>
            </div>
          </header>

          <div className="grid items-center gap-10 pb-16 pt-6 md:grid-cols-[1.05fr_1fr] md:pb-24 md:pt-12">
            <div>
              <h1 className="display text-4xl font-bold leading-[1.15] sm:text-5xl lg:text-6xl">{t("lpHeadline")}</h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/85">{t("lpSub")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="lp-btn lp-btn-solid">{t("lpStart")}</Link>
                <Link to="/login" className="lp-btn lp-btn-line">{t("login")}</Link>
              </div>
            </div>

            <div className="relative">
              <div className="lp-rise rounded-[20px] bg-white p-4 text-slate-900 shadow-[0_30px_60px_-20px_rgba(10,20,90,.6)]">
                <ul className="space-y-3">
                  {rows.map(([title, due, color, who], i) => (
                    <li key={String(title)} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                      <i className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: String(color) }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{String(title)}</p>
                        <p className="flex items-center gap-1.5 text-xs" style={{ color: i === 0 ? "#e5483a" : "#64748b" }}>
                          {i === 0 && <span className="lp-ping inline-block h-2 w-2 rounded-full bg-[#ff6b57]" />}
                          {String(due)}
                        </p>
                      </div>
                      <Stack names={who as string[]} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="absolute -right-2 -top-4 flex items-center gap-2 rounded-full bg-[#ffb84d] px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-lg sm:-right-6">
                <span className="relative"><Bell size={14} /><i className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#ff3b30]" /></span>{t("lpMockSoon")} 1
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-20 px-5 py-20">
        <section className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="display text-2xl font-semibold sm:text-3xl">{t("lpF1T")}</h2>
            <p className="muted mt-3 max-w-md leading-relaxed">{t("lpF1D")}</p>
          </div>
          <div className="card space-y-2 p-4 md:ml-8">
            {[["#ef4444", th ? "เกินกำหนด 1 วัน" : "1 day overdue"], ["#f59e0b", th ? "อีก 3 ชั่วโมง" : "in 3 hours"]].map(([c, txt]) => (
              <div key={txt} className="flex items-center gap-3 rounded-xl p-2" style={{ background: "var(--soft)" }}>
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700"><Bell size={16} /><i className="absolute right-1 top-1 h-2 w-2 rounded-full" style={{ background: c }} /></span>
                <span className="text-sm font-medium">{txt}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid items-center gap-8 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <div className="card mx-auto max-w-xs p-5 text-center">
              <div className="flex justify-center"><Stack names={th ? ["ส", "ม", "ป"] : ["S", "M", "P"]} /></div>
              <p className="mt-3 font-semibold">{th ? "สมชาย ใจดี" : "Somchai J."}</p>
              <p className="muted text-sm">{th ? "นักพัฒนา Backend" : "Backend Developer"}</p>
              <p className="mt-2 rounded-lg px-3 py-1.5 text-sm" style={{ background: "var(--soft)" }}>081-234-5678</p>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="display text-2xl font-semibold sm:text-3xl">{t("lpF2T")}</h2>
            <p className="muted mt-3 max-w-md leading-relaxed">{t("lpF2D")}</p>
          </div>
        </section>

        <section className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="display text-2xl font-semibold sm:text-3xl">{t("lpF3T")}</h2>
            <p className="muted mt-3 max-w-md leading-relaxed">{t("lpF3D")}</p>
          </div>
          <div className="card flex items-center gap-6 p-5 md:ml-8">
            <div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background: "conic-gradient(#2fb67c 0 58%, #f5a524 58% 83%, #94a3b8 83% 100%)" }}>
              <div className="absolute inset-3 flex items-center justify-center rounded-full text-lg font-bold" style={{ background: "var(--card)" }}>58%</div>
            </div>
            <div className="flex-1 space-y-2">
              {[["#6366f1", 80], ["#10b981", 55], ["#f59e0b", 35]].map(([c, w]) => (
                <div key={String(c)} className="h-2.5 rounded-full" style={{ background: "var(--soft)" }}><div className="h-full rounded-full" style={{ width: `${w}%`, background: String(c) }} /></div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <section className="lp-hero">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-5 py-14 md:flex-row md:items-center">
          <div>
            <h2 className="display text-2xl font-semibold sm:text-3xl">{t("lpCtaT")}</h2>
            <p className="mt-2 max-w-md text-white/85">{t("lpCtaD")}</p>
          </div>
          <div className="flex gap-3">
            <Link to="/register" className="lp-btn lp-btn-solid">{t("lpStart")}</Link>
            <Link to="/login" className="lp-btn lp-btn-line">{t("login")}</Link>
          </div>
        </div>
      </section>
      <footer className="muted py-6 text-center text-sm">{t("lpFoot")}</footer>
    </div>
  );
}
