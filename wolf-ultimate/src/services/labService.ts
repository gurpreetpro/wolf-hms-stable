import client from '../api/client';

// ═══════════════════════════════════════════════════════
//  LAB SERVICE — Sample Worklist, Results, QC, Critical
// ═══════════════════════════════════════════════════════

export interface SampleWorklistItem {
  id: number;
  sample_id: string;          // e.g. "LAB-240303-0042"
  patient_id: number;
  patient_name: string;
  patient_uhid: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  test_name: string;
  test_code: string;
  department: 'HEMATOLOGY' | 'BIOCHEMISTRY' | 'MICROBIOLOGY' | 'SEROLOGY' | 'HISTOPATH' | 'URINE' | 'OTHER';
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
  source: 'OPD' | 'IPD' | 'EMERGENCY' | 'HOME_COLLECTION';
  ward_name?: string;
  ordering_doctor: string;
  collected_at: string;
  received_at?: string;
  status: 'COLLECTED' | 'RECEIVED' | 'PROCESSING' | 'RESULTED' | 'VERIFIED' | 'DISPATCHED';
  tat_minutes?: number;
  tat_remaining?: number;
}

export interface TestResult {
  id: number;
  sample_id: string;
  test_name: string;
  test_code: string;
  parameters: TestParameter[];
  resulted_by?: string;
  resulted_at?: string;
  verified_by?: string;
  verified_at?: string;
  status: 'PENDING' | 'RESULTED' | 'VERIFIED' | 'REJECTED';
  notes?: string;
}

export interface TestParameter {
  name: string;
  value: string;
  unit: string;
  reference_low?: number;
  reference_high?: number;
  reference_text?: string;
  flag?: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL_LOW' | 'CRITICAL_HIGH';
  previous_value?: string;
}

export interface QCRun {
  id: number;
  test_name: string;
  analyzer: string;
  level: 'L1' | 'L2' | 'L3';
  result: number;
  expected_mean: number;
  sd: number;
  status: 'ACCEPTED' | 'REJECTED' | 'WARNING';
  run_by: string;
  run_at: string;
}

export interface CriticalAlert {
  id: number;
  sample_id: string;
  patient_name: string;
  patient_uhid: string;
  test_name: string;
  parameter: string;
  value: string;
  unit: string;
  reference_range: string;
  ordering_doctor: string;
  ward_name?: string;
  notified: boolean;
  notified_to?: string;
  notified_at?: string;
  readback_confirmed: boolean;
  created_at: string;
}

export interface LabDashboardStats {
  pending_samples: number;
  in_progress: number;
  completed_today: number;
  critical_alerts: number;
  average_tat_minutes: number;
  pending_verification: number;
  qc_pending: number;
  departments: { name: string; pending: number; completed: number }[];
}

// ─── Mock Data ───────────────────────────────────────

const MOCK_DASHBOARD: LabDashboardStats = {
  pending_samples: 18,
  in_progress: 12,
  completed_today: 67,
  critical_alerts: 2,
  average_tat_minutes: 42,
  pending_verification: 5,
  qc_pending: 1,
  departments: [
    { name: 'Hematology', pending: 6, completed: 22 },
    { name: 'Biochemistry', pending: 8, completed: 28 },
    { name: 'Microbiology', pending: 2, completed: 8 },
    { name: 'Serology', pending: 1, completed: 5 },
    { name: 'Histopath', pending: 1, completed: 4 },
  ],
};

const MOCK_WORKLIST: SampleWorklistItem[] = [
  { id: 1, sample_id: 'LAB-260303-0042', patient_id: 101, patient_name: 'Rajesh Kumar', patient_uhid: 'UHID-1001', age: 58, gender: 'M', test_name: 'Complete Blood Count', test_code: 'CBC', department: 'HEMATOLOGY', priority: 'STAT', source: 'EMERGENCY', ward_name: 'ER', ordering_doctor: 'Dr. Verma', collected_at: '2026-03-03T08:15:00Z', received_at: '2026-03-03T08:22:00Z', status: 'RECEIVED', tat_minutes: 30, tat_remaining: 12 },
  { id: 2, sample_id: 'LAB-260303-0043', patient_id: 102, patient_name: 'Meena Devi', patient_uhid: 'UHID-1002', age: 45, gender: 'F', test_name: 'Renal Function Test', test_code: 'RFT', department: 'BIOCHEMISTRY', priority: 'URGENT', source: 'IPD', ward_name: 'Ward B', ordering_doctor: 'Dr. Singh', collected_at: '2026-03-03T08:30:00Z', received_at: '2026-03-03T08:40:00Z', status: 'PROCESSING', tat_minutes: 60, tat_remaining: 35 },
  { id: 3, sample_id: 'LAB-260303-0044', patient_id: 103, patient_name: 'Amit Sharma', patient_uhid: 'UHID-1003', age: 32, gender: 'M', test_name: 'Liver Function Test', test_code: 'LFT', department: 'BIOCHEMISTRY', priority: 'ROUTINE', source: 'OPD', ordering_doctor: 'Dr. Patel', collected_at: '2026-03-03T09:00:00Z', status: 'COLLECTED', tat_minutes: 120, tat_remaining: 95 },
  { id: 4, sample_id: 'LAB-260303-0045', patient_id: 104, patient_name: 'Priya Gupta', patient_uhid: 'UHID-1004', age: 28, gender: 'F', test_name: 'Blood Culture', test_code: 'BC', department: 'MICROBIOLOGY', priority: 'URGENT', source: 'IPD', ward_name: 'ICU', ordering_doctor: 'Dr. Reddy', collected_at: '2026-03-03T07:45:00Z', received_at: '2026-03-03T08:00:00Z', status: 'PROCESSING', tat_minutes: 1440, tat_remaining: 1380 },
  { id: 5, sample_id: 'LAB-260303-0046', patient_id: 105, patient_name: 'Suresh Yadav', patient_uhid: 'UHID-1005', age: 65, gender: 'M', test_name: 'HbA1c', test_code: 'HBA1C', department: 'BIOCHEMISTRY', priority: 'ROUTINE', source: 'OPD', ordering_doctor: 'Dr. Joshi', collected_at: '2026-03-03T09:15:00Z', received_at: '2026-03-03T09:25:00Z', status: 'RESULTED', tat_minutes: 90, tat_remaining: 0 },
  { id: 6, sample_id: 'LAB-260303-0047', patient_id: 106, patient_name: 'Kavita Nair', patient_uhid: 'UHID-1006', age: 40, gender: 'F', test_name: 'Thyroid Profile', test_code: 'TFT', department: 'BIOCHEMISTRY', priority: 'ROUTINE', source: 'OPD', ordering_doctor: 'Dr. Khan', collected_at: '2026-03-03T09:30:00Z', status: 'COLLECTED', tat_minutes: 120, tat_remaining: 100 },
  { id: 7, sample_id: 'LAB-260303-0048', patient_id: 107, patient_name: 'Ravi Desai', patient_uhid: 'UHID-1007', age: 72, gender: 'M', test_name: 'PT/INR', test_code: 'PTINR', department: 'HEMATOLOGY', priority: 'STAT', source: 'IPD', ward_name: 'Cardiac ICU', ordering_doctor: 'Dr. Verma', collected_at: '2026-03-03T09:40:00Z', received_at: '2026-03-03T09:45:00Z', status: 'RECEIVED', tat_minutes: 30, tat_remaining: 18 },
  { id: 8, sample_id: 'LAB-260303-0049', patient_id: 108, patient_name: 'Anita Rao', patient_uhid: 'UHID-1008', age: 55, gender: 'F', test_name: 'Urine R/M', test_code: 'URM', department: 'URINE', priority: 'ROUTINE', source: 'IPD', ward_name: 'Ward A', ordering_doctor: 'Dr. Gupta', collected_at: '2026-03-03T09:50:00Z', status: 'COLLECTED', tat_minutes: 60, tat_remaining: 48 },
];

const MOCK_CRITICAL: CriticalAlert[] = [
  { id: 1, sample_id: 'LAB-260303-0039', patient_name: 'Ramesh Tiwari', patient_uhid: 'UHID-0998', test_name: 'Serum Potassium', parameter: 'K+', value: '6.8', unit: 'mEq/L', reference_range: '3.5-5.0', ordering_doctor: 'Dr. Singh', ward_name: 'ICU', notified: true, notified_to: 'Dr. Singh', notified_at: '2026-03-03T08:10:00Z', readback_confirmed: true, created_at: '2026-03-03T08:05:00Z' },
  { id: 2, sample_id: 'LAB-260303-0041', patient_name: 'Sunita Jain', patient_uhid: 'UHID-0999', test_name: 'Hemoglobin', parameter: 'Hb', value: '4.2', unit: 'g/dL', reference_range: '12.0-16.0', ordering_doctor: 'Dr. Patel', ward_name: 'Ward C', notified: false, readback_confirmed: false, created_at: '2026-03-03T09:30:00Z' },
];

// ─── API Service ─────────────────────────────────────
const labService = {
  getDashboard: async (): Promise<LabDashboardStats> => {
    try {
      const response = await client.get('/lab/dashboard');
      return response.data.data || response.data;
    } catch {
      console.warn('Lab dashboard API not available, using mock data');
      return MOCK_DASHBOARD;
    }
  },

  getWorklist: async (department?: string, status?: string): Promise<SampleWorklistItem[]> => {
    try {
      const params: any = {};
      if (department) params.department = department;
      if (status) params.status = status;
      const response = await client.get('/lab/worklist', { params });
      return response.data.data || response.data;
    } catch {
      console.warn('Lab worklist API not available, using mock data');
      let items = MOCK_WORKLIST;
      if (department) items = items.filter(i => i.department === department);
      if (status) items = items.filter(i => i.status === status);
      return items;
    }
  },

  getResult: async (sampleId: string): Promise<TestResult> => {
    try {
      const response = await client.get(`/lab/result/${sampleId}`);
      return response.data.data || response.data;
    } catch {
      console.warn('Lab result API not available');
      return {
        id: 1, sample_id: sampleId, test_name: 'Complete Blood Count', test_code: 'CBC',
        parameters: [
          { name: 'Hemoglobin', value: '13.5', unit: 'g/dL', reference_low: 12, reference_high: 17, flag: 'NORMAL' },
          { name: 'WBC', value: '12800', unit: '/\u03bcL', reference_low: 4000, reference_high: 11000, flag: 'HIGH', previous_value: '9200' },
          { name: 'Platelets', value: '180000', unit: '/\u03bcL', reference_low: 150000, reference_high: 400000, flag: 'NORMAL' },
          { name: 'RBC', value: '4.8', unit: 'M/\u03bcL', reference_low: 4.5, reference_high: 5.5, flag: 'NORMAL' },
          { name: 'Hematocrit', value: '40.2', unit: '%', reference_low: 36, reference_high: 46, flag: 'NORMAL' },
          { name: 'MCV', value: '83.7', unit: 'fL', reference_low: 80, reference_high: 100, flag: 'NORMAL' },
        ],
        status: 'RESULTED',
      };
    }
  },

  submitResult: async (sampleId: string, parameters: TestParameter[], notes?: string): Promise<any> => {
    try {
      const response = await client.post(`/lab/result/${sampleId}`, { parameters, notes });
      return response.data;
    } catch (error) {
      console.error('Submit result error:', error);
      throw error;
    }
  },

  getCriticalAlerts: async (): Promise<CriticalAlert[]> => {
    try {
      const response = await client.get('/lab/critical-alerts');
      return response.data.data || response.data;
    } catch {
      console.warn('Critical alerts API not available, using mock data');
      return MOCK_CRITICAL;
    }
  },

  getPendingVerification: async (): Promise<TestResult[]> => {
    try {
      const response = await client.get('/lab/pending-verification');
      return response.data.data || response.data;
    } catch {
      console.warn('Pending verification API not available');
      return [];
    }
  },

  verifyResult: async (resultId: number, action: 'APPROVE' | 'REJECT', notes?: string): Promise<any> => {
    try {
      const response = await client.post(`/lab/verify/${resultId}`, { action, notes });
      return response.data;
    } catch (error) {
      console.error('Verify result error:', error);
      throw error;
    }
  },

  acknowledgeCritical: async (alertId: number, notifiedTo: string, readbackConfirmed: boolean): Promise<any> => {
    try {
      const response = await client.post(`/lab/critical-alert/${alertId}/acknowledge`, {
        notified_to: notifiedTo,
        readback_confirmed: readbackConfirmed,
      });
      return response.data;
    } catch (error) {
      console.error('Acknowledge critical error:', error);
      throw error;
    }
  },

  // ─── Legacy methods (used by Doctor's LabOrderScreen.tsx) ───

  getPatientLabOrders: async (patientId: string): Promise<LabOrder[]> => {
    try {
      const response = await client.get(`/lab/orders/${patientId}`);
      return response.data.data || response.data;
    } catch {
      console.warn('Lab orders API not available, using mock data');
      return MOCK_ORDERS.filter(o => o.patient_id === patientId);
    }
  },

  getAvailableTests: async (): Promise<LabTest[]> => {
    try {
      const response = await client.get('/lab/tests');
      return response.data.data || response.data;
    } catch {
      console.warn('Lab tests API not available, using mock data');
      return MOCK_TESTS;
    }
  },

  getLabResults: async (orderId: string): Promise<LabResult[]> => {
    try {
      const response = await client.get(`/lab/results/${orderId}`);
      return response.data.data || response.data;
    } catch {
      console.warn('Lab results API not available, using mock data');
      return MOCK_RESULTS.filter(r => r.order_id === orderId);
    }
  },

  createLabOrder: async (data: { patient_id: string; visit_id?: string; test_ids: string[]; priority: string; clinical_notes?: string }): Promise<any> => {
    try {
      const response = await client.post('/lab/orders', data);
      return response.data;
    } catch (error) {
      console.error('Create lab order error:', error);
      throw error;
    }
  },
};

export default labService;

// ═══════════════════════════════════════════════════════
//  LEGACY TYPES — Backward compatibility for Doctor stack
//  Used by: screens/doctor/LabOrderScreen.tsx
// ═══════════════════════════════════════════════════════

export interface LabTest {
  id: string;
  name: string;
  category: string;
  price: number;
  department?: string;
  tat_hours?: number;
}

export interface LabOrder {
  id: string;
  patient_id: string;
  visit_id?: string;
  tests: { test_id: string; test_name: string }[];
  priority: 'routine' | 'urgent' | 'stat';
  status: string;
  clinical_notes?: string;
  created_at: string;
  ordering_doctor?: string;
}

export interface LabResult {
  id: string;
  order_id: string;
  test_name: string;
  value: string;
  unit: string;
  normal_range: string;
  is_abnormal: boolean;
  notes?: string;
}

// Legacy mock data
const MOCK_TESTS: LabTest[] = [
  { id: '1', name: 'Complete Blood Count', category: 'Hematology', price: 350, department: 'HEMATOLOGY', tat_hours: 2 },
  { id: '2', name: 'Liver Function Test', category: 'Biochemistry', price: 800, department: 'BIOCHEMISTRY', tat_hours: 4 },
  { id: '3', name: 'Renal Function Test', category: 'Biochemistry', price: 700, department: 'BIOCHEMISTRY', tat_hours: 4 },
  { id: '4', name: 'Thyroid Profile', category: 'Biochemistry', price: 650, department: 'BIOCHEMISTRY', tat_hours: 6 },
  { id: '5', name: 'HbA1c', category: 'Biochemistry', price: 450, department: 'BIOCHEMISTRY', tat_hours: 3 },
  { id: '6', name: 'Blood Culture', category: 'Microbiology', price: 900, department: 'MICROBIOLOGY', tat_hours: 48 },
  { id: '7', name: 'Urine Routine', category: 'Urine', price: 200, department: 'URINE', tat_hours: 2 },
  { id: '8', name: 'PT/INR', category: 'Hematology', price: 400, department: 'HEMATOLOGY', tat_hours: 1 },
];

const MOCK_ORDERS: LabOrder[] = [
  { id: '1', patient_id: '101', tests: [{ test_id: '1', test_name: 'Complete Blood Count' }, { test_id: '2', test_name: 'Liver Function Test' }], priority: 'routine', status: 'completed', created_at: '2026-03-02T10:00:00Z', ordering_doctor: 'Dr. Verma' },
  { id: '2', patient_id: '101', tests: [{ test_id: '3', test_name: 'Renal Function Test' }], priority: 'urgent', status: 'processing', created_at: '2026-03-03T08:30:00Z', ordering_doctor: 'Dr. Singh' },
];

const MOCK_RESULTS: LabResult[] = [
  { id: '1', order_id: '1', test_name: 'Hemoglobin', value: '13.5', unit: 'g/dL', normal_range: '12-17 g/dL', is_abnormal: false },
  { id: '2', order_id: '1', test_name: 'WBC', value: '12800', unit: '/μL', normal_range: '4000-11000 /μL', is_abnormal: true, notes: 'Mildly elevated' },
  { id: '3', order_id: '1', test_name: 'ALT', value: '45', unit: 'U/L', normal_range: '7-56 U/L', is_abnormal: false },
  { id: '4', order_id: '1', test_name: 'AST', value: '38', unit: 'U/L', normal_range: '10-40 U/L', is_abnormal: false },
];
