/**
 * OPD (Outpatient Department) Service
 * Handles all OPD-related API calls
 */
import api from '../utils/axiosInstance';

const opdService = {
  // Get OPD Queue
  getQueue: async () => {
    const response = await api.get('/api/opd/queue');
    return response.data;
  },

  // Get appointments for a doctor
  getAppointments: async (doctorId, date) => {
    const params = new URLSearchParams();
    if (doctorId) params.append('doctor_id', doctorId);
    if (date) params.append('date', date);
    
    const response = await api.get(`/api/opd/appointments?${params.toString()}`);
    return response.data;
  },

  // Cancel appointment
  cancel: async (visitId, reason) => {
    const response = await api.post('/api/opd/cancel', { visit_id: visitId, reason });
    return response.data;
  },

  // Reschedule appointment
  reschedule: async (visitId, newDate, newTime, reason) => {
    const response = await api.post('/api/opd/reschedule', { 
      visit_id: visitId, 
      new_date: newDate, 
      new_time: newTime,
      reason 
    });
    return response.data;
  },

  // Demo endpoints
  createDemoPatient: async () => {
    const response = await api.post('/api/opd/demo-patient');
    return response.data;
  },

  resetDemoPatient: async (patientId) => {
    const response = await api.post('/api/opd/demo-reset', { patientId });
    return response.data;
  },
};

export default opdService;
