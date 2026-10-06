import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, User } from "../lib/api";
import { usePrefs } from "../lib/prefs";
import PasswordField, { pwValid } from "../components/PasswordField";

export default function Account() {
  const { t } = usePrefs();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<User>("/me") });
  const [name, setName] = useState("");
  useEffect(() => { if (me.data) setName(me.data.name); }, [me.data]);

  const profile = useMutation({
    mutationFn: () => api<User>("/me", { method: "PUT", body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [err, setErr] = useState("");
  const change = useMutation({
    mutationFn: () => api("/me/password", { method: "POST", body: JSON.stringify({ current_password: pw.current, new_password: pw.next }) }),
    onSuccess: () => setPw({ current: "", next: "", confirm: "" }),
  });
  const submitPw = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!pwValid(pw.next)) return setErr(t("pwInvalid"));
    if (pw.next !== pw.confirm) return setErr(t("pwMismatch"));
    change.mutate();
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <form className="card space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); profile.mutate(); }}>
        <h2 className="font-semibold">{t("profile")}</h2>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name")} />
        <input className="input opacity-60" disabled value={me.data?.email ?? ""} />
        {profile.isError && <p className="text-sm text-red-500">{profile.error.message}</p>}
        {profile.isSuccess && <p className="text-sm text-emerald-600">{t("saved")}</p>}
        <button className="btn btn-primary" disabled={profile.isPending}>{t("save")}</button>
      </form>

      <form className="card space-y-3 p-5" onSubmit={submitPw}>
        <h2 className="font-semibold">{t("changePw")}</h2>
        <PasswordField value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} placeholder={t("currentPw")} autoComplete="current-password" />
        <PasswordField value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} placeholder={t("newPw")} meter autoComplete="new-password" />
        <PasswordField value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} placeholder={t("confirmPassword")} autoComplete="new-password" />
        {(err || change.isError) && <p className="text-sm text-red-500">{err || change.error?.message}</p>}
        {change.isSuccess && <p className="text-sm text-emerald-600">{t("pwChanged")}</p>}
        <button className="btn btn-primary" disabled={change.isPending}>{t("changePw")}</button>
      </form>
    </div>
  );
}
