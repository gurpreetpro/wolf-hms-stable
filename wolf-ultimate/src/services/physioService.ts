import client from '../api/client';

// ═══════════════════════════════════════════════════════
//  PHYSIO SERVICE — PT Sessions, Exercise Rx, Outcomes
// ═══════════════════════════════════════════════════════

export interface PhysioPatient {
  id: number; name: string; uhid: string; age: number; gender: 'M' | 'F' | 'O';
  diagnosis: string; referring_doctor: string; department: string;
  sessions_completed: number; sessions_planned: number;
  status: 'ACTIVE' | 'DISCHARGED' | 'ON_HOLD';
  next_session?: string;
}

export interface ExerciseRx {
  id: number; name: string; category: 'ROM' | 'STRENGTHENING' | 'STRETCHING' | 'BALANCE' | 'GAIT' | 'BREATHING';
  body_part: string; sets: number; reps: number; hold_sec?: number;
  intensity: 'LOW' | 'MODERATE' | 'HIGH';
  instructions: string; precautions?: string;
}

export interface SessionLog {
  id: number; patient_name: string; patient_uhid: string;
  date: string; duration_min: number;
  exercises_done: number; pain_before: number; pain_after: number;
  notes: string; status: 'COMPLETED' | 'PARTIAL' | 'CANCELLED';
  therapist: string;
}

export interface PhysioDashboardStats {
  active_patients: number; sessions_today: number; sessions_completed: number;
  pending_assessments: number; avg_pain_reduction: number;
  discharge_ready: number;
}

// ─── Mock Data ───────────────────────────────────────

const MOCK_DASHBOARD: PhysioDashboardStats = {
  active_patients: 18, sessions_today: 12, sessions_completed: 7,
  pending_assessments: 3, avg_pain_reduction: 2.4,
  discharge_ready: 2,
};

const MOCK_PATIENTS: PhysioPatient[] = [
  { id: 1, name: 'Rakesh Kumar', uhid: 'UHID-5001', age: 52, gender: 'M', diagnosis: 'Post TKR — Right Knee', referring_doctor: 'Dr. Reddy', department: 'Orthopedics', sessions_completed: 6, sessions_planned: 15, status: 'ACTIVE', next_session: '2026-03-05T10:00:00Z' },
  { id: 2, name: 'Anita Devi', uhid: 'UHID-5002', age: 38, gender: 'F', diagnosis: 'Frozen Shoulder — Left', referring_doctor: 'Dr. Reddy', department: 'Orthopedics', sessions_completed: 3, sessions_planned: 10, status: 'ACTIVE', next_session: '2026-03-05T11:00:00Z' },
  { id: 3, name: 'Vijay Singh', uhid: 'UHID-5003', age: 64, gender: 'M', diagnosis: 'Stroke Rehab — Left Hemiparesis', referring_doctor: 'Dr. Sharma', department: 'Neurology', sessions_completed: 10, sessions_planned: 20, status: 'ACTIVE', next_session: '2026-03-05T14:00:00Z' },
  { id: 4, name: 'Sunita Gupta', uhid: 'UHID-5004', age: 45, gender: 'F', diagnosis: 'Lumbar Disc Prolapse', referring_doctor: 'Dr. Reddy', department: 'Orthopedics', sessions_completed: 8, sessions_planned: 12, status: 'ACTIVE' },
  { id: 5, name: 'Mohan Lal', uhid: 'UHID-5005', age: 70, gender: 'M', diagnosis: 'Post Hip Fracture', referring_doctor: 'Dr. Reddy', department: 'Orthopedics', sessions_completed: 12, sessions_planned: 12, status: 'DISCHARGED' },
];

const MOCK_SESSIONS: SessionLog[] = [
  { id: 1, patient_name: 'Rakesh Kumar', patient_uhid: 'UHID-5001', date: '2026-03-05', duration_min: 45, exercises_done: 6, pain_before: 6, pain_after: 3, notes: 'Good ROM improvement. Flexion 95° today. Progressed to resistance band.', status: 'COMPLETED', therapist: 'PT Neha' },
  { id: 2, patient_name: 'Anita Devi', patient_uhid: 'UHID-5002', date: '2026-03-05', duration_min: 30, exercises_done: 4, pain_before: 7, pain_after: 5, notes: 'Pendulum exercises tolerated well. Abduction limited to 60°.', status: 'COMPLETED', therapist: 'PT Neha' },
  { id: 3, patient_name: 'Vijay Singh', patient_uhid: 'UHID-5003', date: '2026-03-04', duration_min: 60, exercises_done: 8, pain_before: 4, pain_after: 3, notes: 'Gait training with walker — 10m walk improved. Standing balance 30s.', status: 'COMPLETED', therapist: 'PT Rahul' },
  { id: 4, patient_name: 'Sunita Gupta', patient_uhid: 'UHID-5004', date: '2026-03-04', duration_min: 20, exercises_done: 2, pain_before: 8, pain_after: 7, notes: 'High pain today. Only gentle exercises done. Hot pack applied.', status: 'PARTIAL', therapist: 'PT Neha' },
];

// ─── API Service ─────────────────────────────────────
const physioService = {
  getDashboard: async (): Promise<PhysioDashboardStats> => {
    try { const r = await client.get('/physio/dashboard'); return r.data.data || r.data; }
    catch { return MOCK_DASHBOARD; }
  },

  getPatients: async (): Promise<PhysioPatient[]> => {
    try { const r = await client.get('/physio/patients'); return r.data.data || r.data; }
    catch { return MOCK_PATIENTS; }
  },

  getSessions: async (): Promise<SessionLog[]> => {
    try { const r = await client.get('/physio/sessions'); return r.data.data || r.data; }
    catch { return MOCK_SESSIONS; }
  },

  logSession: async (session: Partial<SessionLog>): Promise<void> => {
    try { await client.post('/physio/sessions', session); }
    catch (e) { console.error('Session log error:', e); throw e; }
  },

  getPlanById: async (planId: number): Promise<{exercises: ExerciseRx[]} | null> => {
    try { const r = await client.get(`/physio/plans/${planId}`); return r.data.data || r.data; }
    catch { return null; }
  },

  createPlan: async (data: {patient_id: number; diagnosis: string; goals: string; exercises?: Partial<ExerciseRx>[]}): Promise<void> => {
    try { await client.post('/physio/plans', data); }
    catch (e) { console.error('Plan create error:', e); throw e; }
  },

  getExerciseLibrary: async (): Promise<ExerciseRx[]> => {
    try { const r = await client.get('/physio/exercises'); return r.data.data || r.data; }
    catch { return []; }
  },

  prescribeExercise: async (patientId: number, exercises: ExerciseRx[]): Promise<void> => {
    try { await client.post('/physio/plans', { patient_id: patientId, exercises, diagnosis: 'Prescribed' }); }
    catch (e) { console.error('Exercise Rx error:', e); throw e; }
  },
};

export default physioService;

