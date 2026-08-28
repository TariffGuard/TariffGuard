// This is a placeholder for the actual API client.
// Currently it just resolves with mock data since the backend doesn't support these features fully.
import { mockMachines, mockOrders, mockTariffs, mockKPIs, mockAlerts, mockEnergyData } from './mock_data';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  let token = null;
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

  return response.json();
}

export const api = {
  getMachines: async () => {
    return Promise.resolve(mockMachines);
  },
  getOrders: async () => {
    return Promise.resolve(mockOrders);
  },
  getTariffs: async () => {
    return Promise.resolve(mockTariffs);
  },
  getDashboardKPIs: async () => {
    return Promise.resolve(mockKPIs);
  },
  getAlerts: async () => {
    return Promise.resolve(mockAlerts);
  },
  getEnergyData: async () => {
    return Promise.resolve(mockEnergyData);
  }
};
