import client from '../api/client';

// ═══════════════════════════════════════════════════════
//  MEDICAL RECORDS (HIM) SERVICE
// ═══════════════════════════════════════════════════════

export interface MedicalRecord {
  id: number; patient_name: string; uhid: string; mr_number: string;
  type: 'IPD' | 'OPD' | 'EMERGENCY' | 'DAYCARE' | 'MLC';
  admission_date: string; discharge_date?: string;
  department: string; consultant: string;
  status: 'ACTIVE' | 'PENDING_CODING' | 'CODED' | 'FILED' | 'RETRIEVED' | 'ARCHIVED';
  location?: string; icd_codes?: string[];
}

export interface RecordRequest {
  id: number; requested_by: string; department: string;
  patient_uhid: string; patient_name: string; mr_number: string;
  purpose: 'LEGAL' | 'INSURANCE' | 'FOLLOW_UP' | 'RESEARCH' | 'AUDIT' | 'MLC';
  requested_date: string; due_date: string;
  status: 'PENDING' | 'RETRIEVED' | 'ISSUED' | 'RETURNED';
  priority: 'URGENT' | 'ROUTINE';
}

export interface ICDCoding {
  id: number; mr_number: string; patient_name: string; uhid: string;
  department: string; discharge_date: string;
  primary_diagnosis: string; primary_icd: string;
  secondary_diagnoses: { diagnosis: string; icd: string }[];
  procedures: { name: string; code: string }[];
  coded_by?: string; coded_date?: string;
  status: 'PENDING' | 'CODED' | 'VERIFIED';
}

export interface HIMDashboardStats {
  total_records: number; pending_filing: number; pending_coding: number;
  active_requests: number; mlc_pending: number;
  coded_today: number; filed_today: number; retrieval_pending: number;
}

const MOCK_DASHBOARD: HIMDashboardStats = {
  total_records: 12480, pending_filing: 18, pending_coding: 12,
  active_requests: 6, mlc_pending: 2,
  coded_today: 8, filed_today: 14, retrieval_pending: 3,
};

const MOCK_RECORDS: MedicalRecord[] = [
  { id: 1, patient_name: 'Ramesh Gupta', uhid: 'UHID-1001', mr_number: 'MR-2026-0501', type: 'IPD', admission_date: '2026-02-28', discharge_date: '2026-03-04', department: 'Cardiology', consultant: 'Dr. Mehra', status: 'PENDING_CODING', icd_codes: [] },
  { id: 2, patient_name: 'Anita Sharma', uhid: 'UHID-2004', mr_number: 'MR-2026-0502', type: 'IPD', admission_date: '2026-03-01', discharge_date: '2026-03-03', department: 'General Surgery', consultant: 'Dr. Kapoor', status: 'CODED', icd_codes: ['K35.80', 'Z87.19'], location: 'Rack-A-12' },
  { id: 3, patient_name: 'Vijay Singh', uhid: 'UHID-5003', mr_number: 'MR-2026-0503', type: 'MLC', admission_date: '2026-03-02', department: 'Emergency', consultant: 'Dr. Reddy', status: 'ACTIVE' },
  { id: 4, patient_name: 'Priya Nair', uhid: 'UHID-2004', mr_number: 'MR-2026-0504', type: 'OPD', admission_date: '2026-03-04', department: 'Dermatology', consultant: 'Dr. Iyer', status: 'FILED', location: 'Rack-C-08' },
  { id: 5, patient_name: 'Suresh Patel', uhid: 'UHID-3102', mr_number: 'MR-2026-0505', type: 'DAYCARE', admission_date: '2026-03-03', discharge_date: '2026-03-03', department: 'Ophthalmology', consultant: 'Dr. Joshi', status: 'PENDING_CODING' },
];

const MOCK_REQUESTS: RecordRequest[] = [
  { id: 1, requested_by: 'Dr. Mehra', department: 'Cardiology', patient_uhid: 'UHID-1001', patient_name: 'Ramesh Gupta', mr_number: 'MR-2026-0501', purpose: 'FOLLOW_UP', requested_date: '2026-03-05', due_date: '2026-03-06', status: 'PENDING', priority: 'ROUTINE' },
  { id: 2, requested_by: 'Legal Dept', department: 'Admin', patient_uhid: 'UHID-5003', patient_name: 'Vijay Singh', mr_number: 'MR-2026-0503', purpose: 'MLC', requested_date: '2026-03-05', due_date: '2026-03-05', status: 'PENDING', priority: 'URGENT' },
  { id: 3, requested_by: 'Insurance TPA', department: 'Billing', patient_uhid: 'UHID-2004', patient_name: 'Anita Sharma', mr_number: 'MR-2026-0502', purpose: 'INSURANCE', requested_date: '2026-03-04', due_date: '2026-03-07', status: 'RETRIEVED', priority: 'ROUTINE' },
];

const medRecordsService = {
  getDashboard: async (): Promise<HIMDashboardStats> => {
    try { const r = await client.get('/him/dashboard'); return r.data.data || r.data; }
    catch { return MOCK_DASHBOARD; }
  },
  getRecords: async (): Promise<MedicalRecord[]> => {
    try { const r = await client.get('/him/records'); return r.data.data || r.data; }
    catch { return MOCK_RECORDS; }
  },
  getRequests: async (): Promise<RecordRequest[]> => {
    try { const r = await client.get('/him/requests'); return r.data.data || r.data; }
    catch { return MOCK_REQUESTS; }
  },
  createRequest: async (data: {patient_id: number; purpose: string; priority: string}): Promise<void> => {
    try { await client.post('/him/requests', data); }
    catch (e) { console.error('Request create error:', e); throw e; }
  },
  updateRecordStatus: async (id: number, status: string): Promise<void> => {
    try { await client.patch(`/him/records/${id}`, { status }); }
    catch (e) { console.error('Record update error:', e); throw e; }
  },
  submitCoding: async (coding: Partial<ICDCoding>): Promise<void> => {
    try { await client.post('/him/coding', coding); }
    catch (e) { console.error('Coding error:', e); throw e; }
  },
  getMLCCases: async (): Promise<MedicalRecord[]> => {
    try { const r = await client.get('/him/mlc'); return r.data.data || r.data; }
    catch { return []; }
  },
  getAuditTrail: async (): Promise<{id: number; action: string; record_id: number; performed_by: string; timestamp: string}[]> => {
    try { const r = await client.get('/him/audit'); return r.data.data || r.data; }
    catch { return []; }
  },
};

export default medRecordsService;
