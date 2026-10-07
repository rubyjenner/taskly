import { useEffect, useState } from "react";
import { CalendarDays, Clock, X } from "lucide-react";
import { usePrefs } from "../lib/prefs";
import { formatDue, toApiDate } from "../lib/datetime";

// value/onChange ใช้รูปแบบ "YYYY-MM-DDTHH:mm" (เวลาท้องถิ่นของเครื่อง) เหมือน datetime-local เดิม
const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return dateStr(d); };

// ช่องเวลาแบบพิมพ์ตัวเลขติดกัน: พิมพ์ 0001 ได้ 00:01, พิมพ์ 9 ได้ 09:00, พิมพ์ 930 ได้ 09:30
function TimeInput({ value, onChange, disabled, label }: { value: string; onChange: (v: string) => void; disabled: boolean; label: string }) {
  const { t } = usePrefs();
  const [open, setOpen] = useState(false);
  const [hour, minute] = value ? value.split(":").map(Number) : [17, 0];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  const commit = (h: number, m: number) => { onChange(`${pad(h)}:${pad(m)}`); };
  return (
    <>
      <button type="button" aria-label={label} disabled={disabled} onClick={() => setOpen(true)}
        className="input flex w-full items-center gap-2 text-left disabled:opacity-40">
        <Clock size={15} className="muted shrink-0" />
        <span className={value ? "tabular-nums" : "muted tabular-nums"}>{value || "HH:MM"}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div><p className="font-semibold">{t("timePickerTitle")}</p><p className="muted text-xs">{label}</p></div>
              <button type="button" className="btn !p-2" onClick={() => setOpen(false)}><X size={15} /></button>
            </div>
            <div className="mb-4 flex h-56 gap-3">
              <div className="min-w-0 flex-1 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border)" }}>
                {hours.map((h) => <button key={h} type="button" onClick={() => commit(h, Number.isFinite(minute) ? minute : 0)} className={`mb-1 w-full rounded-lg py-2 text-center tabular-nums ${h === hour ? "btn-primary" : "hover:bg-[var(--soft)]"}`}>{pad(h)}</button>)}
              </div>
              <div className="flex items-center font-semibold">:</div>
              <div className="min-w-0 flex-1 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border)" }}>
                {minutes.map((m) => <button key={m} type="button" onClick={() => commit(Number.isFinite(hour) ? hour : 17, m)} className={`mb-1 w-full rounded-lg py-2 text-center tabular-nums ${m === minute ? "btn-primary" : "hover:bg-[var(--soft)]"}`}>{pad(m)}</button>)}
              </div>
            </div>
            <button type="button" className="btn btn-primary w-full" onClick={() => setOpen(false)}>{t("timePickerDone")}</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function DueField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t, lang } = usePrefs();
  const [date, time] = value ? value.split("T") : ["", ""];
  const set = (d: string, tm: string) => onChange(d ? `${d}T${tm || "17:00"}` : "");
  const quick = [[t("dueToday"), 0], [t("dueTomorrow"), 1], [t("dueNextWeek"), 7]] as const;

  return (
    <div className="space-y-2 rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--soft)" }}>
      <div className="flex flex-wrap items-center gap-1.5">
        {quick.map(([label, n]) => (
          <button key={n} type="button" className={`chip ${date === addDays(n) ? "chip-on" : ""}`} onClick={() => set(addDays(n), time)}>{label}</button>
        ))}
        {value && <button type="button" className="chip ml-auto text-red-500" onClick={() => onChange("")}><X size={12} />{t("clear")}</button>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="relative block">
          <CalendarDays size={15} className="muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="date" aria-label={t("dateLabel")} className="input pl-9" value={date} onChange={(e) => set(e.target.value, time)} />
        </label>
        <TimeInput label={t("timeLabel")} value={time ?? ""} disabled={!date} onChange={(v) => set(date, v)} />
      </div>


      <p className="muted flex items-center gap-1 text-xs">
        <CalendarDays size={12} />{value ? formatDue(toApiDate(value), lang) : t("noDueSet")}
      </p>
    </div>
  );
}
