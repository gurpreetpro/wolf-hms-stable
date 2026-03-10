import client from '../api/client';

export interface Request {
  id: string;
  admission_id?: string;
  ward_id?: string;
  type: 'pharmacy' | 'housekeeping' | 'dietary';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  requested_at: string;
  requested_by?: string;
  completed_at?: string;
}

const requestService = {
  // Create pharmacy request
  createPharmacyRequest: async (data: {
    admission_id: string;
    items: string[];
    priority: Request['priority'];
    notes?: string;
  }): Promise<Request> => {
    try {
      const response = await client.post('/nurse/pharmacy-request', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('RequestService.createPharmacyRequest Error', error);
      throw error;
    }
  },

  // Create housekeeping request
  createHousekeepingRequest: async (data: {
    ward_id?: string;
    bed_id?: string;
    type: 'cleaning' | 'linen_change' | 'spill' | 'terminal_cleaning' | 'other';
    priority: Request['priority'];
    description?: string;
  }): Promise<Request> => {
    try {
      const response = await client.post('/nurse/housekeeping-request', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('RequestService.createHousekeepingRequest Error', error);
      throw error;
    }
  },

  // Create dietary request
  createDietaryRequest: async (data: {
    admission_id: string;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    diet_type: string;
    restrictions?: string[];
    notes?: string;
  }): Promise<Request> => {
    try {
      const response = await client.post('/nurse/dietary-request', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('RequestService.createDietaryRequest Error', error);
      throw error;
    }
  },

  // Get pending requests
  getPendingRequests: async (): Promise<Request[]> => {
    try {
      const response = await client.get('/nurse/requests?status=pending');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('RequestService.getPendingRequests Error', error);
      return [];
    }
  },

  // Update request status
  updateRequestStatus: async (requestId: string, status: Request['status']): Promise<Request> => {
    try {
      const response = await client.patch(`/nurse/requests/${requestId}`, { status });
      return response.data.data || response.data;
    } catch (error) {
      console.error('RequestService.updateRequestStatus Error', error);
      throw error;
    }
  },

  // Common diet types
  DIET_TYPES: ['Regular', 'Soft', 'Liquid', 'NPO', 'Low Salt', 'Diabetic', 'Renal', 'Cardiac', 'High Protein', 'Bland'],

  // Common housekeeping types
  HOUSEKEEPING_TYPES: [
    { value: 'cleaning', label: 'General Cleaning', icon: '🧹' },
    { value: 'linen_change', label: 'Linen Change', icon: '🛏️' },
    { value: 'spill', label: 'Spill Cleanup', icon: '💧' },
    { value: 'terminal_cleaning', label: 'Terminal Cleaning', icon: '🧼' },
    { value: 'other', label: 'Other', icon: '📝' },
  ],
};

export default requestService;
