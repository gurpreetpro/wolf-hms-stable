/**
 * Nurse Service
 * Handles all nursing-related API calls
 */
import api from '../utils/axiosInstance';

const nurseService = {
  // Ward Overview
  getWardOverview: async (wardId) => {
    const params = wardId ? `?ward_id=${wardId}` : '';
    const response = await api.get(`/api/nurse/ward-overview${params}`);
    return response.data;
  },

  // Care Plans
  getCarePlan: async (admissionId) => {
    const response = await api.get(`/api/nurse/care-plan/${admissionId}`);
    return response.data;
  },

  saveCarePlan: async (carePlanData) => {
    if (carePlanData.id) {
      const response = await api.put(`/api/nurse/care-plan/${carePlanData.id}`, carePlanData);
      return response.data;
    }
    const response = await api.post('/api/nurse/care-plan', carePlanData);
    return response.data;
  },

  // Pain Assessment
  getPainAssessments: async (admissionId) => {
    const response = await api.get(`/api/nurse/pain/${admissionId}`);
    return response.data;
  },

  recordPain: async (painData) => {
    const response = await api.post('/api/nurse/pain', painData);
    return response.data;
  },

  // Fluid Balance
  getFluidBalance: async (admissionId) => {
    const response = await api.get(`/api/nurse/fluid-balance/${admissionId}`);
    return response.data;
  },

  recordFluidBalance: async (fluidData) => {
    const response = await api.post('/api/nurse/fluid-balance', fluidData);
    return response.data;
  },

  // IV Lines
  getIVLines: async (admissionId) => {
    const response = await api.get(`/api/nurse/iv-line/${admissionId}`);
    return response.data;
  },

  createIVLine: async (ivData) => {
    const response = await api.post('/api/nurse/iv-line', ivData);
    return response.data;
  },

  removeIVLine: async (ivLineId) => {
    const response = await api.put(`/api/nurse/iv-line/${ivLineId}/remove`);
    return response.data;
  },

  // Consumables
  getConsumables: async (admissionId) => {
    const response = await api.get(`/api/nurse/consumables/${admissionId}`);
    return response.data;
  },

  recordConsumable: async (consumableData) => {
    const response = await api.post('/api/nurse/consumables', consumableData);
    return response.data;
  },

  // Fall Risk
  getFallRisk: async (admissionId) => {
    const response = await api.get(`/api/nurse/fall-risk/${admissionId}`);
    return response.data;
  },

  assessFallRisk: async (fallRiskData) => {
    const response = await api.post('/api/nurse/fall-risk', fallRiskData);
    return response.data;
  },

  // Wounds
  getWounds: async (admissionId) => {
    const response = await api.get(`/api/nurse/wounds/${admissionId}`);
    return response.data;
  },

  recordWound: async (woundData) => {
    const response = await api.post('/api/nurse/wounds', woundData);
    return response.data;
  },

  // Shift Handover
  getShiftHandover: async (ward, shiftType) => {
    const response = await api.get(`/api/nurse/shift-handover?ward=${ward}&shift=${shiftType}`);
    return response.data;
  },
};

export default nurseService;
