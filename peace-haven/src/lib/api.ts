// api.ts — single source of truth for all backend calls
//
// In production (Vercel), set VITE_API_BASE_URL to your backend URL, e.g.:
//   VITE_API_BASE_URL=https://agrodrone-api.vercel.app
//
// In local dev, leave it empty — the Vite proxy forwards /api → localhost:8000
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export const fetchStats = () => apiFetch<BackendStats>('/api/stats');

// ─── Orders ──────────────────────────────────────────────────────────────────
// NOTE: /api/requests returns a PLAIN ARRAY, not {requests:[...]}
export const fetchOrders = () => apiFetch<BackendOrder[]>('/api/requests');

export const createOrder = (body: NewOrderPayload) =>
  apiFetch<{ success: boolean; request_id: number; id: number; estimated_cost: number; status: string }>(
    '/api/requests/new', { method: 'POST', body: JSON.stringify(body) }
  );

export const updateOrderStatus = (id: number, status: string, drone?: string, pilot?: string) =>
  apiFetch(`/api/requests/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({
      status,
      ...(drone ? { assigned_drone: drone } : {}),
      ...(pilot ? { assigned_pilot: pilot } : {}),
    }),
  });

// ─── Fleet / Drones ──────────────────────────────────────────────────────────
export const fetchFleet = () =>
  apiFetch<{ drones: BackendDrone[]; total: number }>('/api/fleet');

// ─── Battery ─────────────────────────────────────────────────────────────────
export const fetchBatteries = () =>
  apiFetch<{ batteries: BackendBattery[]; total: number }>('/api/battery/all');

export const logCharge = (droneId: string) =>
  apiFetch(`/api/battery/${droneId}/charge`, {
    method: 'POST',
    body: JSON.stringify({ flight_hours_delta: 0 }),
  });

// ─── Weather ─────────────────────────────────────────────────────────────────
export const fetchWeather = (city = 'Chennai') =>
  apiFetch<BackendWeather>(`/api/weather?city=${encodeURIComponent(city)}`);

export const fetchAllCitiesWeather = () =>
  apiFetch<BackendWeather[]>('/api/weather/all-cities');

// ─── Scheduling ───────────────────────────────────────────────────────────────
export const fetchScheduledJobs = () =>
  apiFetch<{ jobs: BackendJob[] }>('/api/schedule/jobs');

// NOTE: Backend JobCreate model expects: service_request_id, drone_id_str, pilot_name, title, scheduled_start, scheduled_end
export const createJob = (body: NewJobPayload) =>
  apiFetch('/api/schedule/jobs', { method: 'POST', body: JSON.stringify(body) });

// NOTE: /api/schedule/pending-orders returns {orders:[...]}
export const fetchPendingOrders = () =>
  apiFetch<{ orders: BackendTracking[] }>('/api/schedule/pending-orders');

// NOTE: /api/schedule/available-drones returns {drones:[...]}
export const fetchAvailableDrones = () =>
  apiFetch<{ drones: BackendAvailableDrone[] }>('/api/schedule/available-drones');

// ─── Tracking ─────────────────────────────────────────────────────────────────
export const trackByBookingId = (bookingId: string) =>
  apiFetch<BackendTracking>(`/api/track/order/${bookingId}`);

export const trackByPhone = (phone: string) =>
  apiFetch<{ orders: BackendTracking[]; total: number }>(
    `/api/track/customer/${encodeURIComponent(phone)}`
  );

export const fetchAdminAllOrders = (status?: string) =>
  apiFetch<{ orders: BackendTracking[]; total: number }>(
    `/api/track/admin/all${status ? `?status=${status}` : ''}`
  );

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminLogin = (username: string, password: string) =>
  apiFetch<{ token: string; username: string; role: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const fetchAdminSummary = () => apiFetch<BackendSummary>('/api/admin/summary');

export const fetchFarmers = () => apiFetch<BackendFarmer[]>('/api/farmers');

// ─── Backend Types ────────────────────────────────────────────────────────────

export interface BackendStats {
  total_services: number;
  total_bookings: number;
  active_requests: number;
  operational_hours: number;
  total_revenue: number;
  efficiency_rate: number;
  total_customers: number;
  total_farmers: number;
  orders_today: number;
  active_drones: number;
  satisfaction_rate: number;
}

export interface BackendOrder {
  id: number;
  farmer_name: string;
  phone: string;
  service_type: string;
  crop_type: string;
  area_hectares: number;
  location: string;
  field_location?: string;
  status: string;
  scheduled_date: string | null;
  scheduled_for?: string | null;
  created_date: string | null;
  created_at?: string | null;
  estimated_cost: number;
  assigned_drone: string;
  assigned_pilot: string;
  notes?: string;
  time_slot?: string;
}

export interface BackendDrone {
  id: number;
  drone_id: string;
  model: string;
  status: string;
  battery_level: number;
  pilot_name?: string;
  pilot?: string;
  current_location: string;
  flight_hours_today: number;
  total_flight_hours: number;
}

export interface BackendAvailableDrone {
  drone_id: string;
  model: string;
  pilot_name: string;
  status: string;
  is_available: boolean;
}

export interface BackendBattery {
  drone_id: string;
  drone_model: string;
  drone_status: string;
  cycle_count: number;
  max_cycles: number;
  cycles_remaining: number;
  health_percentage: number;
  alert_level: string;
  total_flight_hours: number;
  last_charged_at: string | null;
}

export interface BackendWeather {
  city: string;
  temperature: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  wind_speed: number;
  wind_direction: string;
  wind_gust: number;
  visibility: number;
  pressure: number;
  condition: string;
  condition_icon: string;
  suitable_for_spraying: boolean;
  source: string;
  last_updated: string;
}

export interface BackendTracking {
  id: number;
  booking_id: string;
  customer_name: string;
  phone: string;
  status: string;
  status_label: string;
  location: string;
  area_hectares: number;
  crop_type: string;
  scheduled_date: string | null;
  created_date: string | null;
  assigned_drone: string;
  assigned_pilot: string;
  estimated_cost?: number;
  notes?: string;
}

export interface BackendSummary {
  total_orders: number;
  pending: number;
  in_progress: number;
  completed: number;
  total_revenue: number;
  total_farmers: number;
  total_drones: number;
  active_drones: number;
  critical_batteries: number;
  warning_batteries: number;
}

export interface BackendJob {
  id: number;
  service_request_id: number | null;
  drone_id: string;
  pilot_name: string;
  title: string;
  start: string | null;
  end: string | null;
  location: string;
  status: string;
  notes: string;
  color: string;
}

export interface BackendFarmer {
  id: number;
  name: string;
  phone: string;
  location: string;
  total_services: number;
  total_area_hectares: number;
  last_service: string | null;
  joined: string | null;
  total_spent: number;
}

export interface NewOrderPayload {
  farmer_name: string;
  phone: string;
  service_type: string;
  area_hectares: number;
  location: string;
  crop_type: string;
  scheduled_date?: string;
  time_slot?: string;
}

export interface NewJobPayload {
  service_request_id?: number;
  drone_id_str: string;
  pilot_name: string;
  title: string;
  scheduled_start: string;
  scheduled_end?: string;
  location?: string;
  notes?: string;
}
