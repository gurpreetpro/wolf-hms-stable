import client from '../api/client';

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  doctor_id: string;
  doctor_name?: string;
  department?: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes?: number;
  status: 'scheduled' | 'confirmed' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  consultation_type: 'in-person' | 'video';
  reason?: string;
  notes?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

const appointmentService = {
  // Get doctor's appointments for a date range
  getAppointments: async (startDate: string, endDate?: string, doctorId?: string): Promise<Appointment[]> => {
    try {
      let url = `/opd/appointments?start=${startDate}`;
      if (endDate) url += `&end=${endDate}`;
      if (doctorId) url += `&doctor_id=${doctorId}`;
      
      const response = await client.get(url);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('AppointmentService.getAppointments Error', error);
      throw error;
    }
  },

  // Get today's appointments
  getTodayAppointments: async (doctorId?: string): Promise<Appointment[]> => {
    const today = new Date().toISOString().split('T')[0];
    return appointmentService.getAppointments(today, today, doctorId);
  },

  // Get available time slots for a doctor on a specific date
  getAvailableSlots: async (doctorId: string, date: string): Promise<TimeSlot[]> => {
    try {
      const response = await client.get(`/appointments/slots?doctor_id=${doctorId}&date=${date}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('AppointmentService.getAvailableSlots Error', error);
      return [];
    }
  },

  // Update appointment status
  updateStatus: async (appointmentId: string, status: Appointment['status']): Promise<Appointment> => {
    try {
      const response = await client.patch(`/appointments/${appointmentId}/status`, { status });
      return response.data.data || response.data;
    } catch (error) {
      console.error('AppointmentService.updateStatus Error', error);
      throw error;
    }
  },

  // Mark patient as arrived
  markArrived: async (appointmentId: string): Promise<Appointment> => {
    return appointmentService.updateStatus(appointmentId, 'arrived');
  },

  // Start consultation
  startConsultation: async (appointmentId: string): Promise<Appointment> => {
    return appointmentService.updateStatus(appointmentId, 'in_progress');
  },

  // Complete appointment
  completeAppointment: async (appointmentId: string): Promise<Appointment> => {
    return appointmentService.updateStatus(appointmentId, 'completed');
  },

  // Cancel appointment
  cancelAppointment: async (appointmentId: string, reason?: string): Promise<Appointment> => {
    try {
      const response = await client.patch(`/appointments/${appointmentId}/cancel`, { reason });
      return response.data.data || response.data;
    } catch (error) {
      console.error('AppointmentService.cancelAppointment Error', error);
      throw error;
    }
  },

  // Reschedule appointment
  reschedule: async (appointmentId: string, newDate: string, newTime: string): Promise<Appointment> => {
    try {
      const response = await client.patch(`/appointments/${appointmentId}/reschedule`, { 
        appointment_date: newDate,
        appointment_time: newTime
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error('AppointmentService.reschedule Error', error);
      throw error;
    }
  },
};

export default appointmentService;
