/**
 * Clinical Service
 * Handles all clinical documentation API calls
 */
import api from '../utils/axiosInstance';

const clinicalService = {
  // Consultations
  createConsultation: async (consultationData) => {
    const response = await api.post('/api/clinical/consultation', consultationData);
    return response.data;
  },

  // SOAP Notes
  saveSoapNote: async (noteData) => {
    const response = await api.post('/api/clinical/soap-notes', noteData);
    return response.data;
  },

  // Round Notes
  saveRoundNote: async (noteData) => {
    const response = await api.post('/api/clinical/round-notes', noteData);
    return response.data;
  },

  // Problem List
  getProblems: async (patientId) => {
    const response = await api.get(`/api/clinical/problems/${patientId}`);
    return response.data;
  },

  addProblem: async (problemData) => {
    const response = await api.post('/api/clinical/problems', problemData);
    return response.data;
  },

  resolveProblem: async (problemId) => {
    const response = await api.put(`/api/clinical/problems/${problemId}/resolve`);
    return response.data;
  },
};

export default clinicalService;
