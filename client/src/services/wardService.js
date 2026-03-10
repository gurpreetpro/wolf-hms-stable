/**
 * Ward Service
 * Handles all ward/bed management API calls
 */
import api from '../utils/axiosInstance';

const wardService = {
  // Wards
  getWards: async () => {
    const response = await api.get('/api/ward/wards');
    return response.data;
  },

  createWard: async (wardData) => {
    const response = await api.post('/api/ward/wards', wardData);
    return response.data;
  },

  updateWard: async (wardId, wardData) => {
    const response = await api.put(`/api/ward/wards/${wardId}`, wardData);
    return response.data;
  },

  deleteWard: async (wardId) => {
    const response = await api.delete(`/api/ward/wards/${wardId}`);
    return response.data;
  },

  // Beds
  getBeds: async () => {
    const response = await api.get('/api/ward/beds');
    return response.data;
  },

  createBed: async (bedData) => {
    const response = await api.post('/api/ward/beds', bedData);
    return response.data;
  },

  updateBed: async (bedId, bedData) => {
    const response = await api.put(`/api/ward/beds/${bedId}`, bedData);
    return response.data;
  },

  deleteBed: async (bedId) => {
    const response = await api.delete(`/api/ward/beds/${bedId}`);
    return response.data;
  },

  // Consumables
  getConsumables: async () => {
    const response = await api.get('/api/ward/consumables');
    return response.data;
  },

  // Charges
  getCharges: async () => {
    const response = await api.get('/api/ward/charges');
    return response.data;
  },

  // Requests (for price approvals)
  getRequests: async () => {
    const response = await api.get('/api/ward/requests');
    return response.data;
  },

  // Change Request
  submitChangeRequest: async (requestData) => {
    const response = await api.post('/api/ward/change-request', requestData);
    return response.data;
  },

  // Approve/Deny Request
  approveRequest: async (requestId) => {
    const response = await api.post(`/api/ward/request/${requestId}/approve`);
    return response.data;
  },

  denyRequest: async (requestId) => {
    const response = await api.post(`/api/ward/request/${requestId}/deny`);
    return response.data;
  },
};

export default wardService;
