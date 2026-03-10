import client from '../api/client';

// ═══════════════════════════════════════════════════════
//  RECEPTION SERVICE — Registration, Tokens, Queue, Billing
// ═══════════════════════════════════════════════════════

export interface PatientRegistration {
  id: number; uhid: string; name: string; phone: string;
  age: number; gender: 'M' | 'F' | 'O'; aadhaar?: string; abha_id?: string;
  address?: string; blood_group?: string; guardian_name?: string;
  insurance_provider?: string; insurance_id?: string;
  registration_type: 'NEW' | 'REVISIT' | 'EMERGENCY';
  created_at: string;
}

export interface TokenItem {
  id: number; token_no: string; patient_name: string; patient_uhid: string;
  doctor_name: string; department: string; appointment_type: 'WALK_IN' | 'SCHEDULED' | 'FOLLOW_UP';
  status: 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  issued_at: string; estimated_wait?: number; position?: number;
}

export interface AppointmentSlot {
  id: number; doctor_name: string; department: string;
  date: string; time: string; duration_min: number;
  status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED';
  patient_name?: string; patient_uhid?: string;
}

export interface ReceptionDashboardStats {
  registrations_today: number; tokens_issued: number; active_in_queue: number;
  no_shows: number; walk_ins: number; scheduled: number;
  revenue_collected: number; avg_wait_time_min: number;
}

// ─── Mock Data ───────────────────────────────────────

const MOCK_DASHBOARD: ReceptionDashboardStats = {
  registrations_today: 34, tokens_issued: 42, active_in_queue: 12,
  no_shows: 3, walk_ins: 18, scheduled: 24,
  revenue_collected: 12600, avg_wait_time_min: 14,
};

const MOCK_TOKENS: TokenItem[] = [
  { id: 1, token_no: 'T-001', patient_name: 'Rakesh Kumar', patient_uhid: 'UHID-5001', doctor_name: 'Dr. Sharma', department: 'Cardiology', appointment_type: 'SCHEDULED', status: 'WAITING', issued_at: '2026-03-05T09:00:00Z', estimated_wait: 8, position: 1 },
  { id: 2, token_no: 'T-002', patient_name: 'Anita Devi', patient_uhid: 'UHID-5002', doctor_name: 'Dr. Sharma', department: 'Cardiology', appointment_type: 'WALK_IN', status: 'WAITING', issued_at: '2026-03-05T09:05:00Z', estimated_wait: 18, position: 2 },
  { id: 3, token_no: 'T-003', patient_name: 'Vijay Singh', patient_uhid: 'UHID-5003', doctor_name: 'Dr. Patel', department: 'Medicine', appointment_type: 'FOLLOW_UP', status: 'IN_CONSULTATION', issued_at: '2026-03-05T08:45:00Z' },
  { id: 4, token_no: 'T-004', patient_name: 'Sunita Gupta', patient_uhid: 'UHID-5004', doctor_name: 'Dr. Patel', department: 'Medicine', appointment_type: 'SCHEDULED', status: 'WAITING', issued_at: '2026-03-05T09:10:00Z', estimated_wait: 25, position: 3 },
  { id: 5, token_no: 'T-005', patient_name: 'Mohan Lal', patient_uhid: 'UHID-5005', doctor_name: 'Dr. Reddy', department: 'Orthopedics', appointment_type: 'WALK_IN', status: 'WAITING', issued_at: '2026-03-05T09:15:00Z', estimated_wait: 10, position: 1 },
  { id: 6, token_no: 'T-006', patient_name: 'Priya Nair', patient_uhid: 'UHID-2004', doctor_name: 'Dr. Khan', department: 'Gynecology', appointment_type: 'SCHEDULED', status: 'COMPLETED', issued_at: '2026-03-05T08:30:00Z' },
  { id: 7, token_no: 'T-007', patient_name: 'Arun Mehta', patient_uhid: 'UHID-5006', doctor_name: 'Dr. Singh', department: 'ENT', appointment_type: 'WALK_IN', status: 'NO_SHOW', issued_at: '2026-03-05T08:00:00Z' },
];

// ─── API Service ─────────────────────────────────────
const receptionService = {
  getDashboard: async (): Promise<ReceptionDashboardStats> => {
    try { const r = await client.get('/reception/dashboard'); return r.data.data || r.data; }
    catch { return MOCK_DASHBOARD; }
  },

  getTokenQueue: async (department?: string): Promise<TokenItem[]> => {
    try { const r = await client.get('/reception/queue', { params: department ? { department } : {} }); return r.data.data || r.data; }
    catch { let items = MOCK_TOKENS; if (department) items = items.filter(t => t.department === department); return items; }
  },

  issueToken: async (data: { patient_uhid: string; doctor_id: number; appointment_type: string }): Promise<TokenItem> => {
    try { const r = await client.post('/reception/token', data); return r.data; }
    catch (e) { console.error('Token issue error:', e); throw e; }
  },

  registerPatient: async (data: Partial<PatientRegistration>): Promise<PatientRegistration> => {
    try { const r = await client.post('/reception/register', data); return r.data; }
    catch (e) { console.error('Registration error:', e); throw e; }
  },

  searchPatient: async (query: string): Promise<PatientRegistration[]> => {
    try { const r = await client.get('/reception/patient-search', { params: { q: query } }); return r.data.data || r.data; }
    catch { return []; }
  },

  callToken: async (tokenId: number): Promise<void> => {
    try { await client.post(`/reception/token/${tokenId}/call`); }
    catch (e) { console.error('Call token error:', e); throw e; }
  },

  cancelToken: async (tokenId: number): Promise<void> => {
    try { await client.post(`/reception/token/${tokenId}/cancel`); }
    catch (e) { console.error('Cancel token error:', e); throw e; }
  },
};

export default receptionService;
