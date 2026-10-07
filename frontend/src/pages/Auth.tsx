import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errText } from "../lib/errors";
import { useMutation } from "@tanstack/react-query";
import { api, setToken, warmUp } from "../lib/api";
import { usePrefs } from "../lib/prefs";
import PasswordField, { pwValid } from "../components/PasswordField";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang } = usePrefs();
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <button className="muted absolute right-4 top-4 text-sm" onClick={() => setLang(lang === "th" ? "en" : "th")}>
        {lang === "th" ? "English" : "ไทย"}
      </button>
      <Link to="/" className="display text-4xl font-bold" style={{ color: "var(--primary)" }}>Taskly</Link>
      <p className="muted mb-6 mt-1 text-sm">{t("tagline")}</p>
      <div className="card space-y-3 p-5 shadow-sm">{children}</div>
    </main>
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
    <AuthShell>
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
