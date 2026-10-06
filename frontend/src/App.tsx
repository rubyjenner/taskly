import { Navigate, Route, Routes } from "react-router-dom";
import { getToken } from "./lib/api";
import Layout from "./components/Layout";
import { Forgot, Reset } from "./pages/Recover";
import Auth from "./pages/Auth";
import Tasks from "./pages/Tasks";
import Dashboard from "./pages/Dashboard";
import Account from "./pages/Account";

export default function App() {
  const authed = !!getToken();
  return (
    <Routes>
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/register" element={<Auth mode="register" />} />
      <Route path="/forgot-password" element={<Forgot />} />
      <Route path="/reset-password" element={<Reset />} />
      <Route element={authed ? <Layout /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<Tasks />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/account" element={<Account />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
