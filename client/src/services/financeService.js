/**
 * Finance Service
 * Handles all finance/billing-related API calls
 */
import api from '../utils/axiosInstance';

const financeService = {
  // Invoices
  getInvoices: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/api/finance/invoices?${queryParams}`);
    return response.data;
  },

  getInvoice: async (invoiceId) => {
    const response = await api.get(`/api/finance/invoices/${invoiceId}`);
    return response.data;
  },

  createInvoice: async (invoiceData) => {
    const response = await api.post('/api/finance/invoices', invoiceData);
    return response.data;
  },

  // AR Aging
  getARaging: async () => {
    const response = await api.get('/api/finance/ar-aging');
    return response.data;
  },

  // KPIs
  getKPIs: async () => {
    const response = await api.get('/api/finance/kpis');
    return response.data;
  },

  // Denials
  getDenials: async () => {
    const response = await api.get('/api/finance/denials');
    return response.data;
  },

  // Payments
  recordPayment: async (paymentData) => {
    const response = await api.post('/api/finance/payments', paymentData);
    return response.data;
  },

  // Refunds
  processRefund: async (refundData) => {
    const response = await api.post('/api/finance/refunds', refundData);
    return response.data;
  },
};

export default financeService;
