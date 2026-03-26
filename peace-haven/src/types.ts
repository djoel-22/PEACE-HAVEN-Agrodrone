export type OrderStatus = 'Placed' | 'Scheduled' | 'In Progress' | 'Completed';

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  cropType: string;
  area: string;
  location: string;
  status: OrderStatus;
  date: string;
  droneId?: string;
  scheduledTime?: string;
}

export interface Drone {
  id: string;
  model: string;
  status: 'Available' | 'In Use' | 'Maintenance';
  battery: number;
  cycleCount: number;
  health: number;
  lastCharged: string;
}

export interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  rainChance: number;
  suitability: 'Safe' | 'Moderate' | 'Not Recommended';
}
