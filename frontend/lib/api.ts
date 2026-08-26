// This is a placeholder for the actual API client.
// Currently it just resolves with mock data since the backend doesn't support these features fully.
import { mockMachines, mockOrders, mockTariffs, mockKPIs, mockAlerts, mockEnergyData } from './mock_data';

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
