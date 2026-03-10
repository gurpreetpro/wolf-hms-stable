import client from '../api/client';

export interface IVLine {
  id: string;
  admission_id: string;
  site: string;
  gauge: string;
  inserted_at: string;
  inserted_by?: string;
  status: 'patent' | 'blocked' | 'phlebitis' | 'removed';
  removed_at?: string;
  removed_by?: string;
  notes?: string;
  due_for_change?: boolean;
}

const ivService = {
  // Get active IV lines
  getActiveIVLines: async (admissionId: string): Promise<IVLine[]> => {
    try {
      const response = await client.get(`/ward/iv-lines/${admissionId}`);
      const data = response.data.data || response.data || [];
      return data.filter((iv: IVLine) => iv.status !== 'removed');
    } catch (error) {
      console.error('IVService.getActiveIVLines Error', error);
      return [];
    }
  },

  // Insert new IV line
  insertIVLine: async (data: {
    admission_id: string;
    site: string;
    gauge: string;
    notes?: string;
  }): Promise<IVLine> => {
    try {
      const response = await client.post('/ward/iv-lines', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('IVService.insertIVLine Error', error);
      throw error;
    }
  },

  // Update IV status
  updateIVStatus: async (ivId: string, status: IVLine['status']): Promise<IVLine> => {
    try {
      const response = await client.patch(`/ward/iv-lines/${ivId}`, { status });
      return response.data.data || response.data;
    } catch (error) {
      console.error('IVService.updateIVStatus Error', error);
      throw error;
    }
  },

  // Remove IV line
  removeIVLine: async (ivId: string, reason?: string): Promise<void> => {
    try {
      await client.delete(`/ward/iv-lines/${ivId}`, { data: { reason } });
    } catch (error) {
      console.error('IVService.removeIVLine Error', error);
      throw error;
    }
  },

  // Check if due for change (>72 hours)
  isDueForChange: (insertedAt: string): boolean => {
    const inserted = new Date(insertedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - inserted.getTime()) / (1000 * 60 * 60);
    return hoursDiff >= 72;
  },

  // Get hours since insertion
  getHoursSinceInsertion: (insertedAt: string): number => {
    const inserted = new Date(insertedAt);
    const now = new Date();
    return Math.floor((now.getTime() - inserted.getTime()) / (1000 * 60 * 60));
  },

  // Common IV sites
  IV_SITES: ['Right Hand', 'Left Hand', 'Right Forearm', 'Left Forearm', 'Right ACF', 'Left ACF', 'Right Wrist', 'Left Wrist'],

  // Common gauge sizes
  IV_GAUGES: ['16G', '18G', '20G', '22G', '24G', '26G'],
};

export default ivService;
