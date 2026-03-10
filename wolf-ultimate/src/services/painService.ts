import client from '../api/client';

export interface PainRecord {
  id: string;
  admission_id: string;
  pain_score: number; // 0-10
  location: string;
  character?: string; // sharp, dull, burning, etc.
  intervention?: string;
  notes?: string;
  recorded_at: string;
  recorded_by?: string;
}

const painService = {
  // Log pain assessment
  logPain: async (data: {
    admission_id: string;
    pain_score: number;
    location: string;
    character?: string;
    intervention?: string;
    notes?: string;
  }): Promise<PainRecord> => {
    try {
      const response = await client.post('/ward/pain', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('PainService.logPain Error', error);
      throw error;
    }
  },

  // Get pain history
  getPainHistory: async (admissionId: string): Promise<PainRecord[]> => {
    try {
      const response = await client.get(`/ward/pain/${admissionId}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('PainService.getPainHistory Error', error);
      return [];
    }
  },

  // Get latest pain score
  getLatestPain: async (admissionId: string): Promise<PainRecord | null> => {
    try {
      const history = await painService.getPainHistory(admissionId);
      return history.length > 0 ? history[0] : null;
    } catch (error) {
      console.error('PainService.getLatestPain Error', error);
      return null;
    }
  },

  // Get pain color based on score
  getPainColor: (score: number): string => {
    if (score <= 3) return '#22c55e'; // Green - mild
    if (score <= 6) return '#f59e0b'; // Orange - moderate
    return '#ef4444'; // Red - severe
  },

  // Get pain label
  getPainLabel: (score: number): string => {
    if (score === 0) return 'No Pain';
    if (score <= 3) return 'Mild';
    if (score <= 6) return 'Moderate';
    if (score <= 8) return 'Severe';
    return 'Worst';
  },

  // Common pain locations
  PAIN_LOCATIONS: [
    'Head', 'Chest', 'Abdomen', 'Back', 'Arms', 'Legs',
    'Neck', 'Shoulder', 'Hip', 'Knee', 'Generalized'
  ],

  // Pain characters
  PAIN_CHARACTERS: [
    'Sharp', 'Dull', 'Burning', 'Stabbing', 'Aching',
    'Throbbing', 'Cramping', 'Radiating', 'Constant', 'Intermittent'
  ],
};

export default painService;
