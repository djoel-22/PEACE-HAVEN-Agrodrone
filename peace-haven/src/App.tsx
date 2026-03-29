import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ClientLayout } from './components/client/ClientLayout';
import { AdminLayout }  from './components/admin/AdminLayout';

// Client Pages
import { HomePage }          from './pages/client/HomePage';
import { BookServicePage }   from './pages/client/BookServicePage';
import { TrackOrderPage }    from './pages/client/TrackOrderPage';
import { WeatherPage }       from './pages/client/WeatherPage';
import { MyOrdersPage }      from './pages/client/MyOrdersPage';
import { SupportPage }       from './pages/client/SupportPage';
import { ClientProfilePage } from './pages/client/ClientProfilePage';

// Admin Pages
import { AdminDashboard }          from './pages/admin/AdminDashboard';
import { AdminOrdersPage }         from './pages/admin/AdminOrdersPage';
import { AdminDronesPage }         from './pages/admin/AdminDronesPage';
import { AdminSchedulingPage }     from './pages/admin/AdminSchedulingPage';
import { AdminBatteryPage }        from './pages/admin/AdminBatteryPage';
import { AdminWeatherMonitorPage } from './pages/admin/AdminWeatherMonitorPage';
import { AdminUsersPage }          from './pages/admin/AdminUsersPage';
import { AdminSettingsPage }       from './pages/admin/AdminSettingsPage';

// Auth
import { AdminLoginPage }  from './pages/AdminLoginPage';
import { ClientLoginPage } from './pages/ClientLoginPage';

// ── Auth helpers ──────────────────────────────────────────────────────────────
function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    return JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const payload = decodeJWT(token);
  if (!payload) return false;
  const exp = payload['exp'] as number | undefined;
  if (!exp) return false;
  return Date.now() / 1000 < exp;
}

export function getAdminToken():  string | null { return localStorage.getItem('admin_token'); }
export function getClientToken(): string | null { return localStorage.getItem('client_token'); }

export function isAdminAuthenticated(): boolean {
  const token = getAdminToken();
  if (!isTokenValid(token)) {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    return false;
  }
  return decodeJWT(token!)?.portal === 'admin';
}

export function isClientAuthenticated(): boolean {
  const token = getClientToken();
  if (!isTokenValid(token)) {
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_refresh_token');
    return false;
  }
  return decodeJWT(token!)?.portal === 'client';
}

// ── Route guards ──────────────────────────────────────────────────────────────
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed]     = useState(false);
  useEffect(() => { setAuthed(isAdminAuthenticated()); setChecking(false); }, []);
  if (checking) return <AuthLoader />;
  if (!authed)  return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

const ClientRoute = ({ children, requireAuth = false }: { children: React.ReactNode; requireAuth?: boolean }) => {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed]     = useState(false);
  useEffect(() => { setAuthed(isClientAuthenticated()); setChecking(false); }, []);
  if (checking && requireAuth) return <AuthLoader />;
  if (!authed && requireAuth)  return <Navigate to="/client/login" replace />;
  return <>{children}</>;
};

const AuthLoader = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin" />
      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-400">Authenticating</p>
    </div>
  </div>
);

const AdminLoginRoute  = () => isAdminAuthenticated()  ? <Navigate to="/admin" replace /> : <AdminLoginPage />;
const ClientLoginRoute = () => isClientAuthenticated() ? <Navigate to="/" replace />      : <ClientLoginPage />;

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <Routes>
        {/* Auth */}
        <Route path="/login"        element={<Navigate to="/client/login" replace />} />
        <Route path="/admin/login"  element={<AdminLoginRoute />} />
        <Route path="/client/login" element={<ClientLoginRoute />} />

        {/* Client — public */}
        <Route path="/"        element={<ClientRoute><ClientLayout><HomePage /></ClientLayout></ClientRoute>} />
        <Route path="/book"    element={<ClientRoute><ClientLayout><BookServicePage /></ClientLayout></ClientRoute>} />
        <Route path="/track"   element={<ClientRoute><ClientLayout><TrackOrderPage /></ClientLayout></ClientRoute>} />
        <Route path="/weather" element={<ClientRoute><ClientLayout><WeatherPage /></ClientLayout></ClientRoute>} />
        <Route path="/support" element={<ClientRoute><ClientLayout><SupportPage /></ClientLayout></ClientRoute>} />

        {/* Client — protected */}
        <Route path="/orders"  element={<ClientRoute requireAuth><ClientLayout><MyOrdersPage /></ClientLayout></ClientRoute>} />
        <Route path="/profile" element={<ClientRoute requireAuth><ClientLayout><ClientProfilePage /></ClientLayout></ClientRoute>} />

        {/* Admin — all protected */}
        <Route path="/admin"             element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
        <Route path="/admin/orders"      element={<AdminRoute><AdminLayout><AdminOrdersPage /></AdminLayout></AdminRoute>} />
        <Route path="/admin/scheduling"  element={<AdminRoute><AdminLayout><AdminSchedulingPage /></AdminLayout></AdminRoute>} />
        <Route path="/admin/drones"      element={<AdminRoute><AdminLayout><AdminDronesPage /></AdminLayout></AdminRoute>} />
        <Route path="/admin/battery"     element={<AdminRoute><AdminLayout><AdminBatteryPage /></AdminLayout></AdminRoute>} />
        <Route path="/admin/weather"     element={<AdminRoute><AdminLayout><AdminWeatherMonitorPage /></AdminLayout></AdminRoute>} />
        <Route path="/admin/users"       element={<AdminRoute><AdminLayout><AdminUsersPage /></AdminLayout></AdminRoute>} />
        <Route path="/admin/settings"    element={<AdminRoute><AdminLayout><AdminSettingsPage /></AdminLayout></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}