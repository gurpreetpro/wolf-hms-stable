/**
 * Pharmacy Service
 * Handles all pharmacy-related API calls
 */
import api from '../utils/axiosInstance';

const pharmacyService = {
  // Inventory
  getInventory: async () => {
    const response = await api.get('/api/pharmacy/inventory');
    return response.data;
  },

  // Queue
  getQueue: async () => {
    const response = await api.get('/api/pharmacy/queue');
    return response.data;
  },

  // Heatmap
  getHeatmap: async () => {
    const response = await api.get('/api/pharmacy/heatmap');
    return response.data;
  },

  // Forecast
  getForecast: async () => {
    const response = await api.get('/api/pharmacy/forecast');
    return response.data;
  },

  // Recent Dispenses
  getRecentDispenses: async () => {
    const response = await api.get('/api/pharmacy/dispenses/recent');
    return response.data;
  },

  // Price Requests
  getPriceRequests: async () => {
    const response = await api.get('/api/pharmacy/price-requests');
    return response.data;
  },

  // Reports
  getABCReport: async () => {
    const response = await api.get('/api/pharmacy/reports/abc');
    return response.data;
  },

  getExpiryReport: async () => {
    const response = await api.get('/api/pharmacy/reports/expiry');
    return response.data;
  },

  // Suppliers
  getSuppliers: async () => {
    const response = await api.get('/api/pharmacy/suppliers');
    return response.data;
  },

  // Purchase Orders
  getPurchaseOrders: async () => {
    const response = await api.get('/api/pharmacy/purchase-orders');
    return response.data;
  },

  createPurchaseOrder: async (orderData) => {
    const response = await api.post('/api/pharmacy/purchase-orders', orderData);
    return response.data;
  },

  // Dispense medication
  dispense: async (prescriptionId, items) => {
    const response = await api.post('/api/pharmacy/dispense', { prescription_id: prescriptionId, items });
    return response.data;
  },
};

export default pharmacyService;
