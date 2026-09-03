// ------------------------------------------------------------------
// Core domain models (aligned with backend schemas)
// ------------------------------------------------------------------

export interface Machine {
  id: number;
  factory_id: number;
  name: string;
  machine_type: string;
  power_kw: number;
  min_run_minutes: number;
  setup_minutes: number;
  shiftable: boolean;
  priority: number;
  available_from: string;
  available_to: string;
  status: 'running' | 'idle' | 'maintenance' | 'offline';
  manufacturer?: string | null;
  model_name?: string | null;
  maintenance_windows?: string[] | null;
  created_at?: string;
}

export interface ProductionOrder {
  id: number;
  factory_id: number;
  order_no: string;
  process: string;
  quantity: number;
  duration_minutes: number;
  earliest_start?: string | null;
  deadline: string;
  priority: number;
  machine_options?: number[] | null;
  locked: boolean;
  status: 'pending' | 'running' | 'completed' | 'in_progress';
  created_at?: string;
}

export interface TariffPeriod {
  id: number;
  category: string;
  period_name: string;
  start_time: string;
  end_time: string;
  rate_pkr_per_kwh: number;
  fixed_charge_pkr_per_kw: number;
  effective_from: string;
  source?: string;
}

export interface Factory {
  id: number;
  name: string;
  location: string;
  tariff_category: string;
  sanctioned_load_kw: number;
  solar_capacity_kw: number;
  operating_hours: string;
  working_days: string;
  created_at?: string;
}

export interface MeterReading {
  id: number;
  factory_id: number;
  timestamp: string;
  kwh: number;
  kw: number;
  solar_kwh: number;
  voltage?: number;
  current?: number;
  power_factor?: number;
}

export interface Alert {
  id: number;
  factory_id: number;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  value?: number;
  threshold?: number;
  is_resolved: boolean;
  created_at: string;
  resolved_at?: string | null;
}

// ------------------------------------------------------------------
// Dashboard / KPI types
// ------------------------------------------------------------------

export interface KPI {
  daily_cost: number;
  peak_demand_kw: number;
  solar_utilization: number;
  orders_on_time: number;
}

export interface EnergyReading {
  time: string;
  grid_kw: number;
  solar_kw: number;
}

export interface DashboardSummary {
  totals: {
    factories: number;
    machines: number;
    orders: number;
    tariffs: number;
    meter_readings: number;
  };
  order_status: {
    pending: number;
    running: number;
    completed: number;
  };
}

export interface FactoryDashboard {
  factory: Factory;
  counts: {
    machines: number;
    orders: number;
  };
  energy: {
    total_kwh: number;
    peak_kw: number;
    total_solar_kwh: number;
  };
}

// ------------------------------------------------------------------
// Forecast types
// ------------------------------------------------------------------

export interface SolarEstimate {
  timestamp: string;
  solar_kw: number;
  solar_kwh: number;
  temperature_c?: number;
  shortwave_radiation_wm2?: number;
}

export interface SolarForecast {
  factory_id: number;
  start_time: string;
  end_time: string;
  total_solar_kwh: number;
  peak_solar_kw: number;
  solar_capacity_kw: number;
  system_efficiency: number;
  hourly: SolarEstimate[];
}

export interface LoadPrediction {
  timestamp: string;
  predicted_kwh: number;
  predicted_kw: number;
}

export interface LoadForecast {
  factory_id: number;
  start_time: string;
  hours: number;
  total_predicted_kwh: number;
  peak_predicted_kw: number;
  model: string;
  hourly: LoadPrediction[];
}

export interface DemandRiskSlot {
  timestamp: string;
  grid_kw: number;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
}

export interface DemandRiskForecast {
  factory_id: number;
  hours: number;
  sanctioned_load_kw: number;
  overall_risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  peak_grid_kw: number;
  slots: DemandRiskSlot[];
  source: string;
}

// ------------------------------------------------------------------
// Weather forecast types
// ------------------------------------------------------------------

export interface WeatherDayForecast {
  date: string;
  temp_high: number | null;
  temp_low: number | null;
  avg_cloud_cover: number;
  precipitation_mm: number;
  avg_humidity: number | null;
  avg_wind_speed: number | null;
  estimated_solar_kwh: number;
  solar_quality: 'good' | 'moderate' | 'poor';
  condition: 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy';
}

export interface WeatherForecast {
  factory_id: number;
  forecast_days: number;
  solar_capacity_kw: number;
  daily: WeatherDayForecast[];
}

// ------------------------------------------------------------------
// Optimization types
// ------------------------------------------------------------------

export interface ScheduledJob {
  order_id: number;
  order_no: string;
  process: string;
  quantity: number;
  machine_id: number;
  machine_name: string;
  machine_power_kw: number;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  slots: string[];
  estimated_cost: number;
  estimated_kwh: number;
  grid_kwh: number;
  solar_kwh: number;
  priority: number;
  locked: boolean;
}

export interface OptimizedSchedule {
  factory_id: number;
  start_time: string;
  end_time: string;
  total_orders_scheduled: number;
  total_estimated_cost: number;
  total_estimated_kwh: number;
  total_grid_kwh: number;
  total_solar_kwh: number;
  peak_grid_kw: number;
  average_rate: number;
  solver_status: string;
  schedule: ScheduledJob[];
}

export interface ScheduleComparison {
  baseline: {
    total_cost: number;
    total_kwh: number;
    total_grid_kwh: number;
    total_solar_kwh: number;
    schedule: ScheduledJob[];
  };
  optimized: {
    total_cost: number;
    total_kwh: number;
    total_grid_kwh: number;
    total_solar_kwh: number;
    peak_grid_kw: number;
    solver_status: string;
  };
  savings: {
    amount: number;
    percentage: number;
  };
  schedule: ScheduledJob[];
}

// ------------------------------------------------------------------
// AI explanation types
// ------------------------------------------------------------------

export interface AIExplanation {
  factory_id: number;
  start_time: string;
  end_time: string;
  comparison?: ScheduleComparison;
  schedule_result?: OptimizedSchedule;
  ai_explanation: string;
  ai_model: string;
  tokens_used: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  warning?: string;
}

export interface AIStatus {
  available: boolean;
  model: string | null;
  message: string;
}

// ------------------------------------------------------------------
// Auth types
// ------------------------------------------------------------------

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'owner' | 'manager' | 'supervisor';
  factory_id?: number;
}

export interface AuthToken {
  access_token: string;
  user: User;
}
