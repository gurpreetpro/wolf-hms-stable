import client from '../api/client';

// ═══════════════════════════════════════════════════════
//  BLOOD BANK SERVICE — Inventory, Cross-match, Donation
// ═══════════════════════════════════════════════════════

export interface BloodUnit {
  id: number; bag_number: string; blood_group: string; component: string;
  collection_date: string; expiry_date: string; volume_ml: number;
  status: 'AVAILABLE' | 'RESERVED' | 'CROSS_MATCHED' | 'ISSUED' | 'EXPIRED' | 'DISCARDED';
  donor_id?: string; storage_location: string;
}

export interface CrossMatchRequest {
  id: number; patient_name: string; patient_uhid: string; ward: string; bed: string;
  blood_group: string; component_needed: string; units_requested: number;
  indication: string; requested_by: string; requested_date: string;
  status: 'PENDING' | 'CROSS_MATCHING' | 'COMPATIBLE' | 'ISSUED' | 'CANCELLED';
  matched_bags?: string[];
}

export interface DonationRecord {
  id: number; donor_name: string; donor_id: string; blood_group: string;
  age: number; gender: 'M' | 'F'; weight_kg: number; hb_level: number;
  donation_date: string; bag_number: string; volume_ml: number;
  screening_result: 'PASS' | 'FAIL' | 'PENDING';
  components_separated: string[];
}

export interface BloodBankDashboardStats {
  total_units: number; available: number; reserved: number;
  expiring_soon: number; cross_match_pending: number;
  donations_today: number; issued_today: number; reactions_reported: number;
}

const MOCK_DASHBOARD: BloodBankDashboardStats = {
  total_units: 248, available: 186, reserved: 32,
  expiring_soon: 8, cross_match_pending: 5,
  donations_today: 3, issued_today: 6, reactions_reported: 0,
};

const MOCK_UNITS: BloodUnit[] = [
  { id: 1, bag_number: 'BB-2026-0001', blood_group: 'A+', component: 'Whole Blood', collection_date: '2026-03-01', expiry_date: '2026-04-05', volume_ml: 450, status: 'AVAILABLE', storage_location: 'Fridge-1 Shelf-A' },
  { id: 2, bag_number: 'BB-2026-0002', blood_group: 'O+', component: 'PRBC', collection_date: '2026-02-28', expiry_date: '2026-04-10', volume_ml: 280, status: 'AVAILABLE', storage_location: 'Fridge-1 Shelf-B' },
  { id: 3, bag_number: 'BB-2026-0003', blood_group: 'B+', component: 'FFP', collection_date: '2026-02-25', expiry_date: '2027-02-25', volume_ml: 200, status: 'RESERVED', storage_location: 'Deep Freeze-1' },
  { id: 4, bag_number: 'BB-2026-0004', blood_group: 'AB+', component: 'Platelets', collection_date: '2026-03-04', expiry_date: '2026-03-09', volume_ml: 50, status: 'AVAILABLE', storage_location: 'Agitator-1' },
  { id: 5, bag_number: 'BB-2026-0005', blood_group: 'O-', component: 'PRBC', collection_date: '2026-02-20', expiry_date: '2026-04-02', volume_ml: 280, status: 'CROSS_MATCHED', storage_location: 'Fridge-1 Shelf-C' },
  { id: 6, bag_number: 'BB-2026-0006', blood_group: 'A-', component: 'Whole Blood', collection_date: '2026-02-15', expiry_date: '2026-03-07', volume_ml: 450, status: 'AVAILABLE', storage_location: 'Fridge-2 Shelf-A' },
];

const MOCK_REQUESTS: CrossMatchRequest[] = [
  { id: 1, patient_name: 'Rakesh Kumar', patient_uhid: 'UHID-5001', ward: 'Ortho-A', bed: 'B-12', blood_group: 'A+', component_needed: 'PRBC', units_requested: 2, indication: 'Pre-op TKR — Hb 8.2', requested_by: 'Dr. Sharma', requested_date: '2026-03-05', status: 'PENDING' },
  { id: 2, patient_name: 'Priya Nair', patient_uhid: 'UHID-2004', ward: 'Card-B', bed: 'C-8', blood_group: 'B+', component_needed: 'FFP', units_requested: 4, indication: 'Post CABG — coagulopathy', requested_by: 'Dr. Mehra', requested_date: '2026-03-05', status: 'CROSS_MATCHING' },
  { id: 3, patient_name: 'Vijay Singh', patient_uhid: 'UHID-5003', ward: 'Neuro-ICU', bed: 'N-2', blood_group: 'O+', component_needed: 'Platelets', units_requested: 6, indication: 'Thrombocytopenia — PLT 18K', requested_by: 'Dr. Reddy', requested_date: '2026-03-05', status: 'COMPATIBLE', matched_bags: ['BB-2026-0010', 'BB-2026-0011'] },
];

const bloodBankService = {
  getDashboard: async (): Promise<BloodBankDashboardStats> => {
    try { const r = await client.get('/blood-bank/dashboard'); return r.data.data || r.data; }
    catch { return MOCK_DASHBOARD; }
  },
  getUnits: async (): Promise<BloodUnit[]> => {
    try { const r = await client.get('/blood-bank/units'); return r.data.data || r.data; }
    catch { return MOCK_UNITS; }
  },
  getCrossMatchRequests: async (): Promise<CrossMatchRequest[]> => {
    try { const r = await client.get('/blood-bank/cross-match'); return r.data.data || r.data; }
    catch { return MOCK_REQUESTS; }
  },
  issueUnit: async (bagNumber: string, patientUhid: string): Promise<void> => {
    try { await client.post('/blood-bank/issue', { bagNumber, patientUhid }); }
    catch (e) { console.error('Issue error:', e); throw e; }
  },
  recordDonation: async (donation: Partial<DonationRecord>): Promise<void> => {
    try { await client.post('/blood-bank/donations', donation); }
    catch (e) { console.error('Donation error:', e); throw e; }
  },
};

export default bloodBankService;
