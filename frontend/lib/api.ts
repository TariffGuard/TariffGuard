// TariffGuard API client
// All calls are authenticated via Bearer token stored in localStorage.

import {
  Machine,
  ProductionOrder,
  TariffPeriod,
  Factory,
  MeterReading,
  Alert,
  DashboardSummary,
  FactoryDashboard,
  SolarForecast,
  LoadForecast,
  DemandRiskForecast,
  WeatherForecast,
  OptimizedSchedule,
  ScheduleComparison,
  AIExplanation,
  AIStatus,
  User,
  AuthToken,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ------------------------------------------------------------------
// Low-level fetch helper
// ------------------------------------------------------------------

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("You don't have permission to perform this action.");
    }
    if (response.status === 401) {
      throw new Error('Please login again.');
    }

    const errorBody = await response.text();
    let errorMessage = `API Error: ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.detail) {
        errorMessage = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
      }
    } catch (e) {
      // Ignore parse error
    }
    throw new Error(errorMessage);
  }

  // Handle empty bodies (e.g., 204 No Content)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------

export const authApi = {
  login: (username: string, password: string) =>
    fetchApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }) as Promise<AuthToken>,

  register: (username: string, email: string, password: string, role: string) =>
    fetchApi('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, role }),
    }) as Promise<User>,

  logout: () =>
    fetchApi('/api/auth/logout', { method: 'POST' }),
};

// ------------------------------------------------------------------
// Factories
// ------------------------------------------------------------------

export const factoryApi = {
  list: () => fetchApi('/api/factories/') as Promise<Factory[]>,
  get: (id: number) => fetchApi(`/api/factories/${id}`) as Promise<Factory>,
  update: (id: number, data: Partial<Factory>) =>
    fetchApi(`/api/factories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<Factory>,
};

// ------------------------------------------------------------------
// Machines
// ------------------------------------------------------------------

export const machineApi = {
  list: (factoryId: number) =>
    fetchApi(`/api/machines/?factory_id=${factoryId}`) as Promise<Machine[]>,

  create: (data: Omit<Machine, 'id' | 'created_at'>) =>
    fetchApi('/api/machines/', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Machine>,

  delete: (id: number) =>
    fetchApi(`/api/machines/${id}`, { method: 'DELETE' }),
};

// ------------------------------------------------------------------
// Production Orders
// ------------------------------------------------------------------

export const orderApi = {
  list: (factoryId: number, status?: string) => {
    let url = `/api/orders/?factory_id=${factoryId}`;
    if (status) url += `&status=${status}`;
    return fetchApi(url) as Promise<ProductionOrder[]>;
  },

  create: (data: Omit<ProductionOrder, 'id' | 'created_at' | 'status'>) =>
    fetchApi('/api/orders/', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<ProductionOrder>,

  delete: (id: number) =>
    fetchApi(`/api/orders/${id}`, { method: 'DELETE' }),

  update: (id: number, data: { locked?: boolean; status?: string; priority?: number }) =>
    fetchApi(`/api/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<ProductionOrder>,
};

// ------------------------------------------------------------------
// Tariffs
// ------------------------------------------------------------------

export const tariffApi = {
  list: () => fetchApi('/api/tariffs/') as Promise<TariffPeriod[]>,
  create: (data: Omit<TariffPeriod, 'id'>) =>
    fetchApi('/api/tariffs/', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<TariffPeriod>,
  update: (id: number, data: Partial<TariffPeriod>) =>
    fetchApi(`/api/tariffs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<TariffPeriod>,
  delete: (id: number) =>
    fetchApi(`/api/tariffs/${id}`, { method: 'DELETE' }),
};

// ------------------------------------------------------------------
// Meter Readings
// ------------------------------------------------------------------

export const meterApi = {
  list: (factoryId: number, startDate?: string, endDate?: string, limit = 1000) => {
    let url = `/api/meter-readings/?factory_id=${factoryId}&limit=${limit}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    return fetchApi(url) as Promise<MeterReading[]>;
  },

  stats: (factoryId: number) =>
    fetchApi(`/api/meter-readings/stats/${factoryId}`) as Promise<{
      total_readings: number;
      total_kwh: number;
      avg_kwh: number;
      peak_kw: number;
      total_solar_kwh: number;
    }>,
};

// ------------------------------------------------------------------
// Alerts
// ------------------------------------------------------------------

export const alertApi = {
  list: (factoryId?: number, isResolved?: boolean, severity?: string) => {
    let url = '/api/alerts/?';
    const params: string[] = [];
    if (factoryId !== undefined) params.push(`factory_id=${factoryId}`);
    if (isResolved !== undefined) params.push(`is_resolved=${isResolved}`);
    if (severity) params.push(`severity=${severity}`);
    return fetchApi(url + params.join('&')) as Promise<Alert[]>;
  },

  unresolved: (factoryId: number) =>
    fetchApi(`/api/alerts/unresolved/${factoryId}`) as Promise<Alert[]>,

  stats: (factoryId: number) =>
    fetchApi(`/api/alerts/stats/${factoryId}`) as Promise<{
      total: number;
      unresolved: number;
      critical: number;
      resolved: number;
    }>,

  resolve: (id: number) =>
    fetchApi(`/api/alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_resolved: true }),
    }) as Promise<Alert>,

  generate: (factoryId: number) =>
    fetchApi(`/api/alerts/generate/${factoryId}`, { method: 'POST' }) as Promise<Alert[]>,
};

// ------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------

export const dashboardApi = {
  summary: () => fetchApi('/api/dashboard/summary') as Promise<DashboardSummary>,
  factory: (factoryId: number) =>
    fetchApi(`/api/dashboard/factory/${factoryId}`) as Promise<FactoryDashboard>,
};

// ------------------------------------------------------------------
// Forecasts (AI/ML)
// ------------------------------------------------------------------

export const forecastApi = {
  solar: (factoryId: number, start?: string, end?: string) => {
    let url = `/api/forecast/solar/${factoryId}`;
    const params: string[] = [];
    if (start) params.push(`start_time=${encodeURIComponent(start)}`);
    if (end) params.push(`end_time=${encodeURIComponent(end)}`);
    if (params.length) url += `?${params.join('&')}`;
    return fetchApi(url, { method: 'POST' }) as Promise<SolarForecast>;
  },

  solarProfile: (factoryId: number, daysBack = 30) =>
    fetchApi(`/api/forecast/solar/${factoryId}/profile?days_back=${daysBack}`, {
      method: 'POST',
    }) as Promise<{ factory_id: number; days_analyzed: number; hourly_avg_solar_kw: Record<string, number> }>,

  load: (factoryId: number, hours = 24, start?: string) => {
    let url = `/api/forecast/load/${factoryId}?hours=${hours}`;
    if (start) url += `&start_time=${encodeURIComponent(start)}`;
    return fetchApi(url, { method: 'POST' }) as Promise<LoadForecast>;
  },

  demandRisk: (factoryId: number, hours = 24) =>
    fetchApi(`/api/forecast/demand-risk/${factoryId}?hours=${hours}`, {
      method: 'POST',
    }) as Promise<DemandRiskForecast>,

  weather: (factoryId: number, days = 7) =>
    fetchApi(`/api/forecast/weather/${factoryId}?days=${days}`) as Promise<WeatherForecast>,
};

// ------------------------------------------------------------------
// Optimization (AI/ML)
// ------------------------------------------------------------------

export const optimizeApi = {
  schedule: (factoryId: number, start?: string, end?: string) => {
    let url = `/api/optimize/schedule/${factoryId}`;
    const params: string[] = [];
    if (start) params.push(`start_time=${encodeURIComponent(start)}`);
    if (end) params.push(`end_time=${encodeURIComponent(end)}`);
    if (params.length) url += `?${params.join('&')}`;
    return fetchApi(url, { method: 'POST' }) as Promise<OptimizedSchedule>;
  },

  compare: (factoryId: number, start?: string, end?: string) => {
    let url = `/api/optimize/compare/${factoryId}`;
    const params: string[] = [];
    if (start) params.push(`start_time=${encodeURIComponent(start)}`);
    if (end) params.push(`end_time=${encodeURIComponent(end)}`);
    if (params.length) url += `?${params.join('&')}`;
    return fetchApi(url, { method: 'POST' }) as Promise<ScheduleComparison>;
  },
};

// ------------------------------------------------------------------
// AI Explanations (Qwen)
// ------------------------------------------------------------------

export const aiApi = {
  status: () => fetchApi('/api/ai/status') as Promise<AIStatus>,

  explainComparison: (factoryId: number, start?: string, end?: string) => {
    let url = `/api/ai/explain/${factoryId}`;
    const params: string[] = [];
    if (start) params.push(`start_time=${encodeURIComponent(start)}`);
    if (end) params.push(`end_time=${encodeURIComponent(end)}`);
    if (params.length) url += `?${params.join('&')}`;
    return fetchApi(url, { method: 'POST' }) as Promise<AIExplanation>;
  },

  explainSchedule: (factoryId: number, start?: string, end?: string) => {
    let url = `/api/ai/explain-schedule/${factoryId}`;
    const params: string[] = [];
    if (start) params.push(`start_time=${encodeURIComponent(start)}`);
    if (end) params.push(`end_time=${encodeURIComponent(end)}`);
    if (params.length) url += `?${params.join('&')}`;
    return fetchApi(url, { method: 'POST' }) as Promise<AIExplanation>;
  },
};

// ------------------------------------------------------------------
// Legacy api object (kept for backward compatibility during migration)
// ------------------------------------------------------------------

export const api = {
  getMachines: () => machineApi.list(1),
  getOrders: () => orderApi.list(1),
  getTariffs: () => tariffApi.list(),
  getDashboardKPIs: () => dashboardApi.factory(1),
  getAlerts: () => alertApi.unresolved(1),
  getEnergyData: () => meterApi.list(1),
};
