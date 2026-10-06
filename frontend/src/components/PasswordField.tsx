import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { usePrefs } from "../lib/prefs";

export const pwValid = (p: string) => p.length >= 8 && p.length <= 72 && /[a-zA-Z]/.test(p) && /\d/.test(p);
const score = (p: string) =>
  [p.length >= 8, p.length >= 12, /[a-zA-Z]/.test(p) && /\d/.test(p), /[^a-zA-Z0-9]/.test(p)].filter(Boolean).length;

export default function PasswordField({ value, onChange, placeholder, meter = false, autoComplete }: {
  value: string; onChange: (v: string) => void; placeholder: string; meter?: boolean; autoComplete?: string;
}) {
  const { t } = usePrefs();
  const [show, setShow] = useState(false);
  const s = score(value);
  const label = s <= 1 ? t("pwWeak") : s <= 3 ? t("pwFair") : t("pwStrong");
  const color = s <= 1 ? "bg-red-500" : s <= 3 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="relative">
        <input className="input pr-10" type={show ? "text" : "password"} placeholder={placeholder} required
          autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" aria-label={show ? t("hide") : t("show")} onClick={() => setShow(!show)}
          className="muted absolute right-2 top-1/2 -translate-y-1/2 p-1">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {meter && value && (
        <div className="mt-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= s ? color : "bg-slate-200 dark:bg-slate-700"}`} />
            ))}
          </div>
          <p className="muted mt-1 text-xs">{label} · {t("pwHint")}</p>
        </div>
      )}
    </div>
  );
}
