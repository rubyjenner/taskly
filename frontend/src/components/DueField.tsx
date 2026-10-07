import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { usePrefs } from "../lib/prefs";
import { formatDue, toApiDate } from "../lib/datetime";

// value/onChange ใช้รูปแบบ "YYYY-MM-DDTHH:mm" (เวลาท้องถิ่นของเครื่อง) เหมือน datetime-local เดิม
const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function DueField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t, lang } = usePrefs();
  const loc = lang === "th" ? "th-TH" : "en-US";
  const [date, time] = value ? value.split("T") : ["", ""];
  const [hh, mm] = time ? time.split(":").map(Number) : [17, 0];
  const today = dateStr(new Date());

  const [open, setOpen] = useState(false);
  // เดือนที่กำลังดูในปฏิทิน (วันที่ 1 ของเดือน)
  const [view, setView] = useState(() => { const d = date ? parse(date) : new Date(); d.setDate(1); return d; });

  const set = (d: string, h = hh, m = mm) => onChange(d ? `${d}T${pad(h)}:${pad(m)}` : "");
  const shift = (n: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + n, 1));

  // 6 สัปดาห์ x 7 วัน เริ่มวันอาทิตย์ ตามปฏิทินทั่วไป
  const start = new Date(view.getFullYear(), view.getMonth(), 1 - view.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(loc, { weekday: "narrow" }));
  // ถ้าค่าเดิมมีนาทีที่ไม่ใช่ขั้นละ 5 ให้ยังเลือกค่านั้นได้
  const minutes = Array.from(new Set([...Array.from({ length: 12 }, (_, i) => i * 5), mm])).sort((a, b) => a - b);

  return (
    <div>
      <div className="flex gap-2">
        <button type="button" className="input flex flex-1 items-center gap-2 text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
          <CalendarDays size={15} className="muted shrink-0" />
          <span className={value ? "" : "muted"}>{value ? formatDue(toApiDate(value), lang) : t("dueSetPh")}</span>
        </button>
        {value && <button type="button" className="btn !px-2.5 text-red-500" aria-label={t("clear")} title={t("clear")} onClick={() => { onChange(""); setOpen(false); }}><X size={15} /></button>}
      </div>

      {open && (
        <div className="mt-2 rounded-xl border p-2.5" style={{ borderColor: "var(--border)", background: "var(--soft)" }}>
          <div className="mb-1.5 flex items-center justify-between">
            <button type="button" className="btn !h-7 !w-7 !p-0" aria-label={t("prev")} onClick={() => shift(-1)}><ChevronLeft size={14} /></button>
            <span className="text-sm font-semibold">{view.toLocaleDateString(loc, { month: "long", year: "numeric" })}</span>
            <button type="button" className="btn !h-7 !w-7 !p-0" aria-label={t("next")} onClick={() => shift(1)}><ChevronRight size={14} /></button>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px]">
            {weekdays.map((w, i) => <span key={i} className="muted py-1">{w}</span>)}
            {cells.map((c) => {
              const s = dateStr(c);
              const inMonth = c.getMonth() === view.getMonth();
              const picked = s === date;
              return (
                <button key={s} type="button" onClick={() => set(s)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums ${picked ? "btn-primary" : "hover:bg-[var(--card)]"} ${!inMonth && !picked ? "muted opacity-50" : ""}`}
                  style={!picked && s === today ? { boxShadow: "inset 0 0 0 1.5px var(--primary)" } : undefined}>
                  {c.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center gap-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
            <span className="muted text-xs">{t("timeLabel")}</span>
            <select className="input !w-auto !px-2 !py-1 tabular-nums" aria-label={t("timeLabel")} disabled={!date} value={hh} onChange={(e) => set(date, Number(e.target.value), mm)}>
              {HOURS.map((h) => <option key={h} value={h}>{pad(h)}</option>)}
            </select>
            <span>:</span>
            <select className="input !w-auto !px-2 !py-1 tabular-nums" aria-label={t("timeLabel")} disabled={!date} value={mm} onChange={(e) => set(date, hh, Number(e.target.value))}>
              {minutes.map((m) => <option key={m} value={m}>{pad(m)}</option>)}
            </select>
            <button type="button" className="chip ml-auto" onClick={() => { set(today); setView(new Date()); }}>{t("dueToday")}</button>
            <button type="button" className="chip chip-on" onClick={() => setOpen(false)}>{t("timePickerDone")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
