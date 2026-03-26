import { useState, useEffect, useCallback } from 'react';
import {
  fetchStats, fetchOrders, fetchFleet, fetchBatteries,
  fetchWeather, fetchAllCitiesWeather, fetchAdminSummary,
  fetchAdminAllOrders, fetchScheduledJobs, fetchPendingOrders,
  fetchAvailableDrones, trackByBookingId, updateOrderStatus,
  type BackendOrder, type BackendDrone, type BackendBattery,
  type BackendTracking, type BackendAvailableDrone,
} from '../lib/api';
import { mapOrder, mapDrone, mapAvailableDrone, mapWeather, type MappedWeather } from '../lib/mappers';
import type { Order, Drone } from '../types';

// ─── Generic async hook ───────────────────────────────────────────────────────
function useAsync<T>(fn: () => Promise<T>, fallback: T, deps: unknown[] = []) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn()
      .then(result => { if (!cancelled) { setData(result); } })
      .catch((e: Error) => {
        if (!cancelled) {
          console.warn('[useApi] API error:', e.message);
          setError(e.message);
          // Keep fallback (empty/null) — do NOT fall back to mock data
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { const cancel = run(); return cancel; }, [run]);
  return { data, loading, error, refetch: run };
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export function useStats() {
  return useAsync(fetchStats, null);
}
export const useDashboardStats = useStats;

// ─── Orders ───────────────────────────────────────────────────────────────────
export function useOrders() {
  return useAsync<Order[]>(
    async () => {
      const res = await fetchOrders();
      const list = Array.isArray(res) ? res : (res as any).requests ?? [];
      return list.map((r: BackendOrder) => mapOrder(r));
    },
    []   // empty — no mock fallback
  );
}

// ─── Admin orders ─────────────────────────────────────────────────────────────
export function useAdminOrders(status?: string) {
  return useAsync<Order[]>(
    async () => {
      const res = await fetchAdminAllOrders(status);
      return (res.orders ?? []).map((r: BackendTracking) => mapOrder(r));
    },
    [],
    [status]
  );
}

// ─── Drones (fleet + battery merged) ─────────────────────────────────────────
export function useDrones() {
  return useAsync<Drone[]>(
    async () => {
      const [fleetRes, batRes] = await Promise.all([fetchFleet(), fetchBatteries()]);
      const batteryMap: Record<string, BackendBattery> = Object.fromEntries(
        (batRes.batteries ?? []).map(b => [b.drone_id, b])
      );
      return (fleetRes.drones ?? []).map((d: BackendDrone) =>
        mapDrone(d, batteryMap[d.drone_id])
      );
    },
    []
  );
}

// ─── Weather (single city) ────────────────────────────────────────────────────
const WEATHER_EMPTY: MappedWeather = {
  city: 'Chennai',
  temp: 0,
  humidity: 0,
  windSpeed: 0,
  rainChance: 0,
  suitability: 'Safe',
  condition: '--',
  wind_direction: '--',
  feels_like: 0,
  visibility: 0,
  pressure: 0,
  suitable_for_spraying: true,
  last_updated: '',
};

export function useWeather(city = 'Chennai') {
  return useAsync<MappedWeather>(
    async () => mapWeather(await fetchWeather(city)),
    { ...WEATHER_EMPTY, city },
    [city]
  );
}

// ─── All Tamil Nadu cities weather ───────────────────────────────────────────
export function useAllCitiesWeather() {
  return useAsync<MappedWeather[]>(
    async () => {
      const all = await fetchAllCitiesWeather();
      return (Array.isArray(all) ? all : []).map(mapWeather);
    },
    []
  );
}

// ─── Admin summary ────────────────────────────────────────────────────────────
export function useAdminSummary() {
  return useAsync(fetchAdminSummary, null);
}

// ─── Scheduled jobs ───────────────────────────────────────────────────────────
export function useScheduledJobs() {
  return useAsync(
    async () => {
      const res = await fetchScheduledJobs();
      return res.jobs ?? [];
    },
    []
  );
}

// ─── Pending orders ───────────────────────────────────────────────────────────
export function usePendingOrders() {
  return useAsync<Order[]>(
    async () => {
      const res = await fetchPendingOrders();
      const list = (res as any).orders ?? (Array.isArray(res) ? res : []);
      return list.map((r: BackendTracking) => mapOrder(r));
    },
    []
  );
}

// ─── Available drones ─────────────────────────────────────────────────────────
export function useAvailableDrones() {
  return useAsync<(Drone & { pilot_name: string; is_available: boolean })[]>(
    async () => {
      const res = await fetchAvailableDrones();
      const list: BackendAvailableDrone[] = (res as any).drones ?? (Array.isArray(res) ? res : []);
      return list.map(d => ({
        ...mapAvailableDrone(d),
        pilot_name: d.pilot_name,
        is_available: d.is_available,
      }));
    },
    []
  );
}

// ─── Track by booking ID ──────────────────────────────────────────────────────
export function useTrackOrder(bookingId: string) {
  return useAsync<Order | null>(
    async () => {
      if (!bookingId) return null;
      return mapOrder(await trackByBookingId(bookingId));
    },
    null,
    [bookingId]
  );
}

// ─── Re-export imperative helpers ─────────────────────────────────────────────
export { updateOrderStatus };
