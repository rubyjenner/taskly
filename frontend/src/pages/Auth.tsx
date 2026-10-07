import { useEffect, useState } from "react";
import { Check, CheckCheck, Moon, Sun } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { errText } from "../lib/errors";
import { useMutation } from "@tanstack/react-query";
import { api, setToken, warmUp } from "../lib/api";
import { usePrefs } from "../lib/prefs";
import PasswordField, { pwValid } from "../components/PasswordField";

export function AuthShell({ children, sub }: { children: React.ReactNode; sub?: string }) {
  const { t, lang, setLang, theme, setTheme } = usePrefs();
  const rows = [[t("covMockA"), t("covMockC"), "#ff6b57", true], [t("covMockB"), t("covMockD"), "#f5a524", false]] as const;
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* หน้าปกฝั่งซ้าย (ซ่อนบนจอเล็ก) */}
      <aside className="lp-hero relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <Link to="/" className="display flex items-center gap-2 text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#2d3fe3]"><CheckCheck size={18} /></span>Taskly
        </Link>
        <div>
          <h1 className="display max-w-md text-4xl font-bold leading-[1.15] xl:text-5xl">{t("coverHead")}</h1>
          <p className="mt-4 max-w-md leading-relaxed text-white/85">{t("coverSub")}</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {[t("coverP1"), t("coverP2"), t("coverP3")].map((x) => (
              <li key={x} className="flex items-center gap-2.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20"><Check size={12} /></span>{x}</li>
            ))}
          </ul>
        </div>
        <div className="lp-rise max-w-sm rounded-[20px] bg-white p-3 text-slate-900 shadow-[0_30px_60px_-20px_rgba(10,20,90,.6)]" aria-hidden="true">
          <ul className="space-y-2">
            {rows.map(([title, due, color, ping]) => (
              <li key={title} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
                <i className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{title}</p>
                  <p className="flex items-center gap-1.5 text-xs" style={{ color: ping ? "#e5483a" : "#64748b" }}>
                    {ping && <span className="lp-ping inline-block h-2 w-2 rounded-full bg-[#ff6b57]" />}{due}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="relative flex flex-col justify-center px-5 py-16">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <div className="flex items-center rounded-full border p-0.5" style={{ borderColor: "var(--border)", background: "var(--card)" }} role="group" aria-label={t("language")}>
            {(["th", "en"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lang === l ? "btn-primary" : "muted"}`}>{l.toUpperCase()}</button>
            ))}
          </div>
          <button type="button" className="btn !p-2" aria-label={t("theme")} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="display text-4xl font-bold lg:hidden" style={{ color: "var(--primary)" }}>Taskly</Link>
          <p className="muted mb-6 mt-1 text-sm lg:mt-0">{sub ?? t("tagline")}</p>
          <div className="card space-y-3 p-5 shadow-sm">{children}</div>
          <Link to="/" className="muted mt-4 inline-block text-sm hover:underline">{t("backHome")}</Link>
        </div>
      </main>
    </div>
  );
}

export default function Auth({ mode }: { mode: "login" | "register" }) {
  const { t } = usePrefs();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [localErr, setLocalErr] = useState("");
  const isLogin = mode === "login";
  useEffect(warmUp, []);

  const m = useMutation({
    mutationFn: () =>
      api<{ token: string }>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(isLogin ? { email: f.email, password: f.password } : { name: f.name, email: f.email, password: f.password }),
      }),
    onSuccess: (r) => { setToken(r.token); nav("/tasks"); },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr("");
    if (!isLogin) {
      if (!pwValid(f.password)) return setLocalErr(t("pwInvalid"));
      if (f.password !== f.confirm) return setLocalErr(t("pwMismatch"));
    }
    m.mutate();
  };

  return (
    <AuthShell sub={isLogin ? t("loginSub") : t("registerSub")}>
      <form className="space-y-3" onSubmit={submit}>
        <h2 className="text-lg font-semibold">{isLogin ? t("login") : t("register")}</h2>
        {!isLogin && <input className="input" placeholder={t("name")} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
        <input className="input" type="email" placeholder={t("email")} required autoComplete="email" value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })} />
        <PasswordField value={f.password} onChange={(v) => setF({ ...f, password: v })} placeholder={t("password")}
          meter={!isLogin} autoComplete={isLogin ? "current-password" : "new-password"} />
        {!isLogin && <PasswordField value={f.confirm} onChange={(v) => setF({ ...f, confirm: v })} placeholder={t("confirmPassword")} autoComplete="new-password" />}
        {isLogin && <div className="text-right"><Link className="text-sm" style={{ color: "var(--primary)" }} to="/forgot-password">{t("forgot")}</Link></div>}

        {(localErr || m.isError) && <p className="text-sm text-red-500">{localErr || errText(m.error, t)}</p>}
        {m.isPending && <p className="muted text-xs">{t("connecting")}</p>}
        <button className="btn btn-primary w-full" disabled={m.isPending}>{isLogin ? t("login") : t("register")}</button>
        <p className="muted text-center text-sm">
          {isLogin ? t("noAccount") : t("haveAccount")}{" "}
          <Link style={{ color: "var(--primary)" }} to={isLogin ? "/register" : "/login"}>{isLogin ? t("register") : t("login")}</Link>
        </p>
      </form>
    </AuthShell>
  );
}
