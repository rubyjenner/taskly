import type React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getToken } from "./lib/api";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import { Forgot, Reset } from "./pages/Recover";
import Auth from "./pages/Auth";
import Tasks from "./pages/Tasks";
import Dashboard from "./pages/Dashboard";
import Tagged from "./pages/Tagged";
import Settings from "./pages/Settings";
import Account from "./pages/Account";

export default function App() {
  useLocation(); // ให้ App render ใหม่ทุกครั้งที่เปลี่ยนหน้า เพื่ออ่าน token ล่าสุด (ไม่งั้นออกจากระบบแล้วโดนเด้งกลับ /tasks)
  const authed = !!getToken();
  const guest = (el: React.ReactElement) => (authed ? <Navigate to="/tasks" replace /> : el);
  return (
    <Routes>
      <Route path="/" element={guest(<Landing />)} />
      <Route path="/login" element={guest(<Auth mode="login" />)} />
      <Route path="/register" element={guest(<Auth mode="register" />)} />
      <Route path="/forgot-password" element={<Forgot />} />
      <Route path="/reset-password" element={<Reset />} />
      <Route element={authed ? <Layout /> : <Navigate to="/login" replace />}>
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tagged" element={<Tagged />} />
        <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
        <Route path="/settings/:tab" element={<Settings />} />
        <Route path="/profile" element={<Account />} />
        <Route path="/account" element={<Navigate to="/profile" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
