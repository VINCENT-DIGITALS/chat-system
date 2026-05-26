import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatLayout from './pages/ChatLayout';
import UserSettings from './pages/UserSettings';
import { useBrandingStore } from './store/branding';
import { useThemeStore } from './store/theme';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminServers from './pages/admin/Servers';
import AdminBots from './pages/admin/Bots';
import AdminBranding from './pages/admin/Branding';
import Maintenance from './pages/admin/Maintenance';
import AuditLog from './pages/admin/AuditLog';
import { useAuthStore } from './store/auth';

function Protected({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const fetchBranding = useBrandingStore((s) => s.fetch);
  const syncTheme = useThemeStore((s) => s.syncFromServer);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    (async () => {
      fetchBranding();
      if (token) {
        await fetchMe();
        syncTheme().catch(() => {});
      }
      setBootstrapped(true);
    })();
  }, [token, fetchMe, fetchBranding, syncTheme]);

  if (!bootstrapped) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-app-950 text-app-muted">
        Loading…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/settings"
        element={
          <Protected>
            <UserSettings />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected>
            <AdminLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="bots" element={<AdminBots />} />
        <Route path="servers" element={<AdminServers />} />
        <Route path="branding" element={<AdminBranding />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="audit" element={<AuditLog />} />
      </Route>
      <Route
        path="/*"
        element={
          <Protected>
            <ChatLayout />
          </Protected>
        }
      />
    </Routes>
  );
}
