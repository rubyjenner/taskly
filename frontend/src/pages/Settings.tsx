import { useEffect, useRef, useState } from "react";
import { NavLink, Navigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Camera, Eye, EyeOff, KeyRound, Mail, Palette, Phone, Trash2, User as UserIcon } from "lucide-react";
import { api, User } from "../lib/api";
import { usePrefs } from "../lib/prefs";
import { errText } from "../lib/errors";
import { ROLES, roleLabel } from "../lib/roles";
import { useNotifPrefs } from "../lib/notify";
import Avatar from "../components/Avatar";
import PasswordField, { pwValid } from "../components/PasswordField";

const label = "muted mb-1 flex items-center gap-1 text-xs";

// ย่อรูปเป็น 256x256 (ครอปกลาง) แล้วเก็บเป็น data URL ขนาดเล็ก
async function toAvatar(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const m = Math.min(img.width, img.height);
    c.getContext("2d")!.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 256, 256);
    return c.toDataURL("image/jpeg", 0.85);
  } finally { URL.revokeObjectURL(url); }
}
const maskPhone = (p: string) => (p ? "*".repeat(Math.max(0, p.length - 4)) + p.slice(-4) : "-");
const maskEmail = (e: string) => { const [u, d] = e.split("@"); return u ? `${u[0]}${"*".repeat(Math.max(2, u.length - 1))}@${d ?? ""}` : "-"; };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card space-y-4 p-5"><h2 className="font-semibold">{title}</h2>{children}</section>;
}

function Switch({ on, onChange, text }: { on: boolean; onChange: (v: boolean) => void; text: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-3 text-left text-sm">
      <span>{text}</span>
      <span className="relative h-6 w-11 shrink-0 rounded-full transition-colors" style={{ background: on ? "var(--primary)" : "var(--border)" }}>
        <i className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: on ? "1.35rem" : "0.15rem" }} />
      </span>
    </button>
  );
}

function AccountTab() {
  const { t, lang } = usePrefs();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<User>("/me") });
  const [f, setF] = useState({ name: "", phone: "", position: "", bio: "", social: "" });
  const [avatar, setAvatar] = useState<string | null>(null); // null = ไม่เปลี่ยน, "" = ลบรูป
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => { if (me.data) setF({ name: me.data.name, phone: me.data.phone, position: me.data.position, bio: me.data.bio, social: me.data.social }); }, [me.data]);

  const save = useMutation({
    mutationFn: () => api<User>("/me", { method: "PUT", body: JSON.stringify({ ...f, avatar }) }),
    onSuccess: () => { setAvatar(null); qc.invalidateQueries({ queryKey: ["me"] }); },
  });

  const pick = async (file0?: File) => {
    setPhotoErr("");
    if (!file0) return;
    if (!file0.type.startsWith("image/")) return setPhotoErr(t("photoInvalid"));
    if (file0.size > 5 * 1024 * 1024) return setPhotoErr(t("photoTooBig"));
    try { setAvatar(await toAvatar(file0)); } catch { setPhotoErr(t("photoInvalid")); }
  };

  const shownAvatar = avatar !== null ? avatar : me.data?.avatar;
  const inList = ROLES.some((r) => r.value === f.position);

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Section title={t("accountInfo")}>
        <div className="flex items-center gap-4">
          <Avatar name={f.name} src={shownAvatar} size={72} />
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={() => file.current?.click()}><Camera size={15} />{t("changePhoto")}</button>
              {shownAvatar && <button type="button" className="btn text-red-500" onClick={() => setAvatar("")}><Trash2 size={15} />{t("removePhoto")}</button>}
            </div>
            {photoErr && <p className="text-xs text-red-500">{photoErr}</p>}
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        </div>
        <label className="block"><span className={label}><UserIcon size={12} />{t("name")}</span>
          <input className="input" required maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="block"><span className={label}>{t("position")}</span>
          <select className="input" value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })}>
            <option value="">{t("selectRole")}</option>
            {!inList && f.position && <option value={f.position}>{f.position}</option>}
            {ROLES.map((r) => <option key={r.value} value={r.value}>{roleLabel(r.value, lang)}</option>)}
          </select></label>
        <label className="block"><span className={label}>{t("bio")}</span>
          <textarea className="input" rows={3} maxLength={300} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
          <span className="muted block text-right text-xs">{f.bio.length}/300</span></label>
      </Section>

      <Section title={t("contactInfo")}>
        <div>
          <span className={label}><Mail size={12} />{t("emailLogin")}</span>
          <div className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
            <span className="truncate">{showEmail ? me.data?.email : maskEmail(me.data?.email ?? "")}</span>
            <button type="button" className="muted flex items-center gap-1 text-xs" onClick={() => setShowEmail(!showEmail)}>{showEmail ? <EyeOff size={14} /> : <Eye size={14} />}{showEmail ? t("hide") : t("show")}</button>
          </div>
        </div>
        <label className="block"><span className={label}>{t("social")}</span>
          <input className="input" maxLength={300} placeholder="https://..." value={f.social} onChange={(e) => setF({ ...f, social: e.target.value })} />
        </label>
        <div>
          <span className={label}><Phone size={12} />{t("phone")}</span>
          {showPhone ? (
            <div className="flex gap-2">
              <input className="input" type="tel" inputMode="tel" maxLength={20} placeholder="081-234-5678" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              <button type="button" className="btn shrink-0" onClick={() => setShowPhone(false)}><EyeOff size={14} />{t("hide")}</button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
              <span>{maskPhone(f.phone)}</span>
              <button type="button" className="muted flex items-center gap-1 text-xs" onClick={() => setShowPhone(true)}><Eye size={14} />{t("show")}</button>
            </div>
          )}
        </div>
        {save.isError && <p className="text-sm text-red-500">{errText(save.error, t)}</p>}
        {save.isSuccess && <p className="text-sm text-emerald-600">{t("saved")}</p>}
        <button className="btn btn-primary" disabled={save.isPending}>{t("save")}</button>
      </Section>
      <Section title={t("deleteAccount")}>
        <p className="muted text-sm">{t("deleteAccountHint")}</p>
        <button type="button" className="btn text-red-500" onClick={async () => {
          if (!window.confirm(t("deleteAccountConfirm"))) return;
          try { await api("/me", { method: "DELETE" }); localStorage.clear(); location.href = "/"; } catch (e) { window.alert(errText(e, t)); }
        }}><Trash2 size={15} />{t("deleteAccount")}</button>
      </Section>
    </form>
  );
}

function SecurityTab() {
  const { t } = usePrefs();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [err, setErr] = useState("");
  const change = useMutation({
    mutationFn: () => api("/me/password", { method: "POST", body: JSON.stringify({ current_password: pw.current, new_password: pw.next }) }),
    onSuccess: () => setPw({ current: "", next: "", confirm: "" }),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!pwValid(pw.next)) return setErr(t("pwInvalid"));
    if (pw.next !== pw.confirm) return setErr(t("pwMismatch"));
    change.mutate();
  };
  return (
    <form onSubmit={submit}>
      <Section title={t("changePw")}>
        <PasswordField value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} placeholder={t("currentPw")} autoComplete="current-password" />
        <PasswordField value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} placeholder={t("newPw")} meter autoComplete="new-password" />
        <PasswordField value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} placeholder={t("confirmPassword")} autoComplete="new-password" />
        {(err || change.isError) && <p className="text-sm text-red-500">{err || errText(change.error, t)}</p>}
        {change.isSuccess && <p className="text-sm text-emerald-600">{t("pwChanged")}</p>}
        <button className="btn btn-primary" disabled={change.isPending}>{t("changePw")}</button>
      </Section>
    </form>
  );
}

function NotificationsTab() {
  const { t } = usePrefs();
  const [p, set] = useNotifPrefs();
  return (
    <Section title={t("setNotif")}>
      <Switch on={p.dueSoon} onChange={(v) => set({ dueSoon: v })} text={t("notifDueToggle")} />
      <label className={`block ${p.dueSoon ? "" : "opacity-50"}`}><span className={label}>{t("notifLead")}</span>
        <select className="input" disabled={!p.dueSoon} value={p.leadHours} onChange={(e) => set({ leadHours: Number(e.target.value) })}>
          <option value={3}>{t("lead3h")}</option><option value={6}>{t("lead6h")}</option>
          <option value={24}>{t("lead24h")}</option><option value={72}>{t("lead72h")}</option>
        </select></label>
      <Switch on={p.tagged} onChange={(v) => set({ tagged: v })} text={t("notifTaggedToggle")} />
    </Section>
  );
}

function AppearanceTab() {
  const { t, lang, setLang, theme, setTheme } = usePrefs();
  const seg = (on: boolean) => `btn flex-1 ${on ? "btn-primary" : ""}`;
  return (
    <Section title={t("setAppearance")}>
      <div><span className={label}>{t("language")}</span>
        <div className="flex gap-2"><button className={seg(lang === "th")} onClick={() => setLang("th")}>ไทย</button><button className={seg(lang === "en")} onClick={() => setLang("en")}>English</button></div></div>
      <div><span className={label}>{t("theme")}</span>
        <div className="flex gap-2"><button className={seg(theme === "light")} onClick={() => setTheme("light")}>{t("light")}</button><button className={seg(theme === "dark")} onClick={() => setTheme("dark")}>{t("dark")}</button></div></div>
    </Section>
  );
}

export default function Settings() {
  const { t } = usePrefs();
  const { tab } = useParams();
  const tabs = [
    { id: "account", icon: <UserIcon size={16} />, text: t("setAccount"), el: <AccountTab /> },
    { id: "security", icon: <KeyRound size={16} />, text: t("setSecurity"), el: <SecurityTab /> },
    { id: "notifications", icon: <Bell size={16} />, text: t("setNotif"), el: <NotificationsTab /> },
    { id: "appearance", icon: <Palette size={16} />, text: t("setAppearance"), el: <AppearanceTab /> },
  ];
  const current = tabs.find((x) => x.id === tab);
  if (!current) return <Navigate to="/settings/account" replace />;
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">{t("settings")}</h1>
      <div className="grid gap-5 md:grid-cols-[13rem_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {tabs.map((x) => (
            <NavLink key={x.id} to={`/settings/${x.id}`} className={({ isActive }) => `navlink shrink-0 whitespace-nowrap${isActive ? " active" : ""}`}>{x.icon}{x.text}</NavLink>
          ))}
        </nav>
        <div className="max-w-xl">{current.el}</div>
      </div>
    </div>
  );
}
