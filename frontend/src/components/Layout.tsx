import type React from "react";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, CheckCheck, LayoutDashboard, ListTodo, LogOut, Moon, Settings as Cog, Sun, User as UserIcon } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, setToken, User } from "../lib/api";
import { localizedName, usePrefs } from "../lib/prefs";
import { dueRel } from "../lib/datetime";
import { useAlerts } from "../lib/useAlerts";
import { markSeen, markSeenDue } from "../lib/notify";
import Avatar from "./Avatar";

type Menu = "bell" | "user" | null;

export default function Layout() {
  const { t, lang, setLang, theme, setTheme } = usePrefs();
  const nav = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<User>("/me") });
  const alerts = useAlerts();
  const [open, setOpen] = useState<Menu>(null);
  const [bellViewed, setBellViewed] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const dismissBell = () => {
    markSeen(alerts.newTagged.map((x) => x.id));
    markSeenDue([...alerts.overdue, ...alerts.soon].map((x) => x.id));
    setBellViewed(false);
  };

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) {
        if (open === "bell") dismissBell();
        setOpen(null);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (open === "bell") dismissBell();
        setOpen(null);
      }
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open, alerts.newTagged, alerts.overdue, alerts.soon]);

  const toggle = (m: Exclude<Menu, null>) => {
    if (m === "bell") {
      const next = open === "bell" ? null : "bell";
      if (next === "bell") setBellViewed(true);
      else dismissBell();
      setOpen(next);
      return;
    }
    setOpen((cur) => (cur === m ? null : m));
  };
  const go = (to: string) => { setOpen(null); nav(to); };
  const name = me.data?.name ?? "";
  const displayName = localizedName(name, lang);
  const pill = (on: boolean) => `rounded-full px-2.5 py-1 text-xs font-semibold ${on ? "btn-primary" : "muted"}`;
  const isOverdueActive = location.pathname === "/tasks" && new URLSearchParams(location.search).get("overdue") === "1";

  const item = (key: string, title: string, sub: string, to: string, tone: string) => (
    <button key={key} className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--soft)]" onClick={() => {
      const id = Number(key.slice(1));
      if (key.startsWith("t")) markSeen([id]); else markSeenDue([id]);
      go(to);
    }}>
      <i className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: tone }} />
      <span className="min-w-0"><span className="block truncate text-sm font-medium">{title}</span><span className="muted block truncate text-xs">{sub}</span></span>
    </button>
  );
  const sec = (label: string) => <p className="muted px-2 pb-1 pt-2 text-xs font-semibold">{label}</p>;

  const navItem = (to: string, icon: React.ReactNode, label: string, active: boolean, dot = false) => (
    <NavLink to={to} className={() => `navlink w-full justify-start ${active ? "active" : ""}`}>
      {icon}<span>{label}</span>{dot && <i className="ml-auto h-2.5 w-2.5 rounded-full bg-red-500" aria-label={t("overdue")} />}
    </NavLink>
  );

  return (
    <div className="min-h-screen md:pl-56">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 border-r md:flex md:flex-col" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex h-16 items-center gap-2 border-b px-5" style={{ borderColor: "var(--border)" }}>
          <span className="btn-primary flex h-8 w-8 items-center justify-center rounded-xl"><CheckCheck size={18} /></span>
          <span className="text-lg font-bold">Taskly</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main navigation">
          {navItem("/tasks", <ListTodo size={16} />, t("navTasks"), location.pathname === "/tasks" && !isOverdueActive)}
          {navItem("/dashboard", <LayoutDashboard size={16} />, t("navDashboard"), location.pathname === "/dashboard")}
          {navItem("/tagged", <UserIcon size={16} />, t("navTagged"), location.pathname === "/tagged")}
          {navItem("/tasks?overdue=1", <AlertTriangle size={16} />, t("overdue"), isOverdueActive, alerts.overdue.length > 0)}
        </nav>
        <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
          <NavLink to="/settings/account" className="navlink w-full justify-start"><Cog size={16} />{t("settings")}</NavLink>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b backdrop-blur" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 82%, transparent)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-2 px-4 py-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center rounded-full border p-0.5" style={{ borderColor: "var(--border)", background: "var(--card)" }} role="group" aria-label={t("language")}>
              <button className={pill(lang === "th")} onClick={() => setLang("th")}>TH</button>
              <button className={pill(lang === "en")} onClick={() => setLang("en")}>EN</button>
            </div>
            <button className="btn !p-2" aria-label={t("theme")} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div ref={box} className="relative">
              <button className="btn relative !p-2" aria-label={t("notifications")} aria-expanded={open === "bell"} onClick={() => toggle("bell")}>
                <Bell size={16} />
                {alerts.hasAlert && !bellViewed && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 bg-red-500" style={{ borderColor: "var(--card)" }} />}
              </button>
              {open === "bell" && (
                <div className="card pop absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] p-2">
                  <p className="px-2 py-1 font-semibold">{t("notifications")}</p>
                  {!alerts.hasAlert && <p className="muted px-2 py-4 text-center text-sm">{t("notifEmpty")}</p>}
                  {alerts.overdue.length > 0 && <>{sec(t("notifOverdue"))}{alerts.overdue.slice(0, 4).map((f) => item(`o${f.id}`, f.title, f.due_at ? dueRel(f.due_at, lang) : "", `/tasks?open=${f.id}`, "#ef4444"))}</>}
                  {alerts.soon.length > 0 && <>{sec(t("notifDueSoon"))}{alerts.soon.slice(0, 4).map((f) => item(`s${f.id}`, f.title, f.due_at ? dueRel(f.due_at, lang) : "", `/tasks?open=${f.id}`, "#f59e0b"))}</>}
                  {alerts.newTagged.length > 0 && <>{sec(t("notifTagged"))}{alerts.newTagged.slice(0, 4).map((x) => item(`t${x.id}`, x.title, `${t("owner")}: ${x.owner.name}`, `/tagged?open=${x.id}`, "#6366f1"))}</>}
                </div>
              )}
            </div>

            <div className="relative">
              <button className="btn !py-1.5 !pl-1.5" aria-expanded={open === "user"} onClick={() => toggle("user")}>
                <Avatar name={displayName} src={me.data?.avatar} size={28} />
                <span className="hidden max-w-[8rem] truncate md:inline">{displayName}</span>
              </button>
              {open === "user" && (
                <div className="card pop absolute right-0 mt-2 w-60 space-y-1 p-2">
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <Avatar name={displayName} src={me.data?.avatar} size={36} />
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{displayName}</p><p className="muted truncate text-xs">{me.data?.email}</p></div>
                  </div>
                  <button className="navlink w-full" onClick={() => go("/profile")}><UserIcon size={16} />{t("profileMenu")}</button>
                  <button className="navlink w-full" onClick={() => { setToken(null); qc.clear(); nav("/login"); }}><LogOut size={16} />{t("logout")}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="border-b px-3 py-2 md:hidden" style={{ borderColor: "var(--border)", background: "var(--card)" }} aria-label="Main navigation">
        <div className="grid grid-cols-5 gap-1">
          {navItem("/tasks", <ListTodo size={15} />, t("navTasks"), location.pathname === "/tasks" && !isOverdueActive)}
          {navItem("/dashboard", <LayoutDashboard size={15} />, t("navDashboard"), location.pathname === "/dashboard")}
          {navItem("/tagged", <UserIcon size={15} />, t("navTagged"), location.pathname === "/tagged")}
          {navItem("/tasks?overdue=1", <AlertTriangle size={15} />, t("overdue"), isOverdueActive, alerts.overdue.length > 0)}
          {navItem("/settings/account", <Cog size={15} />, t("settings"), location.pathname.startsWith("/settings"))}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
