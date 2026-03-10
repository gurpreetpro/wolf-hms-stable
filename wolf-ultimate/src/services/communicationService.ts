import client from '../api/client';

// ============================
// Communication Service
// ============================
export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  timestamp: string;
  channel_id: string;
  read?: boolean;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'department';
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  members: { id: string; name: string; role: string }[];
}

export interface ClinicalAlert {
  id: string;
  type: 'critical_lab' | 'vital_alert' | 'medication_due' | 'code_blue' | 'fall_risk' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  patient_name?: string;
  patient_id?: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledged_by?: string;
}

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  category: 'it' | 'maintenance' | 'clinical' | 'billing' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_by: string;
  assigned_to?: string;
  created_at: string;
  updated_at?: string;
}

const communicationService = {
  // Staff Chat
  getChannels: async (): Promise<ChatChannel[]> => {
    try {
      const res = await client.get('/chat/channels');
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('CommunicationService.getChannels Error', error);
      throw error;
    }
  },

  getMessages: async (channelId: string, limit = 50): Promise<ChatMessage[]> => {
    try {
      const res = await client.get(`/chat/channels/${channelId}/messages?limit=${limit}`);
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('CommunicationService.getMessages Error', error);
      throw error;
    }
  },

  sendMessage: async (channelId: string, content: string) => {
    try {
      const res = await client.post(`/chat/channels/${channelId}/messages`, { content });
      return res.data;
    } catch (error) {
      console.error('CommunicationService.sendMessage Error', error);
      throw error;
    }
  },

  // Clinical Alerts
  getAlerts: async (acknowledged?: boolean): Promise<ClinicalAlert[]> => {
    try {
      const params = acknowledged !== undefined ? `?acknowledged=${acknowledged}` : '';
      const res = await client.get(`/alerts/clinical${params}`);
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('CommunicationService.getAlerts Error', error);
      throw error;
    }
  },

  acknowledgeAlert: async (alertId: string) => {
    try {
      const res = await client.post(`/alerts/clinical/${alertId}/acknowledge`);
      return res.data;
    } catch (error) {
      console.error('CommunicationService.acknowledgeAlert Error', error);
      throw error;
    }
  },

  // Support Tickets
  getTickets: async (status?: string): Promise<SupportTicket[]> => {
    try {
      const params = status ? `?status=${status}` : '';
      const res = await client.get(`/support/tickets${params}`);
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('CommunicationService.getTickets Error', error);
      throw error;
    }
  },

  createTicket: async (data: Omit<SupportTicket, 'id' | 'status' | 'created_at' | 'created_by'>) => {
    try {
      const res = await client.post('/support/tickets', data);
      return res.data;
    } catch (error) {
      console.error('CommunicationService.createTicket Error', error);
      throw error;
    }
  },
};

export default communicationService;
