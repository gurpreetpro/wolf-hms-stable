import client from '../api/client';

export interface OPDQueueItem {
  id: string; // visit_id
  patient_id: string;
  doctor_id: string;
  token_number: number;
  status: 'Waiting' | 'In Progress' | 'Completed' | 'Cancelled';
  consultation_type: 'in-person' | 'video';
  visit_date: string;
  patient_name: string;
  uhid: string;
  gender: string;
  dob: string;
  department: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  visit_date: string;
  status: string;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
}

const doctorService = {
  getQueue: async (): Promise<OPDQueueItem[]> => {
    try {
      const response = await client.get('/opd/queue');
      return response.data.data || response.data; // Handle wrapped or direct response
    } catch (error) {
      console.error('DoctorService.getQueue Error', error);
      throw error;
    }
  },

  getAppointments: async (start?: string, end?: string, doctorId?: string): Promise<Appointment[]> => {
    try {
      const params: any = {};
      if (start) params.start = start;
      if (end) params.end = end;
      if (doctorId) params.doctor_id = doctorId;

      const response = await client.get('/opd/appointments', { params });
      return response.data.data || response.data;
    } catch (error) {
      console.error('DoctorService.getAppointments Error', error);
      throw error;
    }
  }
};

export default doctorService;
