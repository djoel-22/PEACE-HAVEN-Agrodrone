// mockData.ts
// ─────────────────────────────────────────────────────────────────────────────
// All mock data removed. This file is kept only to avoid breaking any legacy
// imports. All data now comes live from the backend API via useApi hooks.
// ─────────────────────────────────────────────────────────────────────────────
import type { Order, Drone, WeatherData } from './types';

export const MOCK_ORDERS: Order[] = [];

export const MOCK_DRONES: Drone[] = [];

export const MOCK_WEATHER: WeatherData = {
  temp: 0,
  humidity: 0,
  windSpeed: 0,
  rainChance: 0,
  suitability: 'Safe',
};
