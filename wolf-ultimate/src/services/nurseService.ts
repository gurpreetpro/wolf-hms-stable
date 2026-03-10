import client from '../api/client';

export interface Bed {
  id: string;
  ward_id: string;
  bed_number: string;
  status: 'Occupied' | 'Available' | 'Cleaning' | 'Maintenance';
  patient_id?: string;
  admission_id?: string;
  patient_name?: string;
}

export interface WardOverview {
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  critical_patients: number;
  ui_alerts: any[];
  beds?: any[];
}

export interface Vitals {
  bp: string;
  heart_rate: string;
  temp: string;
  spo2: string;
  resp_rate?: string;
}

const nurseService = {
  getWardOverview: async (): Promise<WardOverview> => {
    try {
      const response = await client.get('/nurse/ward-overview');
      return response.data.data || response.data;
    } catch (error) {
      console.error('NurseService.getWardOverview Error', error);
      throw error;
    }
  },

  getAllBeds: async (): Promise<Bed[]> => {
    try {
      const response = await client.get('/ward/beds');
      return response.data.data || response.data;
    } catch (error) {
      console.error('NurseService.getAllBeds Error', error);
      throw error;
    }
  },

  getVitals: async (admissionId: string) => {
    try {
      const response = await client.get(`/ward/vitals/${admissionId}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('NurseService.getVitals Error', error);
      throw error;
    }
  },

  addVitals: async (data: { admission_id: string; patient_id: string; bp: string; temp: string; spo2: string; heart_rate: string }) => {
    try {
      const response = await client.post('/ward/vitals', data);
      return response.data;
    } catch (error) {
      console.error('NurseService.addVitals Error', error);
      throw error;
    }
  },
  
  // Future methods: addEMAR, getCarePlans, etc.
};

export default nurseService;
