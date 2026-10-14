import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User as UserIcon, X } from "lucide-react";
import { api, Participant, UserHit } from "../lib/api";
import { usePrefs } from "../lib/prefs";

// เลือกผู้ใช้ในระบบ (ผูก user_id) หรือพิมพ์ชื่ออิสระก็ได้
export default function PeoplePicker({ people, onChange }: { people: Participant[]; onChange: (p: Participant[]) => void }) {
  const { t } = usePrefs();
  const qc = useQueryClient();
  const [hint, setHint] = useState(false);
  const [text, setText] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => { const id = setTimeout(() => setDq(text.trim()), 250); return () => clearTimeout(id); }, [text]);

  const hits = useQuery({
    queryKey: ["users", dq],
    queryFn: () => api<UserHit[]>(`/users/search?q=${encodeURIComponent(dq)}`),
    enabled: dq.length >= 2,
  });
  const taken = new Set(people.filter((p) => p.user_id).map((p) => p.user_id));
  const matches = (hits.data ?? []).filter((u) => !taken.has(u.id));

  const addUser = (u: UserHit) => { onChange([...people, { user_id: u.id, name: u.name }]); setText(""); setHint(false); };
  const addFreeNow = () => {
    const name = text.trim();
    if (name && !people.some((p) => !p.user_id && p.name === name)) onChange([...people, { name }]);
    setText(""); setHint(false);
  };
  // กด Enter: ค้นหาจริงก่อนเสมอ (ไม่รอ debounce) ถ้าเจอผู้ใช้ที่ชื่อ/อีเมลตรงเป๊ะให้ผูกกับผู้ใช้นั้น
  // ถ้าเจอผู้ใช้ที่ใกล้เคียงแต่ไม่ตรงเป๊ะ ให้ผู้ใช้เลือกเอง ไม่แอบเพิ่มเป็นชื่ออิสระ (ไม่งั้นเขาจะไม่ได้รับการแจ้งเตือน)
  const addFree = async () => {
    const name = text.trim();
    if (!name) return;
    let found: UserHit[] = [];
    if (name.length >= 2) {
      try { found = await qc.fetchQuery({ queryKey: ["users", name], queryFn: () => api<UserHit[]>(`/users/search?q=${encodeURIComponent(name)}`), staleTime: 10_000 }); } catch { found = []; }
    }
    found = found.filter((u) => !taken.has(u.id));
    const exact = found.find((u) => u.name.toLowerCase() === name.toLowerCase());
    if (exact) return addUser(exact);
    if (found.length === 1) return addUser(found[0]);
    if (found.length > 1) return setHint(true);
    addFreeNow();
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {people.map((p, i) => (
          <span key={i} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs" style={{ background: "var(--soft)" }}
            title={p.user_id ? t("inSystem") : t("freeName")}>
            {p.user_id ? <UserIcon size={12} style={{ color: "var(--primary)" }} /> : "@"}{p.name}
            <button type="button" aria-label={t("del")} onClick={() => onChange(people.filter((_, j) => j !== i))}><X size={12} /></button>
          </span>
        ))}
      </div>
      <input className="input" placeholder={t("peopleSearchPh")} value={text} onChange={(e) => { setText(e.target.value); setHint(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFree(); } }} />
      {dq.length >= 2 && text.trim() && (
        <div className="card mt-1 max-h-40 overflow-y-auto p-1">
          {matches.map((u) => (
            <button key={u.id} type="button" className="navlink w-full" onClick={() => addUser(u)}>
              <UserIcon size={14} />{u.name}<span className="muted ml-auto text-xs">{t("inSystem")}</span>
            </button>
          ))}
          {!hits.isFetching && matches.length === 0 && <p className="muted px-3 py-2 text-xs">{t("noMatch")}</p>}
          <button type="button" className="navlink w-full text-xs" onClick={addFreeNow}>@ {text.trim()} · {t("addFreeName")}</button>
        </div>
      )}
      {hint && <p className="mt-1 text-xs text-amber-600">{t("pickFromList")}</p>}
      <p className="muted mt-1 text-xs">{t("peopleHint")}</p>
    </div>
  );
}
