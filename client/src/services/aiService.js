/**
 * AI Service
 * Handles all AI/ML feature API calls
 * [TITAN] Updated with Clinical Co-Pilot methods
 */
import api from '../utils/axiosInstance';

const aiService = {
  // ============================================
  // EXISTING METHODS
  // ============================================

  // Drug Interaction Check
  checkDrugInteractions: async (medications) => {
    const response = await api.post('/api/ai/drug-check', { medications });
    return response.data;
  },

  // Symptom Analysis
  analyzeSymptoms: async (symptoms, patientInfo = {}) => {
    const response = await api.post('/api/ai/symptoms', { symptoms, ...patientInfo });
    return response.data;
  },

  // Lab Analysis
  analyzeLabResults: async (results, context = {}) => {
    const response = await api.post('/api/ai/lab-analysis', { results, ...context });
    return response.data;
  },

  // Drug Interaction Check (alternative)
  checkInteractions: async (currentDrugs, newDrug) => {
    const response = await api.post('/api/ai/check-interactions', { currentDrugs, newDrug });
    return response.data;
  },

  // ============================================
  // TITAN: CLINICAL CO-PILOT
  // ============================================

  /**
   * Get AI-generated clinical summary for a patient
   * Aggregates labs, vitals, medications and generates insights
   * @param {string|number} patientId - Patient ID
   * @returns {Object} { patient, dataPoints, aiSummary, generatedAt }
   */
  getPatientSummary: async (patientId) => {
    const response = await api.get(`/api/ai/patient/${patientId}/summary`);
    return response.data;
  },

  /**
   * Get AI interpretation for a specific lab result
   * @param {number} labId - Lab request ID
   * @returns {Object} { interpretation, significance, causes, followupTests }
   */
  getLabInsights: async (labId) => {
    const response = await api.get(`/api/ai/lab/${labId}/insights`);
    return response.data;
  },

  /**
   * Analyze vitals trend for an admission
   * @param {number} admissionId - Admission ID
   * @returns {Object} { trend, concerns, warnings, recommendedFrequency }
   */
  getVitalsTrend: async (admissionId) => {
    const response = await api.get(`/api/ai/admission/${admissionId}/vitals-trend`);
    return response.data;
  },

  /**
   * Check medication interactions (enhanced)
   * @param {string[]} medications - List of medication names
   * @returns {Object} { interactions, contraindications, warnings }
   */
  checkMedicationSafety: async (medications) => {
    const response = await api.post('/api/ai/medication-check', { medications });
    return response.data;
  },
};

export default aiService;
