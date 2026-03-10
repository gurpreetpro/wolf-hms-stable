import client from '../api/client';

// ═══════════════════════════════════════════════════════
//  PHARMACY SERVICE — Prescriptions, Dispensing, Inventory
// ═══════════════════════════════════════════════════════

export interface PrescriptionItem {
  id: number;
  prescription_id: string;
  patient_id: number;
  patient_name: string;
  patient_uhid: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  prescribing_doctor: string;
  department: string;
  source: 'OPD' | 'IPD' | 'EMERGENCY' | 'DISCHARGE';
  ward_name?: string;
  bed_no?: string;
  created_at: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
  status: 'PENDING' | 'PROCESSING' | 'DISPENSED' | 'PARTIAL' | 'CANCELLED';
  items: RxItem[];
  notes?: string;
}

export interface RxItem {
  drug_name: string;
  generic_name?: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: number;
  dispensed_quantity?: number;
  stock_available: boolean;
  substitute_available?: boolean;
  is_controlled: boolean;
  interaction_warning?: string;
}

export interface DrugItem {
  id: number;
  name: string;
  generic_name: string;
  category: string;
  batch_no: string;
  expiry_date: string;
  stock_quantity: number;
  unit: string;
  reorder_level: number;
  mrp: number;
  location: string;
  is_controlled: boolean;
  schedule?: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRED';
}

export interface DispensingRecord {
  id: number;
  prescription_id: string;
  patient_name: string;
  items_dispensed: number;
  total_items: number;
  dispensed_by: string;
  dispensed_at: string;
  total_amount: number;
}

export interface PharmacyDashboardStats {
  pending_prescriptions: number;
  dispensed_today: number;
  stat_orders: number;
  out_of_stock_items: number;
  expiring_soon: number;
  controlled_pending: number;
  revenue_today: number;
  interaction_alerts: number;
}

// ─── Mock Data ───────────────────────────────────────

const MOCK_DASHBOARD: PharmacyDashboardStats = {
  pending_prescriptions: 14,
  dispensed_today: 52,
  stat_orders: 3,
  out_of_stock_items: 5,
  expiring_soon: 8,
  controlled_pending: 2,
  revenue_today: 28450,
  interaction_alerts: 1,
};

const MOCK_PRESCRIPTIONS: PrescriptionItem[] = [
  {
    id: 1, prescription_id: 'RX-260303-0101', patient_id: 201, patient_name: 'Anil Kapoor', patient_uhid: 'UHID-2001', age: 55, gender: 'M',
    prescribing_doctor: 'Dr. Sharma', department: 'Cardiology', source: 'OPD', created_at: '2026-03-03T09:15:00Z', priority: 'ROUTINE', status: 'PENDING',
    items: [
      { drug_name: 'Atorvastatin 20mg', generic_name: 'Atorvastatin', dosage: '20mg', route: 'Oral', frequency: 'OD (night)', duration: '30 days', quantity: 30, stock_available: true, is_controlled: false },
      { drug_name: 'Aspirin 75mg', generic_name: 'Aspirin', dosage: '75mg', route: 'Oral', frequency: 'OD', duration: '30 days', quantity: 30, stock_available: true, is_controlled: false },
      { drug_name: 'Metoprolol 25mg', generic_name: 'Metoprolol', dosage: '25mg', route: 'Oral', frequency: 'BD', duration: '30 days', quantity: 60, stock_available: true, is_controlled: false },
    ],
  },
  {
    id: 2, prescription_id: 'RX-260303-0102', patient_id: 202, patient_name: 'Sunita Devi', patient_uhid: 'UHID-2002', age: 62, gender: 'F',
    prescribing_doctor: 'Dr. Patel', department: 'Medicine', source: 'IPD', ward_name: 'Ward B', bed_no: 'B-12', created_at: '2026-03-03T09:30:00Z', priority: 'URGENT', status: 'PENDING',
    items: [
      { drug_name: 'Insulin Glargine 100IU/mL', generic_name: 'Insulin Glargine', dosage: '100IU/mL', route: 'SC', frequency: 'OD (night)', duration: '10 days', quantity: 1, stock_available: true, is_controlled: false },
      { drug_name: 'Metformin 500mg', generic_name: 'Metformin', dosage: '500mg', route: 'Oral', frequency: 'BD', duration: '30 days', quantity: 60, stock_available: true, is_controlled: false },
      { drug_name: 'Glimepiride 2mg', generic_name: 'Glimepiride', dosage: '2mg', route: 'Oral', frequency: 'OD', duration: '30 days', quantity: 30, stock_available: false, substitute_available: true, is_controlled: false },
    ],
  },
  {
    id: 3, prescription_id: 'RX-260303-0103', patient_id: 203, patient_name: 'Ravi Teja', patient_uhid: 'UHID-2003', age: 40, gender: 'M',
    prescribing_doctor: 'Dr. Reddy', department: 'Emergency', source: 'EMERGENCY', created_at: '2026-03-03T10:00:00Z', priority: 'STAT', status: 'PENDING',
    items: [
      { drug_name: 'Morphine 10mg/mL', generic_name: 'Morphine Sulfate', dosage: '10mg', route: 'IV', frequency: 'SOS', duration: 'Single dose', quantity: 1, stock_available: true, is_controlled: true, interaction_warning: 'CNS depressant — monitor respiratory rate' },
      { drug_name: 'Ondansetron 4mg', generic_name: 'Ondansetron', dosage: '4mg', route: 'IV', frequency: 'TDS', duration: '2 days', quantity: 6, stock_available: true, is_controlled: false },
    ],
    notes: 'Post-surgical pain management. Monitor vitals q1h.',
  },
  {
    id: 4, prescription_id: 'RX-260303-0098', patient_id: 204, patient_name: 'Priya Nair', patient_uhid: 'UHID-2004', age: 28, gender: 'F',
    prescribing_doctor: 'Dr. Khan', department: 'Gynecology', source: 'OPD', created_at: '2026-03-03T08:45:00Z', priority: 'ROUTINE', status: 'DISPENSED',
    items: [
      { drug_name: 'Folic Acid 5mg', generic_name: 'Folic Acid', dosage: '5mg', route: 'Oral', frequency: 'OD', duration: '30 days', quantity: 30, dispensed_quantity: 30, stock_available: true, is_controlled: false },
      { drug_name: 'Iron Sucrose 200mg', generic_name: 'Iron Sucrose', dosage: '200mg', route: 'IV', frequency: 'Weekly', duration: '4 weeks', quantity: 4, dispensed_quantity: 4, stock_available: true, is_controlled: false },
    ],
  },
  {
    id: 5, prescription_id: 'RX-260303-0104', patient_id: 205, patient_name: 'Arjun Mehta', patient_uhid: 'UHID-2005', age: 70, gender: 'M',
    prescribing_doctor: 'Dr. Singh', department: 'Nephrology', source: 'IPD', ward_name: 'ICU', bed_no: 'ICU-3', created_at: '2026-03-03T10:15:00Z', priority: 'STAT', status: 'PENDING',
    items: [
      { drug_name: 'Noradrenaline 4mg/4mL', generic_name: 'Norepinephrine', dosage: '4mg', route: 'IV Infusion', frequency: 'Continuous', duration: 'As needed', quantity: 5, stock_available: true, is_controlled: false },
      { drug_name: 'Meropenem 1g', generic_name: 'Meropenem', dosage: '1g', route: 'IV', frequency: 'TDS', duration: '7 days', quantity: 21, stock_available: true, is_controlled: false },
      { drug_name: 'Midazolam 5mg/mL', generic_name: 'Midazolam', dosage: '5mg', route: 'IV', frequency: 'SOS', duration: 'PRN', quantity: 3, stock_available: true, is_controlled: true },
    ],
  },
];

// ─── API Service ─────────────────────────────────────
const pharmacyService = {
  getDashboard: async (): Promise<PharmacyDashboardStats> => {
    try {
      const response = await client.get('/pharmacy/dashboard');
      return response.data.data || response.data;
    } catch {
      console.warn('Pharmacy dashboard API not available, using mock data');
      return MOCK_DASHBOARD;
    }
  },

  getPrescriptionQueue: async (status?: string): Promise<PrescriptionItem[]> => {
    try {
      const params: any = {};
      if (status) params.status = status;
      const response = await client.get('/pharmacy/prescriptions', { params });
      return response.data.data || response.data;
    } catch {
      console.warn('Pharmacy queue API not available, using mock data');
      let items = MOCK_PRESCRIPTIONS;
      if (status) items = items.filter(i => i.status === status);
      return items;
    }
  },

  getPrescriptionDetail: async (id: string): Promise<PrescriptionItem> => {
    try {
      const response = await client.get(`/pharmacy/prescription/${id}`);
      return response.data.data || response.data;
    } catch {
      console.warn('Prescription detail API not available');
      return MOCK_PRESCRIPTIONS[0];
    }
  },

  dispensePrescription: async (prescriptionId: string, items: { drug_name: string; quantity: number }[]): Promise<any> => {
    try {
      const response = await client.post(`/pharmacy/dispense/${prescriptionId}`, { items });
      return response.data;
    } catch (error) {
      console.error('Dispense error:', error);
      throw error;
    }
  },

  getDrugInventory: async (category?: string): Promise<DrugItem[]> => {
    try {
      const params: any = {};
      if (category) params.category = category;
      const response = await client.get('/pharmacy/inventory', { params });
      return response.data.data || response.data;
    } catch {
      console.warn('Drug inventory API not available');
      return [];
    }
  },

  checkInteractions: async (drugNames: string[]): Promise<{ hasInteraction: boolean; details?: string }> => {
    try {
      const response = await client.post('/pharmacy/check-interactions', { drugs: drugNames });
      return response.data;
    } catch {
      return { hasInteraction: false };
    }
  },

  getDispensingHistory: async (): Promise<DispensingRecord[]> => {
    try {
      const response = await client.get('/pharmacy/dispensing-history');
      return response.data.data || response.data;
    } catch {
      console.warn('Dispensing history not available');
      return [];
    }
  },
};

export default pharmacyService;
