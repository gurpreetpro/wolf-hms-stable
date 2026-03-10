import client from '../api/client';

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  visit_id?: string;
  medications: Medication[];
  diagnosis?: string;
  notes?: string;
  created_at: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface Medication {
  id?: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  instructions?: string;
}

export interface PrescriptionQueueItem {
  id: string;
  patient_name: string;
  prescription_id: string;
  status: 'pending' | 'processing' | 'completed';
  created_at: string;
}

const prescriptionService = {
  // Get prescriptions for a patient (by visit or admission)
  getPatientPrescriptions: async (patientId: string): Promise<Prescription[]> => {
    try {
      const response = await client.get(`/prescriptions/patient/${patientId}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('PrescriptionService.getPatientPrescriptions Error', error);
      throw error;
    }
  },

  // Get prescription queue for pharmacy (doctor can view status)
  getPharmacyQueue: async (): Promise<PrescriptionQueueItem[]> => {
    try {
      const response = await client.get('/pharmacy/queue');
      return response.data.data || response.data;
    } catch (error) {
      console.error('PrescriptionService.getPharmacyQueue Error', error);
      throw error;
    }
  },

  // Create new prescription
  createPrescription: async (data: {
    patient_id: string;
    visit_id?: string;
    admission_id?: string;
    medications: Medication[];
    diagnosis?: string;
    notes?: string;
  }): Promise<Prescription> => {
    try {
      const response = await client.post('/prescriptions', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('PrescriptionService.createPrescription Error', error);
      throw error;
    }
  },

  // Get AI-suggested prescription based on diagnosis
  getAISuggestion: async (diagnosis: string, patientId: string): Promise<Medication[]> => {
    try {
      const response = await client.post('/ai/prescribe', { diagnosis, patient_id: patientId });
      return response.data.suggestions || [];
    } catch (error) {
      console.error('PrescriptionService.getAISuggestion Error', error);
      return []; // Return empty on error, don't break the flow
    }
  },

  // Search medicines (for autocomplete)
  searchMedicines: async (query: string): Promise<{ id: string; name: string; strength: string }[]> => {
    try {
      const response = await client.get(`/inventory/medicines/search?q=${encodeURIComponent(query)}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('PrescriptionService.searchMedicines Error', error);
      return [];
    }
  },
};

export default prescriptionService;
