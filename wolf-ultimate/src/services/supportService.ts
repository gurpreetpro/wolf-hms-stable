import client from '../api/client';

// ============================
// Support Services (Visitor, Transition, Telehealth, AI)
// ============================
export interface Visitor {
  id: string;
  visitor_name: string;
  patient_name: string;
  patient_id: string;
  relation: string;
  phone: string;
  id_proof?: string;
  check_in: string;
  check_out?: string;
  ward_name?: string;
  status: 'active' | 'checked_out';
}

export interface TransitionTask {
  id: string;
  patient_name: string;
  patient_id: string;
  admission_id: string;
  destination: 'home' | 'rehab' | 'hospice' | 'ltc' | 'other';
  checklist: { label: string; completed: boolean }[];
  progress: number;
  target_date?: string;
  status: 'planning' | 'ready' | 'discharged';
}

export interface TelehealthSession {
  id: string;
  patient_name: string;
  patient_id: string;
  doctor_name: string;
  scheduled_time: string;
  duration_minutes?: number;
  status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  meeting_url?: string;
}

const supportService = {
  // Visitors
  getVisitors: async (status?: string): Promise<Visitor[]> => {
    try {
      const params = status ? `?status=${status}` : '';
      const res = await client.get(`/visitors${params}`);
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('SupportService.getVisitors Error', error);
      throw error;
    }
  },

  checkInVisitor: async (data: Omit<Visitor, 'id' | 'status' | 'check_in' | 'check_out'>) => {
    try {
      const res = await client.post('/visitors/check-in', data);
      return res.data;
    } catch (error) {
      console.error('SupportService.checkInVisitor Error', error);
      throw error;
    }
  },

  checkOutVisitor: async (visitorId: string) => {
    try {
      const res = await client.post(`/visitors/${visitorId}/check-out`);
      return res.data;
    } catch (error) {
      console.error('SupportService.checkOutVisitor Error', error);
      throw error;
    }
  },

  // Transition Planning
  getTransitionPlans: async (): Promise<TransitionTask[]> => {
    try {
      const res = await client.get('/discharge/transition-plans');
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('SupportService.getTransitionPlans Error', error);
      throw error;
    }
  },

  updateChecklistItem: async (planId: string, itemIndex: number, completed: boolean) => {
    try {
      const res = await client.put(`/discharge/transition-plans/${planId}/item`, { itemIndex, completed });
      return res.data;
    } catch (error) {
      console.error('SupportService.updateChecklistItem Error', error);
      throw error;
    }
  },

  // Telehealth
  getTelehealthSessions: async (date?: string): Promise<TelehealthSession[]> => {
    try {
      const params = date ? `?date=${date}` : '';
      const res = await client.get(`/telehealth/sessions${params}`);
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('SupportService.getTelehealthSessions Error', error);
      throw error;
    }
  },

  startSession: async (sessionId: string) => {
    try {
      const res = await client.post(`/telehealth/sessions/${sessionId}/start`);
      return res.data;
    } catch (error) {
      console.error('SupportService.startSession Error', error);
      throw error;
    }
  },

  // AI Clinical Assistant
  getDifferentialDx: async (symptoms: string[], history?: string) => {
    try {
      const res = await client.post('/ai/differential-dx', { symptoms, history });
      return res.data?.data || res.data;
    } catch (error) {
      console.error('SupportService.getDifferentialDx Error', error);
      throw error;
    }
  },

  getICD10Suggestions: async (query: string) => {
    try {
      const res = await client.get(`/ai/icd10?q=${encodeURIComponent(query)}`);
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('SupportService.getICD10Suggestions Error', error);
      throw error;
    }
  },
};

export default supportService;
