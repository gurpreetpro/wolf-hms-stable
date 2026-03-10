/**
 * Laboratory Service
 * Handles all lab-related API calls
 */
import api from '../utils/axiosInstance';

const labService = {
  // Queue Management
  getQueue: async () => {
    const response = await api.get('/api/lab/queue');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/api/lab/stats');
    return response.data;
  },

  getHistory: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/api/lab/history?${queryParams}`);
    return response.data;
  },

  // Tests & Packages
  getTests: async () => {
    const response = await api.get('/api/lab/tests');
    return response.data;
  },

  getPackages: async () => {
    const response = await api.get('/api/lab/packages');
    return response.data;
  },

  getTestTypes: async () => {
    const response = await api.get('/api/lab/test-types');
    return response.data;
  },

  getTestRequests: async () => {
    const response = await api.get('/api/lab/test-requests');
    return response.data;
  },

  // Lab Requests (for price approvals)
  getRequests: async () => {
    const response = await api.get('/api/lab/requests');
    return response.data;
  },

  // Results
  submitResult: async (testId, resultData) => {
    const response = await api.post(`/api/lab/tests/${testId}/result`, resultData);
    return response.data;
  },

  // Analytics
  getTATAnalytics: async () => {
    const response = await api.get('/api/lab/analytics/tat');
    return response.data;
  },

  getRevenueAnalytics: async () => {
    const response = await api.get('/api/lab/analytics/revenue');
    return response.data;
  },

  getWorkloadAnalytics: async () => {
    const response = await api.get('/api/lab/analytics/workload');
    return response.data;
  },

  // Quality Control
  getQCMaterials: async () => {
    const response = await api.get('/api/lab/qc/materials');
    return response.data;
  },

  // Reagents
  getReagents: async () => {
    const response = await api.get('/api/lab/reagents');
    return response.data;
  },

  // Critical Alerts
  getCriticalAlerts: async () => {
    const response = await api.get('/api/lab/critical-alerts/pending');
    return response.data;
  },

  acknowledgeCriticalAlert: async (alertId) => {
    const response = await api.put(`/api/lab/critical-alerts/${alertId}/acknowledge`);
    return response.data;
  },
};

export default labService;
