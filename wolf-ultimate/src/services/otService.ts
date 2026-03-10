import client from '../api/client';

// ============================
// OT & Perioperative Service
// ============================
export interface OTSlot {
  id: string;
  ot_name: string;
  date: string;
  start_time: string;
  end_time: string;
  patient_name: string;
  patient_id?: string;
  surgeon_name: string;
  procedure: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  anaesthesia_type?: string;
}

export interface PreOpChecklist {
  id: string;
  patient_name: string;
  procedure: string;
  items: { label: string; checked: boolean }[];
  status: 'pending' | 'complete';
}

const otService = {
  getSchedule: async (date?: string): Promise<OTSlot[]> => {
    try {
      const params = date ? `?date=${date}` : '';
      const res = await client.get(`/ot/schedule${params}`);
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('OTService.getSchedule Error', error);
      throw error;
    }
  },

  getPreOpChecklist: async (admissionId: string): Promise<PreOpChecklist> => {
    try {
      const res = await client.get(`/ot/pre-op/${admissionId}`);
      return res.data?.data || res.data;
    } catch (error) {
      console.error('OTService.getPreOpChecklist Error', error);
      throw error;
    }
  },

  updatePreOpItem: async (checklistId: string, itemIndex: number, checked: boolean) => {
    try {
      const res = await client.put(`/ot/pre-op/${checklistId}/item`, { itemIndex, checked });
      return res.data;
    } catch (error) {
      console.error('OTService.updatePreOpItem Error', error);
      throw error;
    }
  },

  startCase: async (slotId: string) => {
    try {
      const res = await client.post(`/ot/cases/${slotId}/start`);
      return res.data;
    } catch (error) {
      console.error('OTService.startCase Error', error);
      throw error;
    }
  },

  endCase: async (slotId: string, notes?: string) => {
    try {
      const res = await client.post(`/ot/cases/${slotId}/end`, { notes });
      return res.data;
    } catch (error) {
      console.error('OTService.endCase Error', error);
      throw error;
    }
  },
};

export default otService;
