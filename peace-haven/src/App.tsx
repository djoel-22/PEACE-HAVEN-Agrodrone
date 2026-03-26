import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClientLayout } from './components/client/ClientLayout';
import { AdminLayout } from './components/admin/AdminLayout';

// Client Pages
import { HomePage } from './pages/client/HomePage';
import { BookServicePage } from './pages/client/BookServicePage';
import { TrackOrderPage } from './pages/client/TrackOrderPage';
import { WeatherPage } from './pages/client/WeatherPage';
import { MyOrdersPage } from './pages/client/MyOrdersPage';
import { SupportPage } from './pages/client/SupportPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminDronesPage } from './pages/admin/AdminDronesPage';
import { AdminSchedulingPage } from './pages/admin/AdminSchedulingPage';
import { AdminBatteryPage } from './pages/admin/AdminBatteryPage';
import { AdminWeatherMonitorPage } from './pages/admin/AdminWeatherMonitorPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

// Auth
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Client Portal */}
        <Route path="/" element={<ClientLayout><HomePage /></ClientLayout>} />
        <Route path="/book" element={<ClientLayout><BookServicePage /></ClientLayout>} />
        <Route path="/track" element={<ClientLayout><TrackOrderPage /></ClientLayout>} />
        <Route path="/weather" element={<ClientLayout><WeatherPage /></ClientLayout>} />
        <Route path="/orders" element={<ClientLayout><MyOrdersPage /></ClientLayout>} />
        <Route path="/support" element={<ClientLayout><SupportPage /></ClientLayout>} />

        {/* Admin Portal */}
        <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/orders" element={<AdminLayout><AdminOrdersPage /></AdminLayout>} />
        <Route path="/admin/scheduling" element={<AdminLayout><AdminSchedulingPage /></AdminLayout>} />
        <Route path="/admin/drones" element={<AdminLayout><AdminDronesPage /></AdminLayout>} />
        <Route path="/admin/battery" element={<AdminLayout><AdminBatteryPage /></AdminLayout>} />
        <Route path="/admin/weather" element={<AdminLayout><AdminWeatherMonitorPage /></AdminLayout>} />
        <Route path="/admin/users" element={<AdminLayout><AdminUsersPage /></AdminLayout>} />
        <Route path="/admin/settings" element={<AdminLayout><AdminSettingsPage /></AdminLayout>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
