import client from '../api/client';

export interface Admission {
  id: string;
  patient_id: string;
  patient_name: string;
  bed_id: string;
  bed_number?: string;
  ward_id: string;
  ward_name?: string;
  admission_date: string;
  discharge_date?: string;
  status: 'admitted' | 'discharged' | 'transferred';
  diagnosis?: string;
  attending_doctor?: string;
  discharge_type?: string;
  notes?: string;
}

export interface Bed {
  id: string;
  bed_number: string;
  ward_id: string;
  ward_name?: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  patient_id?: string;
  patient_name?: string;
  bed_type?: string;
  daily_rate?: number;
}

export interface Ward {
  id: string;
  name: string;
  floor?: number;
  capacity: number;
  occupied: number;
  available: number;
}

export interface AdmitInput {
  patient_id: string;
  bed_id: string;
  ward_id: string;
  diagnosis?: string;
  attending_doctor_id?: string;
  notes?: string;
}

export interface DischargeInput {
  admission_id: string;
  discharge_type: 'normal' | 'lama' | 'absconded' | 'transfer' | 'death';
  discharge_summary?: string;
  notes?: string;
}

const admissionService = {
  // Get all active admissions
  getActiveAdmissions: async (): Promise<Admission[]> => {
    try {
      const response = await client.get('/ipd/admissions?status=admitted');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('AdmissionService.getActiveAdmissions Error', error);
      return [];
    }
  },

  // Get admission by ID
  getAdmission: async (admissionId: string): Promise<Admission | null> => {
    try {
      const response = await client.get(`/ipd/admissions/${admissionId}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('AdmissionService.getAdmission Error', error);
      return null;
    }
  },

  // Get available beds
  getAvailableBeds: async (wardId?: string): Promise<Bed[]> => {
    try {
      let url = '/nurse/beds?status=available';
      if (wardId) url += `&ward_id=${wardId}`;
      const response = await client.get(url);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('AdmissionService.getAvailableBeds Error', error);
      return [];
    }
  },

  // Get all beds with status
  getAllBeds: async (): Promise<Bed[]> => {
    try {
      const response = await client.get('/nurse/beds');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('AdmissionService.getAllBeds Error', error);
      return [];
    }
  },

  // Get all wards
  getWards: async (): Promise<Ward[]> => {
    try {
      const response = await client.get('/ward/wards');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('AdmissionService.getWards Error', error);
      return [];
    }
  },

  // Admit patient to bed
  admitPatient: async (data: AdmitInput): Promise<Admission> => {
    try {
      const response = await client.post('/ipd/admit', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('AdmissionService.admitPatient Error', error);
      throw error;
    }
  },

  // Transfer patient to another bed
  transferPatient: async (admissionId: string, newBedId: string, reason?: string): Promise<Admission> => {
    try {
      const response = await client.post('/ipd/transfer', {
        admission_id: admissionId,
        new_bed_id: newBedId,
        reason,
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error('AdmissionService.transferPatient Error', error);
      throw error;
    }
  },

  // Discharge patient
  dischargePatient: async (data: DischargeInput): Promise<Admission> => {
    try {
      const response = await client.post('/ipd/discharge', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('AdmissionService.dischargePatient Error', error);
      throw error;
    }
  },

  // Search patients for admission
  searchPatients: async (query: string): Promise<any[]> => {
    try {
      const response = await client.get(`/reception/patients?search=${encodeURIComponent(query)}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('AdmissionService.searchPatients Error', error);
      return [];
    }
  },
};

export default admissionService;
