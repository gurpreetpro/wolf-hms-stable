import client from '../api/client';

// ═══════════════════════════════════════════════════════
//  RADIOLOGY SERVICE — Imaging Worklist, Reports, Dose
// ═══════════════════════════════════════════════════════

export interface ImagingOrder {
  id: number; accession_no: string; patient_name: string; patient_uhid: string;
  modality: 'X-RAY' | 'CT' | 'MRI' | 'USG' | 'MAMMOGRAPHY' | 'FLUOROSCOPY';
  study_description: string; body_part: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
  status: 'ORDERED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'REPORTED' | 'VERIFIED';
  ordering_doctor: string; department: string;
  ordered_at: string; scheduled_at?: string;
  contrast: boolean; contrast_agent?: string;
  clinical_history?: string;
}

export interface RadiologyReport {
  id: number; accession_no: string; modality: string;
  findings: string; impression: string; recommendation: string;
  reported_by: string; verified_by?: string;
  status: 'DRAFT' | 'FINAL' | 'ADDENDUM';
  reported_at: string; verified_at?: string;
  critical_finding: boolean;
}

export interface RadiologyDashboardStats {
  pending_orders: number; in_progress: number; completed_today: number;
  pending_reports: number; critical_findings: number;
  avg_tat_min: number; contrast_studies: number;
}

// ─── Mock Data ───────────────────────────────────────

const MOCK_DASHBOARD: RadiologyDashboardStats = {
  pending_orders: 8, in_progress: 3, completed_today: 22,
  pending_reports: 5, critical_findings: 1,
  avg_tat_min: 35, contrast_studies: 4,
};

const MOCK_ORDERS: ImagingOrder[] = [
  { id: 1, accession_no: 'RAD-260305-001', patient_name: 'Rakesh Kumar', patient_uhid: 'UHID-5001', modality: 'CT', study_description: 'CT Chest with Contrast', body_part: 'Chest', priority: 'STAT', status: 'ORDERED', ordering_doctor: 'Dr. Sharma', department: 'Cardiology', ordered_at: '2026-03-05T09:00:00Z', contrast: true, contrast_agent: 'Iohexol 100mL', clinical_history: 'Suspected pulmonary embolism. SOB, chest pain, D-dimer elevated.' },
  { id: 2, accession_no: 'RAD-260305-002', patient_name: 'Anita Devi', patient_uhid: 'UHID-5002', modality: 'X-RAY', study_description: 'Chest PA View', body_part: 'Chest', priority: 'ROUTINE', status: 'SCHEDULED', ordering_doctor: 'Dr. Patel', department: 'Medicine', ordered_at: '2026-03-05T08:30:00Z', scheduled_at: '2026-03-05T10:00:00Z', contrast: false, clinical_history: 'Pre-op evaluation. Known hypertension.' },
  { id: 3, accession_no: 'RAD-260305-003', patient_name: 'Vijay Singh', patient_uhid: 'UHID-5003', modality: 'MRI', study_description: 'MRI Brain with Contrast', body_part: 'Brain', priority: 'URGENT', status: 'IN_PROGRESS', ordering_doctor: 'Dr. Reddy', department: 'Neurology', ordered_at: '2026-03-05T07:45:00Z', contrast: true, contrast_agent: 'Gadolinium 15mL', clinical_history: 'New onset seizures. Rule out SOL.' },
  { id: 4, accession_no: 'RAD-260305-004', patient_name: 'Sunita Gupta', patient_uhid: 'UHID-5004', modality: 'USG', study_description: 'USG Abdomen & Pelvis', body_part: 'Abdomen', priority: 'ROUTINE', status: 'COMPLETED', ordering_doctor: 'Dr. Khan', department: 'Gynecology', ordered_at: '2026-03-05T08:00:00Z', contrast: false },
  { id: 5, accession_no: 'RAD-260305-005', patient_name: 'Mohan Lal', patient_uhid: 'UHID-5005', modality: 'X-RAY', study_description: 'X-Ray Knee AP/Lat', body_part: 'Knee', priority: 'ROUTINE', status: 'REPORTED', ordering_doctor: 'Dr. Reddy', department: 'Orthopedics', ordered_at: '2026-03-05T07:30:00Z', contrast: false },
  { id: 6, accession_no: 'RAD-260305-006', patient_name: 'Priya Nair', patient_uhid: 'UHID-2004', modality: 'MAMMOGRAPHY', study_description: 'Bilateral Mammography', body_part: 'Breast', priority: 'ROUTINE', status: 'ORDERED', ordering_doctor: 'Dr. Khan', department: 'Gynecology', ordered_at: '2026-03-05T09:20:00Z', contrast: false },
  { id: 7, accession_no: 'RAD-260305-007', patient_name: 'Sunil Verma', patient_uhid: 'UHID-3001', modality: 'CT', study_description: 'CT Abdomen with Contrast', body_part: 'Abdomen', priority: 'URGENT', status: 'ORDERED', ordering_doctor: 'Dr. Patel', department: 'Surgery', ordered_at: '2026-03-05T09:30:00Z', contrast: true, contrast_agent: 'Iohexol 150mL', clinical_history: 'Acute abdomen. Rule out appendicitis vs perforation.' },
];

// ─── API Service ─────────────────────────────────────
const radiologyService = {
  getDashboard: async (): Promise<RadiologyDashboardStats> => {
    try { const r = await client.get('/radiology/dashboard'); return r.data.data || r.data; }
    catch { return MOCK_DASHBOARD; }
  },

  getWorklist: async (modality?: string): Promise<ImagingOrder[]> => {
    try { const r = await client.get('/radiology/worklist', { params: modality ? { modality } : {} }); return r.data.data || r.data; }
    catch { let items = MOCK_ORDERS; if (modality) items = items.filter(o => o.modality === modality); return items; }
  },

  getOrder: async (id: number): Promise<ImagingOrder> => {
    try { const r = await client.get(`/radiology/order/${id}`); return r.data; }
    catch { return MOCK_ORDERS.find(o => o.id === id) || MOCK_ORDERS[0]; }
  },

  startScan: async (orderId: number): Promise<void> => {
    try { await client.post(`/radiology/order/${orderId}/start`); }
    catch (e) { console.error('Start scan error:', e); throw e; }
  },

  completeScan: async (orderId: number, data: { dose_mgy?: number; kvp?: number; ma?: number }): Promise<void> => {
    try { await client.post(`/radiology/order/${orderId}/complete`, data); }
    catch (e) { console.error('Complete scan error:', e); throw e; }
  },

  submitReport: async (orderId: number, report: Partial<RadiologyReport>): Promise<void> => {
    try { await client.post(`/radiology/order/${orderId}/report`, report); }
    catch (e) { console.error('Report error:', e); throw e; }
  },
};

export default radiologyService;
