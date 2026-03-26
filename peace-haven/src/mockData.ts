import { Order, Drone, WeatherData } from './types';

export const MOCK_ORDERS: Order[] = [
  {
    id: 'PH0001',
    customerName: 'John Doe',
    phone: '+91 9876543210',
    cropType: 'Paddy',
    area: '5 Acres',
    location: 'Green Valley Farm, Sector 4',
    status: 'Completed',
    date: '2024-03-20',
    droneId: 'DR-01',
    scheduledTime: '10:00 AM'
  },
  {
    id: 'PH0002',
    customerName: 'Jane Smith',
    phone: '+91 8765432109',
    cropType: 'Wheat',
    area: '10 Hectares',
    location: 'Sunrise Fields, Block B',
    status: 'Scheduled',
    date: '2024-03-25',
    droneId: 'DR-02',
    scheduledTime: '08:30 AM'
  },
  {
    id: 'PH0003',
    customerName: 'Robert Brown',
    phone: '+91 7654321098',
    cropType: 'Cotton',
    area: '3 Acres',
    location: 'River Side Farm',
    status: 'In Progress',
    date: '2024-03-24',
    droneId: 'DR-01',
    scheduledTime: '02:00 PM'
  }
];

export const MOCK_DRONES: Drone[] = [
  {
    id: 'DR-01',
    model: 'Agri-X100',
    status: 'In Use',
    battery: 45,
    cycleCount: 120,
    health: 88,
    lastCharged: '2024-03-24 06:00 AM'
  },
  {
    id: 'DR-02',
    model: 'Agri-X100',
    status: 'Available',
    battery: 95,
    cycleCount: 45,
    health: 98,
    lastCharged: '2024-03-24 07:30 AM'
  },
  {
    id: 'DR-03',
    model: 'Agri-Pro 500',
    status: 'Maintenance',
    battery: 12,
    cycleCount: 350,
    health: 55,
    lastCharged: '2024-03-23 09:00 PM'
  }
];

export const MOCK_WEATHER: WeatherData = {
  temp: 28,
  humidity: 65,
  windSpeed: 8,
  rainChance: 10,
  suitability: 'Safe'
};
