import { Machine, ProductionOrder, TariffPeriod, KPI, Alert, EnergyReading } from '../types';

export const mockMachines: Machine[] = [
  { id: 1, name: 'Spinning Unit 1', type: 'Spinning', power_kw: 150, status: 'running' },
  { id: 2, name: 'Spinning Unit 2', type: 'Spinning', power_kw: 150, status: 'idle' },
  { id: 3, name: 'Weaving Loom A', type: 'Weaving', power_kw: 80, status: 'running' },
  { id: 4, name: 'Weaving Loom B', type: 'Weaving', power_kw: 80, status: 'maintenance' },
  { id: 5, name: 'Dyeing Machine 1', type: 'Dyeing', power_kw: 200, status: 'idle' },
  { id: 6, name: 'Dyeing Machine 2', type: 'Dyeing', power_kw: 200, status: 'offline' },
  { id: 7, name: 'Finishing Line 1', type: 'Finishing', power_kw: 120, status: 'running' },
  { id: 8, name: 'Packaging Unit', type: 'Packaging', power_kw: 40, status: 'running' },
];

export const mockOrders: ProductionOrder[] = [
  { id: 101, order_no: 'ORD-1001', process: 'Spinning', quantity: 5000, duration_minutes: 360, deadline: '2023-11-01', status: 'running' },
  { id: 102, order_no: 'ORD-1002', process: 'Weaving', quantity: 2000, duration_minutes: 480, deadline: '2023-11-02', status: 'pending' },
  { id: 103, order_no: 'ORD-1003', process: 'Dyeing', quantity: 3000, duration_minutes: 240, deadline: '2023-11-01', status: 'completed' },
  { id: 104, order_no: 'ORD-1004', process: 'Finishing', quantity: 1500, duration_minutes: 180, deadline: '2023-11-03', status: 'running' },
  { id: 105, order_no: 'ORD-1005', process: 'Spinning', quantity: 6000, duration_minutes: 420, deadline: '2023-11-04', status: 'pending' },
  { id: 106, order_no: 'ORD-1006', process: 'Weaving', quantity: 2500, duration_minutes: 540, deadline: '2023-11-05', status: 'pending' },
  { id: 107, order_no: 'ORD-1007', process: 'Packaging', quantity: 8000, duration_minutes: 120, deadline: '2023-11-02', status: 'pending' },
  { id: 108, order_no: 'ORD-1008', process: 'Dyeing', quantity: 1000, duration_minutes: 150, deadline: '2023-11-06', status: 'pending' },
  { id: 109, order_no: 'ORD-1009', process: 'Finishing', quantity: 4000, duration_minutes: 300, deadline: '2023-11-07', status: 'pending' },
];

export const mockTariffs: TariffPeriod[] = [
  { id: 1, period_name: 'Off-Peak', start_time: '00:00', end_time: '17:00', rate_pkr_per_kwh: 25 },
  { id: 2, period_name: 'Peak', start_time: '17:00', end_time: '22:00', rate_pkr_per_kwh: 45 },
  { id: 3, period_name: 'Off-Peak', start_time: '22:00', end_time: '23:59', rate_pkr_per_kwh: 25 },
];

export const mockKPIs: KPI = {
  daily_cost: 145000,
  peak_demand_kw: 680,
  solar_utilization: 85,
  orders_on_time: 92,
};

export const mockAlerts: Alert[] = [
  { id: 1, type: 'critical', message: 'Approaching maximum demand limit (700kW) in 15 mins.', timestamp: '10:45 AM' },
  { id: 2, type: 'warning', message: 'Spinning Unit 2 scheduled for maintenance tomorrow.', timestamp: '09:30 AM' },
  { id: 3, type: 'info', message: 'Solar generation peak reached for the day.', timestamp: '12:15 PM' },
  { id: 4, type: 'warning', message: 'Peak tariff period begins in 30 minutes.', timestamp: '04:30 PM' },
];

// Generate 24 hours of mock energy data
export const mockEnergyData: EnergyReading[] = Array.from({ length: 24 }).map((_, i) => {
  const isPeak = i >= 17 && i < 22;
  const isSolarTime = i >= 8 && i <= 16;
  const solarGen = isSolarTime ? Math.sin((i - 8) / 8 * Math.PI) * 200 : 0;
  const baseLoad = isPeak ? 150 : 350;
  const randomVariance = Math.random() * 50;
  
  return {
    time: `${i.toString().padStart(2, '0')}:00`,
    grid_kw: Math.max(0, baseLoad + randomVariance - solarGen),
    solar_kw: solarGen,
  };
});
