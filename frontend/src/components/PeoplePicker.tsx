import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User as UserIcon, X } from "lucide-react";
import { api, Participant, UserHit } from "../lib/api";
import { usePrefs } from "../lib/prefs";

// เลือกผู้ใช้ในระบบ (ผูก user_id) หรือพิมพ์ชื่ออิสระก็ได้
export default function PeoplePicker({ people, onChange }: { people: Participant[]; onChange: (p: Participant[]) => void }) {
  const { t } = usePrefs();
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

  const addUser = (u: UserHit) => { onChange([...people, { user_id: u.id, name: u.name }]); setText(""); };
  const addFree = () => {
    const name = text.trim();
    // ถ้ามีผู้ใช้ในระบบที่ตรงกับที่พิมพ์ ให้เลือกคนแรกแทนการเพิ่มเป็นชื่ออิสระ (ไม่งั้นงานจะไม่ไปโผล่หน้า "ถูกแท็ก" ของเขา)
    if (name && dq === name && matches.length > 0) return addUser(matches[0]);
    if (name && !people.some((p) => !p.user_id && p.name === name)) onChange([...people, { name }]);
    setText("");
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
      <input className="input" placeholder={t("peopleSearchPh")} value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFree(); } }} />
      {dq.length >= 2 && text.trim() && (
        <div className="card mt-1 max-h-40 overflow-y-auto p-1">
          {matches.map((u) => (
            <button key={u.id} type="button" className="navlink w-full" onClick={() => addUser(u)}>
              <UserIcon size={14} />{u.name}<span className="muted ml-auto text-xs">{t("inSystem")}</span>
            </button>
          ))}
          {!hits.isFetching && matches.length === 0 && <p className="muted px-3 py-2 text-xs">{t("noMatch")}</p>}
        </div>
      )}
      <p className="muted mt-1 text-xs">{t("peopleHint")}</p>
    </div>
  );
}
