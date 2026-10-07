import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, Check, Download, Eye, Paperclip, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { api, Category, downloadFile, Participant, Status, STATUSES, Task, TaskFile, TaskPage, uploadFile, User } from "../lib/api";
import { localizedName, usePrefs } from "../lib/prefs";
import { dueRel, formatDue, toApiDate, toInputValue } from "../lib/datetime";
import { errText } from "../lib/errors";
import TimeAgo from "../components/TimeAgo";
import DueField from "../components/DueField";
import PeoplePicker from "../components/PeoplePicker";

const STATUS_COLOR: Record<Status, string> = { todo: "#94a3b8", doing: "#f59e0b", done: "#10b981" };
const LATE = "#f97316"; // งานที่เสร็จแล้วแต่เสร็จช้ากว่ากำหนด

function LateBadge({ text }: { text: string }) {
  return <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `color-mix(in srgb, ${LATE} 18%, transparent)`, color: LATE }}>{text}</span>;
}

const BADGE: Record<Status, string> = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  doing: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
};

function useDebounce<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const dueText = (task: Task, lang: "th" | "en") =>
  !task.due_at ? "" : task.status === "done" ? formatDue(task.due_at, lang)
    : task.overdue ? `${dueRel(task.due_at, lang)} · ${formatDue(task.due_at, lang)}` : `${formatDue(task.due_at, lang)} · ${dueRel(task.due_at, lang)}`;

const wasEdited = (t: Task) => new Date(t.updated_at).getTime() - new Date(t.created_at).getTime() > 2000;

export default function Tasks() {
  const { t, lang } = usePrefs();
  const qc = useQueryClient();
  // ตัวกรองและงานที่เปิดดูอยู่เก็บใน URL เพื่อให้ลิงก์จาก dashboard / กระดิ่งพาไปถูกที่
  const [sp, setSp] = useSearchParams();
  const status = sp.get("status") ?? "";
  const categoryId = sp.get("category_id") ?? "";
  const overdueOnly = sp.get("overdue") === "1";
  const dueSoonOnly = sp.get("due_soon") === "1";
  const detailId = Number(sp.get("open")) || null;
  const setParam = (k: string, v: string) => setSp((cur) => { const n = new URLSearchParams(cur); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });
  const setStatus = (v: string) => setParam("status", v);
  const setCategoryId = (v: string) => setParam("category_id", v);
  const setDetailId = (id: number | null) => setParam("open", id ? String(id) : "");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ task: Task | null } | null>(null);
  const [newCat, setNewCat] = useState("");
  const dq = useDebounce(q);

  useEffect(() => setPage(1), [dq, status, categoryId, overdueOnly, dueSoonOnly]);

  const me = useQuery({ queryKey: ["me"], queryFn: () => api<User>("/me") });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api<Category[]>("/categories") });
  const tasks = useQuery({
    queryKey: ["tasks", { q: dq, status, categoryId, overdueOnly, dueSoonOnly, page }],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: "10" });
      if (dq) p.set("q", dq);
      if (status) p.set("status", status);
      if (categoryId) p.set("category_id", categoryId);
      if (overdueOnly) p.set("overdue", "true");
      if (dueSoonOnly) p.set("due_soon", "true");
      return api<TaskPage>(`/tasks?${p}`);
    },
    placeholderData: keepPreviousData,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["task"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["alerts"] });
  };
  const changeStatus = useMutation({
    mutationFn: (v: { id: number; status: string }) =>
      api(`/tasks/${v.id}/status`, { method: "PATCH", body: JSON.stringify({ status: v.status }) }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => { setDetailId(null); refresh(); },
  });
  const addCat = useMutation({
    mutationFn: (name: string) => api("/categories", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => { setNewCat(""); qc.invalidateQueries({ queryKey: ["categories"] }); },
  });

  const totalPages = Math.max(1, Math.ceil((tasks.data?.total ?? 0) / 10));
  const inList = tasks.data?.data.find((x) => x.id === detailId) ?? null;
  const fetched = useQuery({ queryKey: ["task", detailId], queryFn: () => api<Task>(`/tasks/${detailId}`), enabled: detailId !== null && !inList });
  const detail = inList ?? fetched.data ?? null;
  const filtering = !!(status || categoryId || overdueOnly || dueSoonOnly);
  const askDelete = (task: Task) => confirm(`${t("confirmDelete")}\n“${task.title}”`) && remove.mutate(task.id);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("hello")}{me.data ? `, ${localizedName(me.data.name, lang)}` : ""}</h1>
          <p className="muted text-sm">{t("navTasks")}{tasks.data ? ` · ${tasks.data.total}` : ""}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setForm({ task: null })}><Plus size={16} />{t("addTask")}</button>
      </div>



      {(overdueOnly || dueSoonOnly) && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {overdueOnly && <span className="chip chip-on">{t("overdue")}</span>}
          {dueSoonOnly && <span className="chip chip-on">{t("dueSoon")}</span>}
        </div>
      )}

      <section className="mb-3 grid gap-2 sm:grid-cols-3">
        <div className="relative">
          <Search size={16} className="muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="input pl-9" placeholder={t("searchPh")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("allStatus")}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </select>
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">{t("allCategories")}</option>
          {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </section>

      {filtering && <button className="chip mb-3" onClick={() => setSp({}, { replace: true })}><X size={12} />{t("clearFilter")}</button>}

      <form className="mb-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newCat.trim()) addCat.mutate(newCat.trim()); }}>
        <input className="input" placeholder={t("addCategoryPh")} value={newCat} onChange={(e) => setNewCat(e.target.value)} />
        <button className="btn shrink-0"><Plus size={16} />{t("addCategory")}</button>
      </form>
      {addCat.isError && <p className="mb-3 text-sm text-red-500">{errText(addCat.error, t)}</p>}

      {tasks.isLoading && <p className="muted py-10 text-center">{t("loading")}</p>}
      {tasks.isError && <p className="py-10 text-center text-red-500">{errText(tasks.error, t)}</p>}
      {tasks.data?.data.length === 0 && <p className="muted py-10 text-center">{t("noTasks")}</p>}

      <ul className="space-y-3">
        {tasks.data?.data.map((task) => (
          <li key={task.id} className="card p-4 transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderLeft: `4px solid ${task.late_done ? LATE : STATUS_COLOR[task.status]}` }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button className="min-w-0 flex-1 text-left" onClick={() => setDetailId(task.id)}>
                <p className="flex items-center gap-1.5 font-medium">{task.status === "done" && <Check size={15} className="shrink-0 text-emerald-500" />}<span>{task.title}</span></p>
                {task.description && <p className="muted mt-1 line-clamp-2 text-sm">{task.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {task.category_name && (
                    <span className="rounded-full px-2 py-0.5 text-white" style={{ background: task.category_color ?? "#6366f1" }}>{task.category_name}</span>
                  )}
                  {task.late_done && <LateBadge text={t("lateDone")} />}
                  {task.due_at && (
                    <span className={`flex items-center gap-1 ${task.overdue ? "font-medium text-red-500" : task.late_done ? "" : "muted"}`} style={task.late_done ? { color: LATE } : undefined}>
                      <CalendarClock size={12} />{dueText(task, lang)}
                    </span>
                  )}
                  {task.participants.map((p, i) => <span key={i} className="rounded-full px-2 py-0.5" style={{ background: "var(--soft)" }}>@{p.name}</span>)}
                </div>
                <p className="muted mt-2 text-xs">
                  {t("created")} <TimeAgo iso={task.created_at} />
                  {wasEdited(task) && <> · {t("edited")} <TimeAgo iso={task.updated_at} /></>}
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <select aria-label={t("statusLabel")} className={`rounded-lg border-0 px-2 py-1 text-xs font-medium ${BADGE[task.status]}`} value={task.status}
                  onChange={(e) => changeStatus.mutate({ id: task.id, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                </select>
                <button className="btn !p-2" title={t("view")} aria-label={t("view")} onClick={() => setDetailId(task.id)}><Eye size={15} /></button>
                <button className="btn !p-2" title={t("edit")} aria-label={t("edit")} onClick={() => setForm({ task })}><Pencil size={15} /></button>
                <button className="btn !p-2 text-red-500" title={t("del")} aria-label={t("del")} onClick={() => askDelete(task)}><Trash2 size={15} /></button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {tasks.data && tasks.data.total > 10 && (
        <nav className="mt-5 flex items-center justify-center gap-3 text-sm">
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("prev")}</button>
          <span className="muted">{t("page")} {page} / {totalPages}</span>
          <button className="btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t("next")}</button>
        </nav>
      )}

      {detail && (
        <Detail task={detail} onClose={() => setDetailId(null)} onEdit={() => { setDetailId(null); setForm({ task: detail }); }}
          onDelete={() => askDelete(detail)} onStatus={(s) => changeStatus.mutate({ id: detail.id, status: s })} />
      )}
      {form && <TaskForm task={form.task} categories={categories.data ?? []} onClose={() => setForm(null)} onSaved={refresh} />}
    </div>
  );
}

const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

// ไฟล์แนบของงาน (เห็น/จัดการได้เฉพาะเจ้าของงาน)
function Files({ taskId }: { taskId: number }) {
  const { t } = usePrefs();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const key = ["files", taskId];
  const files = useQuery({ queryKey: key, queryFn: () => api<TaskFile[]>(`/tasks/${taskId}/files`) });
  const del = useMutation({
    mutationFn: (id: number) => api(`/tasks/${taskId}/files/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const pick = async (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    if (input.current) input.current.value = "";
    setErr("");
    setBusy(true);
    for (const f of picked) {
      if (f.size > 3 * 1024 * 1024) { setErr(t("errFileBig")); break; }
      try { await uploadFile(taskId, f); } catch (e) { setErr(errText(e, t)); break; }
    }
    setBusy(false);
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="space-y-2">
      {files.data?.length === 0 && <p className="muted text-sm">{t("noFiles")}</p>}
      <ul className="space-y-1.5">
        {files.data?.map((f) => (
          <li key={f.id} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: "var(--border)" }}>
            <Paperclip size={14} className="muted shrink-0" />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm">{f.name}</span><span className="muted text-xs">{fmtSize(f.size)}</span></span>
            <button type="button" className="btn !p-1.5" title={t("download")} aria-label={t("download")} onClick={() => downloadFile(taskId, f).catch((e) => setErr(errText(e, t)))}><Download size={14} /></button>
            <button type="button" className="btn !p-1.5 text-red-500" title={t("del")} aria-label={t("del")} onClick={() => confirm(`${t("confirmDeleteFile")}\n“${f.name}”`) && del.mutate(f.id)}><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
      <input ref={input} type="file" multiple hidden accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.md,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" onChange={(e) => pick(e.target.files)} />
      <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}><Paperclip size={15} />{busy ? t("uploading") : t("addFile")}</button>
      <p className="muted text-xs">{t("fileHint")}</p>
      {err && <p className="text-sm text-red-500">{err}</p>}
    </div>
  );
}

function Detail({ task, onClose, onEdit, onDelete, onStatus }: {
  task: Task; onClose: () => void; onEdit: () => void; onDelete: () => void; onStatus: (s: Status) => void;
}) {
  const { t, lang } = usePrefs();
  const row = (label: string, body: React.ReactNode) => (
    <div><p className="muted mb-1 text-xs uppercase tracking-wide">{label}</p><div className="text-sm">{body}</div></div>
  );
  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={onClose}>
      <aside className="card h-full w-full max-w-md space-y-5 overflow-y-auto !rounded-none p-6 sm:!rounded-l-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="muted text-xs">{t("details")}</p>
            <h2 className="text-lg font-semibold">{task.title}</h2>
          </div>
          <button className="btn !p-2" aria-label={t("close")} onClick={onClose}><X size={16} /></button>
        </div>
        {row(t("statusLabel"), (
          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => onStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${task.status === s ? BADGE[s] + " ring-2 ring-[var(--primary)]" : "btn"}`}>{t(s)}</button>
            ))}
          </div>
        ))}
        {row(t("categoryLabel"), task.category_name
          ? <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: task.category_color ?? "#6366f1" }}>{task.category_name}</span>
          : <span className="muted">{t("noCategory")}</span>)}
        {row(t("dueLabel"), task.due_at
          ? <span className="flex flex-wrap items-center gap-2"><span className={task.overdue ? "font-medium text-red-500" : ""}>{dueText(task, lang)}</span>{task.late_done && <LateBadge text={t("lateDone")} />}</span>
          : <span className="muted">{t("noDue")}</span>)}
        {row(t("descPh").replace(/\s*\(.*\)/, ""), task.description
          ? <p className="whitespace-pre-wrap">{task.description}</p> : <span className="muted">{t("noDesc")}</span>)}
        {row(t("participants"), task.participants.length
          ? <div className="flex flex-wrap gap-2">{task.participants.map((p, i) => <span key={i} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--soft)" }}>@{p.name}</span>)}</div>
          : <span className="muted">-</span>)}
        {row(t("filesTitle"), <Files taskId={task.id} />)}
        <p className="muted border-t pt-3 text-xs" style={{ borderColor: "var(--border)" }}>
          {t("created")} <TimeAgo iso={task.created_at} />
          {wasEdited(task) && <> · {t("edited")} <TimeAgo iso={task.updated_at} /></>}
        </p>
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" onClick={onEdit}><Pencil size={15} />{t("edit")}</button>
          <button className="btn text-red-500" onClick={onDelete}><Trash2 size={15} />{t("del")}</button>
        </div>
      </aside>
    </div>
  );
}

function TaskForm({ task, categories, onClose, onSaved }: {
  task: Task | null; categories: Category[]; onClose: () => void; onSaved: () => void;
}) {
  const { t } = usePrefs();
  const [f, setF] = useState({
    title: task?.title ?? "", description: task?.description ?? "",
    status: (task?.status ?? "todo") as Status,
    category_id: task?.category_id ? String(task.category_id) : "", due: toInputValue(task?.due_at ?? null),
  });
  const [people, setPeople] = useState<Participant[]>(task?.participants ?? []);
  // ไฟล์ที่เลือกไว้ตอนสร้างงานใหม่ จะอัปโหลดทันทีหลังบันทึกงาน (งานเดิมใช้ช่องไฟล์แนบสดๆ ได้เลย)
  const [pending, setPending] = useState<File[]>([]);
  const [fileErr, setFileErr] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const addPending = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    if (fileInput.current) fileInput.current.value = "";
    setFileErr("");
    const ok = picked.filter((x) => x.size <= 3 * 1024 * 1024);
    if (ok.length < picked.length) setFileErr(t("errFileBig"));
    setPending((cur) => [...cur, ...ok].slice(0, 10));
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = JSON.stringify({
        title: f.title, description: f.description, status: f.status,
        category_id: f.category_id ? Number(f.category_id) : null, due_at: toApiDate(f.due), participants: people,
      });
      if (task) { await api(`/tasks/${task.id}`, { method: "PUT", body }); return [] as string[]; }
      const created = await api<Task>("/tasks", { method: "POST", body });
      const failed: string[] = [];
      for (const file of pending) {
        try { await uploadFile(created.id, file); } catch { failed.push(file.name); }
      }
      return failed;
    },
    onSuccess: (failed) => {
      onSaved(); onClose();
      if (failed.length) alert(`${t("uploadFailed")}\n${failed.join(", ")}`);
    },
  });
  const label = "muted mb-1 block text-xs";

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        className="card max-h-[92vh] w-full max-w-md space-y-3 overflow-y-auto !rounded-b-none p-5 sm:!rounded-b-2xl">
        <h2 className="text-lg font-semibold">{task ? t("editTask") : t("newTask")}</h2>
        <input className="input" placeholder={t("titlePh")} required maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea className="input" rows={3} placeholder={t("descPh")} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <label><span className={label}>{t("statusLabel")}</span>
            <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Status })}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
            </select></label>
          <label><span className={label}>{t("categoryLabel")}</span>
            <select className="input" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
              <option value="">{t("noCategory")}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></label>
        </div>
        <div><span className={label}>{t("dueLabel")}</span>
          <DueField value={f.due} onChange={(v) => setF({ ...f, due: v })} /></div>
        <div>
          <span className={label}>{t("participants")}</span>
          <PeoplePicker people={people} onChange={setPeople} />
        </div>
        <div>
          <span className={label}>{t("filesTitle")}</span>
          {task ? <Files taskId={task.id} /> : (
            <div className="space-y-2">
              <ul className="space-y-1.5">
                {pending.map((file, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: "var(--border)" }}>
                    <Paperclip size={14} className="muted shrink-0" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm">{file.name}</span><span className="muted text-xs">{fmtSize(file.size)}</span></span>
                    <button type="button" className="btn !p-1.5" aria-label={t("del")} onClick={() => setPending(pending.filter((_, j) => j !== i))}><X size={14} /></button>
                  </li>
                ))}
              </ul>
              <input ref={fileInput} type="file" multiple hidden accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.md,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" onChange={(e) => addPending(e.target.files)} />
              <button type="button" className="btn" onClick={() => fileInput.current?.click()}><Paperclip size={15} />{t("addFile")}</button>
              <p className="muted text-xs">{t("fileHint")}</p>
              {fileErr && <p className="text-sm text-red-500">{fileErr}</p>}
            </div>
          )}
        </div>
        {save.isError && <p className="text-sm text-red-500">{errText(save.error, t)}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn" onClick={onClose}>{t("cancel")}</button>
          <button className="btn btn-primary" disabled={save.isPending}>{t("save")}</button>
        </div>
      </form>
    </div>
  );
}
