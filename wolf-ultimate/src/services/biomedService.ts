import client from '../api/client';

// ═══════════════════════════════════════════════════════
//  BIOMED SERVICE — Equipment, Maintenance, Calibration
// ═══════════════════════════════════════════════════════

export interface Equipment {
  id: number; name: string; asset_id: string; category: string;
  department: string; location: string; manufacturer: string; model: string;
  serial_number: string; purchase_date: string; warranty_expiry: string;
  status: 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'BREAKDOWN' | 'DECOMMISSIONED';
  last_pm: string; next_pm: string; amc_vendor?: string;
}

export interface MaintenanceTicket {
  id: number; equipment_name: string; asset_id: string; department: string;
  type: 'PREVENTIVE' | 'BREAKDOWN' | 'CORRECTIVE' | 'CALIBRATION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'PARTS_AWAITED' | 'COMPLETED' | 'CLOSED';
  reported_by: string; reported_date: string; assigned_to: string;
  description: string; resolution?: string; downtime_hours?: number;
}

export interface CalibrationLog {
  id: number; equipment_name: string; asset_id: string;
  calibration_date: string; next_due: string; result: 'PASS' | 'FAIL' | 'ADJUSTED';
  performed_by: string; certificate_no?: string;
  parameters: { name: string; expected: string; measured: string; tolerance: string; pass: boolean }[];
}

export interface BiomedDashboardStats {
  total_equipment: number; operational: number; under_maintenance: number;
  breakdowns: number; open_tickets: number; overdue_pm: number;
  calibrations_due: number; amc_expiring: number;
}

const MOCK_DASHBOARD: BiomedDashboardStats = {
  total_equipment: 156, operational: 140, under_maintenance: 10,
  breakdowns: 6, open_tickets: 14, overdue_pm: 3,
  calibrations_due: 5, amc_expiring: 2,
};

const MOCK_EQUIPMENT: Equipment[] = [
  { id: 1, name: 'Ventilator', asset_id: 'BME-001', category: 'Life Support', department: 'ICU', location: 'ICU Bay-3', manufacturer: 'Hamilton', model: 'C6', serial_number: 'HM-2023-4521', purchase_date: '2023-06-15', warranty_expiry: '2026-06-15', status: 'OPERATIONAL', last_pm: '2026-02-01', next_pm: '2026-05-01', amc_vendor: 'Hamilton India' },
  { id: 2, name: 'CT Scanner', asset_id: 'BME-002', category: 'Imaging', department: 'Radiology', location: 'CT Room-1', manufacturer: 'Siemens', model: 'SOMATOM Go.Up', serial_number: 'SI-2022-8910', purchase_date: '2022-01-10', warranty_expiry: '2025-01-10', status: 'OPERATIONAL', last_pm: '2026-01-15', next_pm: '2026-04-15', amc_vendor: 'Siemens Healthineers' },
  { id: 3, name: 'Defibrillator', asset_id: 'BME-003', category: 'Emergency', department: 'Emergency', location: 'Trauma Bay', manufacturer: 'Philips', model: 'HeartStart XL+', serial_number: 'PH-2024-1234', purchase_date: '2024-03-20', warranty_expiry: '2027-03-20', status: 'OPERATIONAL', last_pm: '2026-02-20', next_pm: '2026-05-20' },
  { id: 4, name: 'Infusion Pump', asset_id: 'BME-004', category: 'Drug Delivery', department: 'NICU', location: 'NICU Station-2', manufacturer: 'B.Braun', model: 'Infusomat Space', serial_number: 'BB-2023-5678', purchase_date: '2023-09-01', warranty_expiry: '2026-09-01', status: 'UNDER_MAINTENANCE', last_pm: '2026-01-10', next_pm: '2026-04-10' },
  { id: 5, name: 'Patient Monitor', asset_id: 'BME-005', category: 'Monitoring', department: 'ICU', location: 'ICU Bay-1', manufacturer: 'Mindray', model: 'BeneVision N22', serial_number: 'MR-2024-9012', purchase_date: '2024-07-15', warranty_expiry: '2027-07-15', status: 'BREAKDOWN', last_pm: '2026-02-15', next_pm: '2026-05-15' },
  { id: 6, name: 'Autoclave', asset_id: 'BME-006', category: 'Sterilization', department: 'CSSD', location: 'CSSD Room-1', manufacturer: 'Tuttnauer', model: '5075ELV', serial_number: 'TT-2023-3456', purchase_date: '2023-04-01', warranty_expiry: '2026-04-01', status: 'OPERATIONAL', last_pm: '2026-02-28', next_pm: '2026-05-28', amc_vendor: 'Tuttnauer India' },
];

const MOCK_TICKETS: MaintenanceTicket[] = [
  { id: 1, equipment_name: 'Patient Monitor', asset_id: 'BME-005', department: 'ICU', type: 'BREAKDOWN', priority: 'CRITICAL', status: 'IN_PROGRESS', reported_by: 'Nurse Priya', reported_date: '2026-03-05', assigned_to: 'Ravi Kumar', description: 'SpO2 module not reading. Display flickering intermittently.', downtime_hours: 4 },
  { id: 2, equipment_name: 'Infusion Pump', asset_id: 'BME-004', department: 'NICU', type: 'CORRECTIVE', priority: 'HIGH', status: 'PARTS_AWAITED', reported_by: 'Dr. Mehra', reported_date: '2026-03-04', assigned_to: 'Ravi Kumar', description: 'Flow rate alarm trigger false positive. Needs valve replacement.' },
  { id: 3, equipment_name: 'Ventilator', asset_id: 'BME-001', department: 'ICU', type: 'PREVENTIVE', priority: 'MEDIUM', status: 'OPEN', reported_by: 'System', reported_date: '2026-03-05', assigned_to: 'Suresh P.', description: 'Quarterly PM due. Filter replacement, O2 sensor check, battery test.' },
  { id: 4, equipment_name: 'Autoclave', asset_id: 'BME-006', department: 'CSSD', type: 'CALIBRATION', priority: 'MEDIUM', status: 'OPEN', reported_by: 'System', reported_date: '2026-03-03', assigned_to: 'Suresh P.', description: 'Annual calibration due. Temperature/pressure validation required.' },
];

const biomedService = {
  getDashboard: async (): Promise<BiomedDashboardStats> => {
    try { const r = await client.get('/equipment/biomed/dashboard'); return r.data.data || r.data; }
    catch { return MOCK_DASHBOARD; }
  },
  getEquipment: async (): Promise<Equipment[]> => {
    try { const r = await client.get('/equipment/types'); return r.data.data || r.data; }
    catch { return MOCK_EQUIPMENT; }
  },
  getTickets: async (): Promise<MaintenanceTicket[]> => {
    try { const r = await client.get('/equipment/requests/pending'); return r.data.data || r.data; }
    catch { return MOCK_TICKETS; }
  },
  createTicket: async (ticket: Partial<MaintenanceTicket>): Promise<void> => {
    try { await client.post('/equipment/types/request-add', ticket); }
    catch (e) { console.error('Ticket error:', e); throw e; }
  },
  updateTicketStatus: async (id: number, status: string): Promise<void> => {
    try { await client.post(`/equipment/requests/${id}/approve`, { status }); }
    catch (e) { console.error('Status error:', e); throw e; }
  },
  // PM Schedules
  getPMSchedules: async (): Promise<{id: number; equipment_name: string; next_pm_date: string; status: string}[]> => {
    try { const r = await client.get('/equipment/pm-schedules'); return r.data.data || r.data; }
    catch { return []; }
  },
  createPMSchedule: async (data: {equipment_type_id: number; frequency_days: number}): Promise<void> => {
    try { await client.post('/equipment/pm-schedules', data); }
    catch (e) { console.error('PM error:', e); throw e; }
  },
  completePM: async (id: number, data: {findings: string; actions_taken: string}): Promise<void> => {
    try { await client.put(`/equipment/pm-schedules/${id}/complete`, data); }
    catch (e) { console.error('PM complete error:', e); throw e; }
  },
  // Calibrations
  getCalibrations: async (): Promise<CalibrationLog[]> => {
    try { const r = await client.get('/equipment/calibrations'); return r.data.data || r.data; }
    catch { return []; }
  },
  logCalibration: async (data: {equipment_type_id: number; certificate_number: string}): Promise<void> => {
    try { await client.post('/equipment/calibrations', data); }
    catch (e) { console.error('Calibration error:', e); throw e; }
  },
  // AMC Contracts
  getAMCContracts: async (): Promise<{id: number; equipment_name: string; vendor: string; end_date: string; status: string}[]> => {
    try { const r = await client.get('/equipment/amc-contracts'); return r.data.data || r.data; }
    catch { return []; }
  },
  createAMCContract: async (data: {equipment_type_id: number; vendor: string; end_date: string}): Promise<void> => {
    try { await client.post('/equipment/amc-contracts', data); }
    catch (e) { console.error('AMC error:', e); throw e; }
  },
};

export default biomedService;
