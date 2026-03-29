// api.ts — single source of truth for all backend calls
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

// ── Public endpoints — no auth token attached ─────────────────────────────────
const PUBLIC_PATHS = [
  '/api/stats',
  '/api/weather',
  '/api/requests/new',
  '/api/track/',
  '/api/admin/login',
  '/api/admin/client/login',
  '/api/admin/client/register',
];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(p => path.startsWith(p));
}

// ── Token helpers ─────────────────────────────────────────────────────────────
function getToken(portal: 'admin' | 'client'): string | null {
  return localStorage.getItem(portal === 'admin' ? 'admin_token' : 'client_token');
}

function getRefreshToken(portal: 'admin' | 'client'): string | null {
  return localStorage.getItem(portal === 'admin' ? 'admin_refresh_token' : 'client_refresh_token');
}

function setTokens(portal: 'admin' | 'client', access: string, refresh: string) {
  if (portal === 'admin') {
    localStorage.setItem('admin_token', access);
    localStorage.setItem('admin_refresh_token', refresh);
  } else {
    localStorage.setItem('client_token', access);
    localStorage.setItem('client_refresh_token', refresh);
  }
}

function clearTokens(portal: 'admin' | 'client') {
  if (portal === 'admin') {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
  } else {
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_refresh_token');
    localStorage.removeItem('client_user');
  }
}

function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    return JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function isExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = decodeJWT(token);
  if (!payload) return true;
  const exp = payload['exp'] as number | undefined;
  if (!exp) return true;
  return Date.now() / 1000 > exp - 30;
}

// ── Refresh lock ──────────────────────────────────────────────────────────────
let _refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(portal: 'admin' | 'client'): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    const refreshToken = getRefreshToken(portal);
    if (!refreshToken) return false;
    const endpoint = portal === 'admin' ? '/api/admin/refresh' : '/api/admin/client/refresh';
    try {
      const res = await fetch(`${BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) { clearTokens(portal); return false; }
      const data = await res.json();
      const newAccess = data.access_token ?? data.token;
      const newRefresh = data.refresh_token;
      if (!newAccess) { clearTokens(portal); return false; }
      setTokens(portal, newAccess, newRefresh ?? refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

// ── Core fetch ────────────────────────────────────────────────────────────────
export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { _retry?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> ?? {}),
  };

  // Don't attach any token for public endpoints
  if (!isPublicPath(path)) {
    const adminToken  = getToken('admin');
    const clientToken = getToken('client');

    let portal: 'admin' | 'client' | null = null;
    let activeToken: string | null = null;

    if (adminToken && !isExpired(adminToken)) {
      portal = 'admin'; activeToken = adminToken;
    } else if (clientToken && !isExpired(clientToken)) {
      portal = 'client'; activeToken = clientToken;
    } else if (adminToken) {
      portal = 'admin';
    } else if (clientToken) {
      portal = 'client';
    }

    if (portal && isExpired(activeToken)) {
      const refreshed = await attemptTokenRefresh(portal);
      if (refreshed) {
        activeToken = getToken(portal);
      } else {
        clearTokens(portal);
        _redirectToLogin(portal);
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${BASE}${path}`, { ...options, headers });

    if (res.status === 401 && !options?._retry && portal) {
      const refreshed = await attemptTokenRefresh(portal);
      if (refreshed) return apiFetch<T>(path, { ...options, _retry: true });
      clearTokens(portal);
      _redirectToLogin(portal);
      throw new Error('Session expired. Please log in again.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).detail || `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  // Public path — no auth header
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function _redirectToLogin(portal: 'admin' | 'client') {
  const target = portal === 'admin' ? '/admin/login' : '/client/login';
  if (window.location.pathname !== target) {
    window.location.href = target;
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const adminLogin = (username: string, password: string) =>
  apiFetch<{
    token: string; access_token: string; refresh_token: string;
    username: string; full_name: string; role: string; portal: string;
  }>('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const adminLogout = async () => {
  try { await apiFetch('/api/admin/logout', { method: 'POST' }); } finally {
    clearTokens('admin');
    window.location.href = '/admin/login';
  }
};

export const clientLogout = async () => {
  try { await apiFetch('/api/admin/client/logout', { method: 'POST' }); } finally {
    clearTokens('client');
    window.location.href = '/client/login';
  }
};

// ── Stats ─────────────────────────────────────────────────────────────────────
export const fetchStats = () => apiFetch<BackendStats>('/api/stats');

// ── Orders ────────────────────────────────────────────────────────────────────
export const fetchOrders = () => apiFetch<BackendOrder[]>('/api/requests');
export const createOrder = (body: NewOrderPayload) =>
  apiFetch<{ success: boolean; request_id: number; id: number; estimated_cost: number; status: string }>(
    '/api/requests/new', { method: 'POST', body: JSON.stringify(body) });
export const updateOrderStatus = (id: number, status: string, drone?: string, pilot?: string) =>
  apiFetch(`/api/requests/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, ...(drone ? { assigned_drone: drone } : {}), ...(pilot ? { assigned_pilot: pilot } : {}) }),
  });

// ── Fleet / Drones ────────────────────────────────────────────────────────────
export const fetchFleet = () => apiFetch<{ drones: BackendDrone[]; total: number }>('/api/fleet');

// ── Battery ───────────────────────────────────────────────────────────────────
export const fetchBatteries = () => apiFetch<{ batteries: BackendBattery[]; total: number }>('/api/battery/all');
export const logCharge = (droneId: string) =>
  apiFetch(`/api/battery/${droneId}/charge`, { method: 'POST', body: JSON.stringify({ flight_hours_delta: 0 }) });

// ── Weather ───────────────────────────────────────────────────────────────────
export const fetchWeather = (city = 'Chennai') =>
  apiFetch<BackendWeather>(`/api/weather?city=${encodeURIComponent(city)}`);
export const fetchAllCitiesWeather = () => apiFetch<BackendWeather[]>('/api/weather/all-cities');

// ── Scheduling ────────────────────────────────────────────────────────────────
export const fetchScheduledJobs = () => apiFetch<{ jobs: BackendJob[] }>('/api/schedule/jobs');
export const createJob = (body: NewJobPayload) =>
  apiFetch('/api/schedule/jobs', { method: 'POST', body: JSON.stringify(body) });
export const fetchPendingOrders = () => apiFetch<{ orders: BackendTracking[] }>('/api/schedule/pending-orders');
export const fetchAvailableDrones = () => apiFetch<{ drones: BackendAvailableDrone[] }>('/api/schedule/available-drones');

// ── Tracking ──────────────────────────────────────────────────────────────────
export const trackByBookingId = (bookingId: string) =>
  apiFetch<BackendTracking>(`/api/track/order/${bookingId}`);
export const trackByPhone = (phone: string) =>
  apiFetch<{ orders: BackendTracking[]; total: number }>(`/api/track/customer/${encodeURIComponent(phone)}`);
export const fetchAdminAllOrders = (status?: string) =>
  apiFetch<{ orders: BackendTracking[]; total: number }>(`/api/track/admin/all${status ? `?status=${status}` : ''}`);

// ── Admin ─────────────────────────────────────────────────────────────────────
export const fetchAdminSummary = () => apiFetch<BackendSummary>('/api/admin/summary');
export const fetchFarmers = () => apiFetch<BackendFarmer[]>('/api/farmers');

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BackendStats {
  total_services: number; total_bookings: number; active_requests: number;
  operational_hours: number; total_revenue: number; efficiency_rate: number;
  total_customers: number; total_farmers: number; orders_today: number;
  active_drones: number; satisfaction_rate: number;
}
export interface BackendOrder {
  id: number; farmer_name: string; phone: string; service_type: string;
  crop_type: string; area_hectares: number; location: string; field_location?: string;
  status: string; scheduled_date: string | null; scheduled_for?: string | null;
  created_date: string | null; created_at?: string | null; estimated_cost: number;
  assigned_drone: string; assigned_pilot: string; notes?: string; time_slot?: string;
}
export interface BackendDrone {
  id: number; drone_id: string; model: string; status: string; battery_level: number;
  pilot_name?: string; pilot?: string; current_location: string;
  flight_hours_today: number; total_flight_hours: number;
}
export interface BackendAvailableDrone {
  drone_id: string; model: string; pilot_name: string; status: string; is_available: boolean;
}
export interface BackendBattery {
  drone_id: string; drone_model: string; drone_status: string; cycle_count: number;
  max_cycles: number; cycles_remaining: number; health_percentage: number;
  alert_level: string; total_flight_hours: number; last_charged_at: string | null;
}
export interface BackendWeather {
  city: string; temperature: number; feels_like: number; temp_min: number; temp_max: number;
  humidity: number; wind_speed: number; wind_direction: string; wind_gust: number;
  visibility: number; pressure: number; condition: string; condition_icon: string;
  suitable_for_spraying: boolean; source: string; last_updated: string;
}
export interface BackendTracking {
  id: number; booking_id: string; customer_name: string; phone: string;
  status: string; status_label: string; location: string; area_hectares: number;
  crop_type: string; scheduled_date: string | null; created_date: string | null;
  assigned_drone: string; assigned_pilot: string; estimated_cost?: number; notes?: string;
}
export interface BackendSummary {
  total_orders: number; pending: number; in_progress: number; completed: number;
  total_revenue: number; total_farmers: number; total_drones: number;
  active_drones: number; critical_batteries: number; warning_batteries: number;
}
export interface BackendJob {
  id: number; service_request_id: number | null; drone_id: string; pilot_name: string;
  title: string; start: string | null; end: string | null; location: string;
  status: string; notes: string; color: string;
}
export interface BackendFarmer {
  id: number; name: string; phone: string; location: string; total_services: number;
  total_area_hectares: number; last_service: string | null; joined: string | null; total_spent: number;
}
export interface NewOrderPayload {
  farmer_name: string; phone: string; service_type: string; area_hectares: number;
  location: string; crop_type: string; scheduled_date?: string; time_slot?: string;
}
export interface NewJobPayload {
  service_request_id?: number; drone_id_str: string; pilot_name: string; title: string;
  scheduled_start: string; scheduled_end?: string; location?: string; notes?: string;
}