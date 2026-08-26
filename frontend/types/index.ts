export interface Machine {
  id: number;
  name: string;
  type: string;
  power_kw: number;
  status: 'running' | 'idle' | 'maintenance' | 'offline';
}

export interface ProductionOrder {
  id: number;
  order_no: string;
  process: string;
  quantity: number;
  duration_minutes: number;
  deadline: string;
  status: 'pending' | 'running' | 'completed';
}

export interface TariffPeriod {
  id: number;
  period_name: string;
  start_time: string;
  end_time: string;
  rate_pkr_per_kwh: number;
}

export interface KPI {
  daily_cost: number;
  peak_demand_kw: number;
  solar_utilization: number;
  orders_on_time: number;
}

export interface Alert {
  id: number;
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: string;
}

export interface EnergyReading {
  time: string;
  grid_kw: number;
  solar_kw: number;
}
