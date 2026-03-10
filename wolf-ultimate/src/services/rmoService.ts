import client from '../api/client';

// ═══════════════════════════════════════════════════════
//  RMO SERVICE — Duty Roster, On-Call, Consultant Status
// ═══════════════════════════════════════════════════════

export interface DutyRosterEntry {
  id: number;
  user_id: number;
  user_name: string;
  hospital_id: number;
  shift_type: 'MORNING' | 'EVENING' | 'NIGHT';
  shift_date: string;
  start_time: string;
  end_time: string;
  department: string;
  ward_id?: number;
  ward_name?: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'SWAPPED';
  swapped_with_user_id?: number;
  swapped_with_name?: string;
  swap_reason?: string;
  created_at: string;
}

export interface OnCallEntry {
  id: number;
  user_id: number;
  user_name: string;
  department: string;
  date: string;
  start_time: string;
  end_time: string;
  is_primary: boolean;
  backup_user_id?: number;
  backup_user_name?: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
}

export interface ConsultantStatus {
  id: number;
  user_id: number;
  name: string;
  department: string;
  specialty?: string;
  status: 'AVAILABLE' | 'ON_CALL' | 'UNREACHABLE' | 'IN_OT' | 'OFF_DUTY';
  contact_preference: 'CALL' | 'MESSAGE' | 'BOTH';
  phone?: string;
  last_updated: string;
}

export interface RmoDashboardStats {
  current_shift: DutyRosterEntry | null;
  assigned_wards: string[];
  critical_patients: number;
  pending_tasks: number;
  active_escalations: number;
  total_patients: number;
  next_shift?: DutyRosterEntry;
}

// ─── Mock Data (Fallback until backend is wired) ─────
const MOCK_DASHBOARD: RmoDashboardStats = {
  current_shift: {
    id: 1, user_id: 1, user_name: 'Dr. RMO',
    hospital_id: 1, shift_type: 'MORNING',
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '08:00', end_time: '14:00',
    department: 'General Medicine', status: 'ACTIVE',
    created_at: new Date().toISOString(),
  },
  assigned_wards: ['Ward A', 'Ward B', 'ICU'],
  critical_patients: 3,
  pending_tasks: 7,
  active_escalations: 1,
  total_patients: 24,
};

const MOCK_ROSTER: DutyRosterEntry[] = [
  { id: 1, user_id: 1, user_name: 'Dr. Sharma', hospital_id: 1, shift_type: 'MORNING', shift_date: '2026-03-03', start_time: '08:00', end_time: '14:00', department: 'General Medicine', status: 'COMPLETED', created_at: '2026-03-03T08:00:00Z' },
  { id: 2, user_id: 1, user_name: 'Dr. Sharma', hospital_id: 1, shift_type: 'EVENING', shift_date: '2026-03-04', start_time: '14:00', end_time: '20:00', department: 'General Medicine', status: 'SCHEDULED', created_at: '2026-03-03T08:00:00Z' },
  { id: 3, user_id: 1, user_name: 'Dr. Sharma', hospital_id: 1, shift_type: 'NIGHT', shift_date: '2026-03-05', start_time: '20:00', end_time: '08:00', department: 'Emergency', status: 'SCHEDULED', created_at: '2026-03-03T08:00:00Z' },
  { id: 4, user_id: 2, user_name: 'Dr. Patel', hospital_id: 1, shift_type: 'MORNING', shift_date: '2026-03-04', start_time: '08:00', end_time: '14:00', department: 'General Medicine', status: 'SCHEDULED', created_at: '2026-03-03T08:00:00Z' },
  { id: 5, user_id: 1, user_name: 'Dr. Sharma', hospital_id: 1, shift_type: 'MORNING', shift_date: '2026-03-06', start_time: '08:00', end_time: '14:00', department: 'General Medicine', status: 'SCHEDULED', created_at: '2026-03-03T08:00:00Z' },
  { id: 6, user_id: 1, user_name: 'Dr. Sharma', hospital_id: 1, shift_type: 'EVENING', shift_date: '2026-03-07', start_time: '14:00', end_time: '20:00', department: 'Surgery', status: 'SCHEDULED', created_at: '2026-03-03T08:00:00Z' },
  { id: 7, user_id: 1, user_name: 'Dr. Sharma', hospital_id: 1, shift_type: 'NIGHT', shift_date: '2026-03-08', start_time: '20:00', end_time: '08:00', department: 'Emergency', status: 'SCHEDULED', created_at: '2026-03-03T08:00:00Z' },
];

const MOCK_CONSULTANTS: ConsultantStatus[] = [
  { id: 1, user_id: 10, name: 'Dr. Verma', department: 'Cardiology', specialty: 'Interventional', status: 'AVAILABLE', contact_preference: 'BOTH', phone: '+91-9876543210', last_updated: new Date().toISOString() },
  { id: 2, user_id: 11, name: 'Dr. Gupta', department: 'Surgery', specialty: 'General Surgery', status: 'IN_OT', contact_preference: 'MESSAGE', phone: '+91-9876543211', last_updated: new Date().toISOString() },
  { id: 3, user_id: 12, name: 'Dr. Reddy', department: 'Orthopaedics', specialty: 'Joint Replacement', status: 'ON_CALL', contact_preference: 'CALL', phone: '+91-9876543212', last_updated: new Date().toISOString() },
  { id: 4, user_id: 13, name: 'Dr. Singh', department: 'Medicine', specialty: 'Pulmonology', status: 'AVAILABLE', contact_preference: 'BOTH', phone: '+91-9876543213', last_updated: new Date().toISOString() },
  { id: 5, user_id: 14, name: 'Dr. Joshi', department: 'Neurology', specialty: 'Stroke', status: 'UNREACHABLE', contact_preference: 'CALL', phone: '+91-9876543214', last_updated: new Date().toISOString() },
  { id: 6, user_id: 15, name: 'Dr. Khan', department: 'Paediatrics', specialty: 'Neonatology', status: 'OFF_DUTY', contact_preference: 'MESSAGE', phone: '+91-9876543215', last_updated: new Date().toISOString() },
  { id: 7, user_id: 16, name: 'Dr. Desai', department: 'Gynaecology', specialty: 'High-Risk OB', status: 'AVAILABLE', contact_preference: 'BOTH', phone: '+91-9876543216', last_updated: new Date().toISOString() },
  { id: 8, user_id: 17, name: 'Dr. Rao', department: 'Anaesthesia', specialty: 'Critical Care', status: 'IN_OT', contact_preference: 'CALL', phone: '+91-9876543217', last_updated: new Date().toISOString() },
];

// ─── API Service ─────────────────────────────────────
const rmoService = {
  // Dashboard
  getDashboard: async (): Promise<RmoDashboardStats> => {
    try {
      const response = await client.get('/rmo/dashboard');
      return response.data.data || response.data;
    } catch {
      console.warn('RMO dashboard API not available, using mock data');
      return MOCK_DASHBOARD;
    }
  },

  // Duty Roster
  getDutyRoster: async (startDate?: string, endDate?: string): Promise<DutyRosterEntry[]> => {
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await client.get('/rmo/duty-roster', { params });
      return response.data.data || response.data;
    } catch {
      console.warn('RMO roster API not available, using mock data');
      return MOCK_ROSTER;
    }
  },

  requestShiftSwap: async (rosterId: number, targetUserId: number, reason: string): Promise<any> => {
    try {
      const response = await client.post('/rmo/duty-roster/swap', {
        roster_id: rosterId,
        target_user_id: targetUserId,
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('RMO shift swap error:', error);
      throw error;
    }
  },

  // On-Call
  getOnCallSchedule: async (date?: string): Promise<OnCallEntry[]> => {
    try {
      const params: any = {};
      if (date) params.date = date;
      const response = await client.get('/rmo/on-call', { params });
      return response.data.data || response.data;
    } catch {
      console.warn('On-call API not available');
      return [];
    }
  },

  // Consultant Availability
  getConsultantStatus: async (): Promise<ConsultantStatus[]> => {
    try {
      const response = await client.get('/rmo/consultant-status');
      return response.data.data || response.data;
    } catch {
      console.warn('Consultant status API not available, using mock data');
      return MOCK_CONSULTANTS;
    }
  },
};

export default rmoService;
