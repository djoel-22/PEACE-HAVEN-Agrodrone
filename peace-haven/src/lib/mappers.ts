// mappers.ts — converts backend field names → frontend types
import type { Order, Drone, WeatherData } from '../types';
import type {
  BackendOrder, BackendDrone, BackendBattery,
  BackendWeather, BackendTracking, BackendAvailableDrone,
} from './api';

const STATUS_MAP: Record<string, Order['status']> = {
  pending:     'Placed',
  scheduled:   'Scheduled',
  in_progress: 'In Progress',
  completed:   'Completed',
};

export function mapOrder(r: BackendOrder | BackendTracking): Order {
  const raw = r as any;
  return {
    id:           raw.booking_id ?? `AGR${String(raw.id).padStart(4, '0')}`,
    customerName: raw.farmer_name ?? raw.customer_name ?? 'Unknown',
    phone:        raw.phone ?? '',
    cropType:     raw.crop_type ?? raw.service_type ?? '',
    area:         raw.area_hectares != null ? `${raw.area_hectares} ha` : '',
    location:     raw.field_location ?? raw.location ?? '',
    status:       STATUS_MAP[raw.status] ?? 'Placed',
    date: (raw.scheduled_date ?? raw.scheduled_for)
      ? (raw.scheduled_date ?? raw.scheduled_for).split('T')[0]
      : (raw.created_date ?? raw.created_at ?? '').split('T')[0],
    droneId:      raw.assigned_drone || undefined,
    scheduledTime: (raw.scheduled_date ?? raw.scheduled_for)
      ? new Date(raw.scheduled_date ?? raw.scheduled_for)
          .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : undefined,
  };
}

export function mapDrone(d: BackendDrone, b?: BackendBattery): Drone {
  const s = d.status ?? '';
  return {
    id:          d.drone_id,
    model:       d.model ?? 'Unknown',
    status:      s === 'active' ? 'In Use' : s === 'standby' ? 'Available' : 'Maintenance',
    battery:     b ? b.health_percentage : (d.battery_level ?? 0),
    cycleCount:  b?.cycle_count ?? 0,
    health:      b?.health_percentage ?? (d.battery_level ?? 0),
    lastCharged: b?.last_charged_at
      ? new Date(b.last_charged_at).toLocaleString('en-IN')
      : 'N/A',
  };
}

export function mapAvailableDrone(d: BackendAvailableDrone): Drone {
  return {
    id:          d.drone_id,
    model:       d.model ?? 'Unknown',
    status:      d.status === 'active' ? 'In Use' : d.status === 'standby' ? 'Available' : 'Maintenance',
    battery:     0,
    cycleCount:  0,
    health:      0,
    lastCharged: 'N/A',
  };
}

export type MappedWeather = WeatherData & {
  city: string;
  condition: string;
  wind_direction: string;
  feels_like: number;
  visibility: number;
  pressure: number;
  suitable_for_spraying: boolean;
  last_updated: string;
};

export function mapWeather(w: BackendWeather): MappedWeather {
  const suitable = w.suitable_for_spraying;
  const suitability: WeatherData['suitability'] = !suitable
    ? 'Not Recommended'
    : w.wind_speed >= 12 ? 'Moderate'
    : 'Safe';

  return {
    city:                  w.city,
    temp:                  w.temperature,
    humidity:              w.humidity,
    windSpeed:             w.wind_speed,
    rainChance:            Math.round(w.humidity * 0.35),
    suitability,
    condition:             w.condition,
    wind_direction:        w.wind_direction,
    feels_like:            w.feels_like,
    visibility:            w.visibility,
    pressure:              w.pressure,
    suitable_for_spraying: w.suitable_for_spraying,
    last_updated:          w.last_updated,
  };
}
