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
