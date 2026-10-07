import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Mail, Phone, X, ExternalLink } from "lucide-react";
import { api, Owner, TaggedItem } from "../lib/api";
import { usePrefs } from "../lib/prefs";
import { errText } from "../lib/errors";
import { ROLES, roleLabel } from "../lib/roles";
import { dueRel, formatDue } from "../lib/datetime";
import Avatar from "../components/Avatar";

export default function Tagged() {
  const { t, lang } = usePrefs();
  const q = useQuery({ queryKey: ["tagged"], queryFn: () => api<TaggedItem[]>("/tagged") });
  const items = q.data ?? [];
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [openOwner, setOpenOwner] = useState<Owner | null>(null);

  const people = useMemo(() => {
    const map = new Map<number, { owner: Owner; tasks: TaggedItem[] }>();
    for (const item of items) {
      const current = map.get(item.owner.id);
      if (current) current.tasks.push(item); else map.set(item.owner.id, { owner: item.owner, tasks: [item] });
    }
    return Array.from(map.values()).filter((x) => {
      const s = search.trim().toLowerCase();
      if (position && x.owner.position !== position) return false;
      return !s || [x.owner.name, x.owner.email, x.owner.position, x.owner.social].some((v) => (v ?? "").toLowerCase().includes(s));
    }).sort((a, b) => a.owner.name.localeCompare(b.owner.name, lang === "th" ? "th" : "en"));
  }, [items, search, position, lang]);

  // ตำแหน่งที่มีอยู่จริงในคนที่แท็กเรา (เก็บค่าเป็นภาษาอังกฤษ แสดงชื่อตามภาษาที่เลือก)
  const positions = useMemo(() => {
    const set = new Set(items.map((x) => x.owner.position).filter(Boolean));
    const known = ROLES.map((r) => r.value).filter((v) => set.has(v));
    return [...known, ...Array.from(set).filter((v) => !known.includes(v))];
  }, [items]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("navTagged")}</h1>
        <p className="muted mt-1 text-sm">{t("taggedPageHint")}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_14rem]">
        <div className="relative">
          <Search size={16} className="muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="input pl-9" placeholder={t("searchPeople")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" aria-label={t("position")} value={position} onChange={(e) => setPosition(e.target.value)}>
          <option value="">{t("allPositions")}</option>
          {positions.map((p) => <option key={p} value={p}>{roleLabel(p, lang)}</option>)}
        </select>
      </div>

      {q.isLoading && <p className="muted py-10 text-center">{t("loading")}</p>}
      {q.isError && <p className="py-10 text-center text-red-500">{errText(q.error, t)}</p>}
      {q.data && people.length === 0 && items.length > 0 && <p className="muted py-10 text-center">{t("noPeopleMatch")}</p>}
      {q.data && items.length === 0 && (
        <div className="card px-5 py-10 text-center">
          <p className="font-medium">{t("taggedEmpty")}</p>
          <p className="muted mx-auto mt-1 max-w-sm text-sm">{t("taggedEmptyHint")}</p>
        </div>
      )}

      <div className="space-y-3">
        {people.map(({ owner, tasks }) => (
          <button key={owner.id} className="card flex w-full items-center gap-4 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md" onClick={() => setOpenOwner(owner)}>
            <Avatar name={owner.name} src={owner.avatar} size={56} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{owner.name}</p>
                {owner.position && <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--soft)" }}>{roleLabel(owner.position, lang)}</span>}
              </div>
              <p className="muted mt-1 truncate text-sm">{owner.email}{owner.social ? ` · ${owner.social}` : ""}</p>
              <p className="muted mt-1 text-xs">{tasks.length} {t("taggedTaskCount")}</p>
              <ul className="mt-2 space-y-1">
                {tasks.slice(0, 3).map((x) => (
                  <li key={x.id} className="flex items-center gap-2 text-sm">
                    <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: x.overdue ? "#ef4444" : { todo: "#94a3b8", doing: "#f59e0b", done: "#10b981" }[x.status] }} />
                    <span className="min-w-0 flex-1 truncate">{x.title}</span>
                    <span className={`shrink-0 text-xs ${x.overdue ? "font-medium text-red-500" : "muted"}`}>{x.status === "done" ? t("done") : x.due_at ? dueRel(x.due_at, lang) : t(x.status)}</span>
                  </li>
                ))}
                {tasks.length > 3 && <li className="muted text-xs">+{tasks.length - 3}</li>}
              </ul>
            </div>
            <ExternalLink size={16} className="muted shrink-0" />
          </button>
        ))}
      </div>

      {openOwner && (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={() => setOpenOwner(null)}>
          <aside className="card h-full w-full max-w-md space-y-5 overflow-y-auto !rounded-none p-6 sm:!rounded-l-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end"><button className="btn !p-2" aria-label={t("close")} onClick={() => setOpenOwner(null)}><X size={16} /></button></div>
            <div className="flex flex-col items-center text-center">
              <Avatar name={openOwner.name} src={openOwner.avatar} size={88} />
              <p className="mt-3 text-xl font-semibold">{openOwner.name}</p>
              {openOwner.position && <p className="muted text-sm">{roleLabel(openOwner.position, lang)}</p>}
            </div>
            <div className="space-y-2">
              <p className="muted text-xs font-semibold">{t("contactInfo")}</p>
              <a className="btn w-full !justify-start" href={`mailto:${openOwner.email}`}><Mail size={15} />{openOwner.email}</a>
              {openOwner.social && <a className="btn w-full !justify-start" href={openOwner.social.startsWith("http") ? openOwner.social : `https://${openOwner.social}`} target="_blank" rel="noreferrer"><ExternalLink size={15} />{openOwner.social}</a>}
              {openOwner.phone && <a className="btn w-full !justify-start" href={`tel:${openOwner.phone}`}><Phone size={15} />{openOwner.phone}</a>}
            </div>
            {openOwner.bio && <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}><p className="muted mb-1 text-xs">{t("bio")}</p><p className="whitespace-pre-wrap text-sm">{openOwner.bio}</p></div>}
            <div className="space-y-2">
              <p className="muted text-xs font-semibold">{t("taggedTask")}</p>
              {items.filter((x) => x.owner.id === openOwner.id).map((x) => (
                <div key={x.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                  <p className="font-medium">{x.title}</p>
                  {x.description && <p className="muted mt-1 text-sm">{x.description}</p>}
                  <p className="mt-2 text-xs"><span className="muted">{t("statusLabel")}: </span>{t(x.status)}{x.due_at ? ` · ${formatDue(x.due_at, lang)}${x.status !== "done" ? ` · ${dueRel(x.due_at, lang)}` : ""}` : ""}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
