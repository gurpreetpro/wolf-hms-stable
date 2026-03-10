import client from '../api/client';

export interface ClinicalNote {
  id: string;
  patient_id: string;
  visit_id?: string;
  admission_id?: string;
  doctor_id: string;
  doctor_name?: string;
  note_type: 'SOAP' | 'Progress' | 'Procedure' | 'Consultation' | 'Discharge';
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  content?: string;
  created_at: string;
  updated_at?: string;
}

export interface NoteTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
}

const clinicalService = {
  // Get clinical notes for a patient
  getPatientNotes: async (patientId: string): Promise<ClinicalNote[]> => {
    try {
      const response = await client.get(`/clinical/notes?patient_id=${patientId}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('ClinicalService.getPatientNotes Error', error);
      throw error;
    }
  },

  // Get notes for a specific visit or admission
  getVisitNotes: async (visitId?: string, admissionId?: string): Promise<ClinicalNote[]> => {
    try {
      const params = visitId ? `visit_id=${visitId}` : `admission_id=${admissionId}`;
      const response = await client.get(`/clinical/notes?${params}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('ClinicalService.getVisitNotes Error', error);
      throw error;
    }
  },

  // Create a new clinical note
  createNote: async (data: {
    patient_id: string;
    visit_id?: string;
    admission_id?: string;
    note_type: ClinicalNote['note_type'];
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    content?: string;
  }): Promise<ClinicalNote> => {
    try {
      const response = await client.post('/clinical/notes', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('ClinicalService.createNote Error', error);
      throw error;
    }
  },

  // Get available note templates
  getTemplates: async (): Promise<NoteTemplate[]> => {
    try {
      const response = await client.get('/clinical/templates');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('ClinicalService.getTemplates Error', error);
      return [];
    }
  },

  // Update an existing note
  updateNote: async (noteId: string, data: Partial<ClinicalNote>): Promise<ClinicalNote> => {
    try {
      const response = await client.put(`/clinical/notes/${noteId}`, data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('ClinicalService.updateNote Error', error);
      throw error;
    }
  },
};

export default clinicalService;
