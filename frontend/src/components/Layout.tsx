import { Globe, LayoutDashboard, ListTodo, LogOut, Moon, Settings, Sun, User as UserIcon } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, setToken, User } from "../lib/api";
import { usePrefs } from "../lib/prefs";

export default function Layout() {
  const { t, lang, setLang, theme, setTheme } = usePrefs();
  const nav = useNavigate();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<User>("/me") });
  const cls = ({ isActive }: { isActive: boolean }) => `navlink${isActive ? " active" : ""}`;
  const seg = (on: boolean) => `btn flex-1 ${on ? "btn-primary" : ""}`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b backdrop-blur" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="mr-3 text-xl font-bold" style={{ color: "var(--primary)" }}>Taskly</span>
            <NavLink to="/" end className={cls}><ListTodo size={16} /><span className="hidden sm:inline">{t("navTasks")}</span></NavLink>
            <NavLink to="/dashboard" className={cls}><LayoutDashboard size={16} /><span className="hidden sm:inline">{t("navDashboard")}</span></NavLink>
          </div>
          <div className="flex items-center gap-2">
            <details className="relative">
              <summary className="btn cursor-pointer list-none" aria-label={t("settings")}><Settings size={16} /></summary>
              <div className="card absolute right-0 mt-2 w-60 space-y-3 p-3 shadow-lg">
                <div>
                  <p className="muted mb-1 flex items-center gap-1 text-xs"><Globe size={12} />{t("language")}</p>
                  <div className="flex gap-2">
                    <button className={seg(lang === "th")} onClick={() => setLang("th")}>ไทย</button>
                    <button className={seg(lang === "en")} onClick={() => setLang("en")}>English</button>
                  </div>
                </div>
                <div>
                  <p className="muted mb-1 flex items-center gap-1 text-xs">{theme === "dark" ? <Moon size={12} /> : <Sun size={12} />}{t("theme")}</p>
                  <div className="flex gap-2">
                    <button className={seg(theme === "light")} onClick={() => setTheme("light")}>{t("light")}</button>
                    <button className={seg(theme === "dark")} onClick={() => setTheme("dark")}>{t("dark")}</button>
                  </div>
                </div>
              </div>
            </details>
            <details className="relative">
              <summary className="btn cursor-pointer list-none"><UserIcon size={16} /><span className="hidden max-w-[8rem] truncate sm:inline">{me.data?.name}</span></summary>
              <div className="card absolute right-0 mt-2 w-52 space-y-1 p-2 shadow-lg">
                <p className="muted truncate px-2 py-1 text-xs">{me.data?.email}</p>
                <NavLink to="/account" className={cls}><UserIcon size={16} />{t("navAccount")}</NavLink>
                <button className="navlink w-full" onClick={() => { setToken(null); qc.clear(); nav("/login"); }}>
                  <LogOut size={16} />{t("logout")}
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
