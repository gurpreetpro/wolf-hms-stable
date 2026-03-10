import client from '../api/client';

export interface Emergency {
  id: string;
  code: 'blue' | 'red' | 'pink' | 'yellow' | 'orange';
  location: string;
  ward_id?: string;
  bed_id?: string;
  description?: string;
  status: 'active' | 'responding' | 'resolved';
  triggered_at: string;
  triggered_by?: string;
  resolved_at?: string;
  resolved_by?: string;
}

const emergencyService = {
  // Trigger emergency
  triggerEmergency: async (data: {
    code: Emergency['code'];
    location: string;
    ward_id?: string;
    bed_id?: string;
    description?: string;
  }): Promise<Emergency> => {
    try {
      const response = await client.post('/ward/emergency', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('EmergencyService.triggerEmergency Error', error);
      throw error;
    }
  },

  // Get active emergencies
  getActiveEmergencies: async (): Promise<Emergency[]> => {
    try {
      const response = await client.get('/ward/emergencies?status=active');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('EmergencyService.getActiveEmergencies Error', error);
      return [];
    }
  },

  // Respond to emergency
  respondToEmergency: async (emergencyId: string): Promise<Emergency> => {
    try {
      const response = await client.post(`/ward/emergency/${emergencyId}/respond`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('EmergencyService.respondToEmergency Error', error);
      throw error;
    }
  },

  // Resolve emergency
  resolveEmergency: async (emergencyId: string, notes?: string): Promise<Emergency> => {
    try {
      const response = await client.post(`/ward/emergency/${emergencyId}/resolve`, { notes });
      return response.data.data || response.data;
    } catch (error) {
      console.error('EmergencyService.resolveEmergency Error', error);
      throw error;
    }
  },

  // Get emergency history
  getEmergencyHistory: async (): Promise<Emergency[]> => {
    try {
      const response = await client.get('/ward/emergencies?limit=20');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('EmergencyService.getEmergencyHistory Error', error);
      return [];
    }
  },

  // Emergency code info
  CODES: {
    blue: { name: 'Code Blue', description: 'Cardiac Arrest', color: '#3b82f6', icon: '💙' },
    red: { name: 'Code Red', description: 'Fire', color: '#ef4444', icon: '🔥' },
    pink: { name: 'Code Pink', description: 'Infant Abduction', color: '#ec4899', icon: '👶' },
    yellow: { name: 'Code Yellow', description: 'Missing Patient', color: '#f59e0b', icon: '⚠️' },
    orange: { name: 'Code Orange', description: 'Mass Casualty', color: '#f97316', icon: '🚨' },
  },
};

export default emergencyService;
