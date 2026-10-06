import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { usePrefs } from "../lib/prefs";
import PasswordField, { pwValid } from "../components/PasswordField";
import { AuthShell } from "./Auth";

export function Forgot() {
  const { t } = usePrefs();
  const [email, setEmail] = useState("");
  const m = useMutation({
    mutationFn: () => api<{ message: string; reset_link?: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  });
  return (
    <AuthShell>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <h2 className="text-lg font-semibold">{t("forgotTitle")}</h2>
        <p className="muted text-sm">{t("forgotDesc")}</p>
        <input className="input" type="email" required placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
        {m.isError && <p className="text-sm text-red-500">{m.error.message}</p>}
        {m.isSuccess && (
          <div className="space-y-2 text-sm">
            <p className="text-emerald-600">{t("sentMsg")}</p>
            {m.data.reset_link && (
              <div className="rounded-lg p-2" style={{ background: "var(--soft)" }}>
                <p className="muted mb-1 text-xs">{t("demoLink")}</p>
                <a className="break-all underline" style={{ color: "var(--primary)" }} href={m.data.reset_link}>{m.data.reset_link}</a>
              </div>
            )}
          </div>
        )}
        <button className="btn btn-primary w-full" disabled={m.isPending}>{t("sendLink")}</button>
        <p className="text-center text-sm"><Link style={{ color: "var(--primary)" }} to="/login">{t("backLogin")}</Link></p>
      </form>
    </AuthShell>
  );
}

export function Reset() {
  const { t } = usePrefs();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const m = useMutation({
    mutationFn: () => api("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password: pw }) }),
    onSuccess: () => setTimeout(() => nav("/login"), 1500),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!pwValid(pw)) return setErr(t("pwInvalid"));
    if (pw !== confirm) return setErr(t("pwMismatch"));
    m.mutate();
  };
  if (!token) return <AuthShell><p className="text-sm text-red-500">{t("noToken")}</p><Link to="/login" style={{ color: "var(--primary)" }}>{t("backLogin")}</Link></AuthShell>;
  return (
    <AuthShell>
      <form className="space-y-3" onSubmit={submit}>
        <h2 className="text-lg font-semibold">{t("resetTitle")}</h2>
        <PasswordField value={pw} onChange={setPw} placeholder={t("newPw")} meter autoComplete="new-password" />
        <PasswordField value={confirm} onChange={setConfirm} placeholder={t("confirmPassword")} autoComplete="new-password" />
        {(err || m.isError) && <p className="text-sm text-red-500">{err || m.error?.message}</p>}
        {m.isSuccess && <p className="text-sm text-emerald-600">{t("resetDone")}</p>}
        <button className="btn btn-primary w-full" disabled={m.isPending || m.isSuccess}>{t("resetBtn")}</button>
      </form>
    </AuthShell>
  );
}
