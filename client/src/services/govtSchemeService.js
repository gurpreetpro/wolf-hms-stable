/**
 * Government Scheme Service
 * API client for CGHS, ECHS, CAPF rate lookup, billing, beneficiary management
 * Connects to /api/govt-schemes endpoints (Phase H5)
 */
import api from '../utils/axiosInstance';

const govtSchemeService = {
  // ===== Package & Rate Lookup =====
  getPackages: async (scheme, params = {}) => {
    const response = await api.get(`/api/govt-schemes/${scheme}/packages`, { params });
    return response.data;
  },

  getPackageRate: async (scheme, code, hospitalConfig = {}) => {
    const response = await api.get(`/api/govt-schemes/${scheme}/packages/${code}`, { params: hospitalConfig });
    return response.data;
  },

  searchPackages: async (scheme, search, limit = 20) => {
    const response = await api.get(`/api/govt-schemes/${scheme}/packages`, { params: { search, limit } });
    return response.data;
  },

  getSpecialties: async (scheme) => {
    const response = await api.get(`/api/govt-schemes/${scheme}/specialties`);
    return response.data;
  },

  getModifiers: async (scheme) => {
    const response = await api.get(`/api/govt-schemes/${scheme}/modifiers`);
    return response.data;
  },

  getStats: async (scheme) => {
    const response = await api.get(`/api/govt-schemes/${scheme}/stats`);
    return response.data;
  },

  // ===== Claim Calculation =====
  calculateClaim: async (scheme, procedures, hospitalConfig) => {
    const response = await api.post(`/api/govt-schemes/${scheme}/calculate-claim`, {
      procedures,
      hospitalConfig
    });
    return response.data;
  },

  compareRates: async (scheme, packageSuffix, hospitalConfig) => {
    const response = await api.post(`/api/govt-schemes/${scheme}/compare-rates`, {
      packageSuffix,
      hospitalConfig
    });
    return response.data;
  },

  // ===== Ward Entitlement =====
  getWardEntitlement: async (basicPay) => {
    const response = await api.get(`/api/govt-schemes/ward-entitlement/${basicPay}`);
    return response.data;
  },

  // ===== Beneficiary Management =====
  registerBeneficiary: async (data) => {
    const response = await api.post('/api/govt-schemes/beneficiaries/register', data);
    return response.data;
  },

  verifyBeneficiary: async (beneficiaryId) => {
    const response = await api.post('/api/govt-schemes/beneficiaries/verify', { beneficiaryId });
    return response.data;
  },

  searchBeneficiaries: async (scheme, query) => {
    const response = await api.get('/api/govt-schemes/beneficiaries/search', { params: { scheme, q: query } });
    return response.data;
  },

  getPatientSchemes: async (patientId) => {
    const response = await api.get(`/api/govt-schemes/beneficiaries/patient/${patientId}`);
    return response.data;
  },

  // ===== Empanelment =====
  getEmpanelment: async () => {
    const response = await api.get('/api/govt-schemes/empanelment');
    return response.data;
  },

  updateEmpanelment: async (data) => {
    const response = await api.post('/api/govt-schemes/empanelment', data);
    return response.data;
  },
};

export default govtSchemeService;
