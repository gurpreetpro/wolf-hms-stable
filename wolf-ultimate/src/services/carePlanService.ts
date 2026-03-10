import client from '../api/client';

export interface CarePlan {
  id: string;
  admission_id: string;
  title: string;
  content: string;
  goals?: string[];
  interventions?: string[];
  status: 'active' | 'completed' | 'discontinued';
  created_at: string;
  created_by?: string;
  updated_at?: string;
}

const carePlanService = {
  // Get care plans for admission
  getCarePlans: async (admissionId: string): Promise<CarePlan[]> => {
    try {
      const response = await client.get(`/nurse/care-plans/${admissionId}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('CarePlanService.getCarePlans Error', error);
      return [];
    }
  },

  // Create care plan
  createCarePlan: async (data: {
    admission_id: string;
    title: string;
    content: string;
    goals?: string[];
    interventions?: string[];
  }): Promise<CarePlan> => {
    try {
      const response = await client.post('/nurse/care-plans', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('CarePlanService.createCarePlan Error', error);
      throw error;
    }
  },

  // Generate AI care plan
  generateAICarePlan: async (admissionId: string, diagnosis: string): Promise<CarePlan> => {
    try {
      const response = await client.post('/ai/care-plan', { admission_id: admissionId, diagnosis });
      return response.data.data || response.data;
    } catch (error) {
      console.error('CarePlanService.generateAICarePlan Error', error);
      throw error;
    }
  },

  // Update care plan status
  updateCarePlanStatus: async (planId: string, status: CarePlan['status']): Promise<CarePlan> => {
    try {
      const response = await client.patch(`/nurse/care-plans/${planId}`, { status });
      return response.data.data || response.data;
    } catch (error) {
      console.error('CarePlanService.updateCarePlanStatus Error', error);
      throw error;
    }
  },

  // Common nursing diagnoses for quick selection
  COMMON_DIAGNOSES: [
    'Risk for Infection',
    'Impaired Skin Integrity',
    'Acute Pain',
    'Impaired Mobility',
    'Risk for Falls',
    'Fluid Volume Deficit',
    'Ineffective Breathing Pattern',
    'Anxiety',
    'Disturbed Sleep Pattern',
    'Imbalanced Nutrition',
  ],
};

export default carePlanService;
