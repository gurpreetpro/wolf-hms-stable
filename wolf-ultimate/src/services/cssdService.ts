import client from '../api/client';

// ═══════════════════════════════════════════════════════
//  CSSD SERVICE — Sterilization, Instruments, Load Logs
// ═══════════════════════════════════════════════════════

export interface SterilizationCycle {
  id: number; autoclave_id: string; autoclave_name: string;
  cycle_number: string; cycle_type: 'GRAVITY' | 'PREVAC' | 'FLASH' | 'LOW_TEMP';
  temperature: number; pressure: number; duration_min: number;
  start_time: string; end_time?: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ABORTED';
  operator: string; load_count: number;
  bi_result?: 'PASS' | 'FAIL' | 'PENDING';
}

export interface Instrument {
  id: number; name: string; tray_id: string; department: string;
  category: 'SURGICAL' | 'DENTAL' | 'ORTHO' | 'OPHTHAL' | 'OBG' | 'GENERAL';
  count: number; status: 'STERILE' | 'USED' | 'PROCESSING' | 'ISSUED';
  last_sterilized?: string; expiry?: string;
  barcode: string;
}

export interface LoadLog {
  id: number; cycle_id: string; items: { tray_id: string; tray_name: string; dept: string; count: number }[];
  loaded_by: string; load_time: string; unloaded_by?: string; unload_time?: string;
  quality_check: 'PASS' | 'FAIL' | 'PENDING';
}

export interface CSSDDashboardStats {
  cycles_today: number; cycles_completed: number; cycles_running: number;
  instruments_sterile: number; instruments_processing: number;
  pending_issue: number; bi_pending: number; bi_failed: number;
}

const MOCK_DASHBOARD: CSSDDashboardStats = {
  cycles_today: 8, cycles_completed: 5, cycles_running: 2,
  instruments_sterile: 142, instruments_processing: 28,
  pending_issue: 6, bi_pending: 2, bi_failed: 0,
};

const MOCK_CYCLES: SterilizationCycle[] = [
  { id: 1, autoclave_id: 'AC-01', autoclave_name: 'Autoclave-1 (Tuttnauer)', cycle_number: 'CYC-2026-0305-001', cycle_type: 'PREVAC', temperature: 134, pressure: 2.1, duration_min: 18, start_time: '2026-03-05T08:00:00', end_time: '2026-03-05T08:22:00', status: 'COMPLETED', operator: 'Meena K.', load_count: 12, bi_result: 'PASS' },
  { id: 2, autoclave_id: 'AC-01', autoclave_name: 'Autoclave-1 (Tuttnauer)', cycle_number: 'CYC-2026-0305-002', cycle_type: 'PREVAC', temperature: 134, pressure: 2.1, duration_min: 18, start_time: '2026-03-05T09:00:00', end_time: '2026-03-05T09:20:00', status: 'COMPLETED', operator: 'Meena K.', load_count: 10, bi_result: 'PASS' },
  { id: 3, autoclave_id: 'AC-02', autoclave_name: 'Autoclave-2 (Getinge)', cycle_number: 'CYC-2026-0305-003', cycle_type: 'GRAVITY', temperature: 121, pressure: 1.1, duration_min: 30, start_time: '2026-03-05T09:30:00', status: 'RUNNING', operator: 'Raju S.', load_count: 8 },
  { id: 4, autoclave_id: 'AC-01', autoclave_name: 'Autoclave-1 (Tuttnauer)', cycle_number: 'CYC-2026-0305-004', cycle_type: 'FLASH', temperature: 132, pressure: 2, duration_min: 4, start_time: '2026-03-05T10:00:00', status: 'RUNNING', operator: 'Meena K.', load_count: 3 },
];

const MOCK_INSTRUMENTS: Instrument[] = [
  { id: 1, name: 'Major Surgical Tray', tray_id: 'TRAY-001', department: 'General Surgery', category: 'SURGICAL', count: 24, status: 'STERILE', last_sterilized: '2026-03-05', expiry: '2026-03-12', barcode: 'CST001001' },
  { id: 2, name: 'Ortho Implant Set', tray_id: 'TRAY-002', department: 'Orthopedics', category: 'ORTHO', count: 18, status: 'STERILE', last_sterilized: '2026-03-05', expiry: '2026-03-12', barcode: 'CST002001' },
  { id: 3, name: 'Laparoscopic Set', tray_id: 'TRAY-003', department: 'General Surgery', category: 'SURGICAL', count: 12, status: 'PROCESSING', barcode: 'CST003001' },
  { id: 4, name: 'OBG Delivery Set', tray_id: 'TRAY-004', department: 'OBG', category: 'OBG', count: 16, status: 'ISSUED', last_sterilized: '2026-03-04', expiry: '2026-03-11', barcode: 'CST004001' },
  { id: 5, name: 'Eye Micro Set', tray_id: 'TRAY-005', department: 'Ophthalmology', category: 'OPHTHAL', count: 8, status: 'STERILE', last_sterilized: '2026-03-05', expiry: '2026-03-08', barcode: 'CST005001' },
  { id: 6, name: 'Dental Extraction Set', tray_id: 'TRAY-006', department: 'Dental', category: 'DENTAL', count: 10, status: 'USED', barcode: 'CST006001' },
];

const cssdService = {
  getDashboard: async (): Promise<CSSDDashboardStats> => {
    try { const r = await client.get('/cssd/dashboard'); return r.data.data || r.data; }
    catch { return MOCK_DASHBOARD; }
  },
  getCycles: async (): Promise<SterilizationCycle[]> => {
    try { const r = await client.get('/cssd/cycles'); return r.data.data || r.data; }
    catch { return MOCK_CYCLES; }
  },
  getInstruments: async (): Promise<Instrument[]> => {
    try { const r = await client.get('/cssd/instruments'); return r.data.data || r.data; }
    catch { return MOCK_INSTRUMENTS; }
  },
  startCycle: async (autoclaveId: string, loadItems: string[]): Promise<void> => {
    try { await client.post('/cssd/cycles', { autoclaveId, loadItems }); }
    catch (e) { console.error('Cycle start error:', e); throw e; }
  },
  completeCycle: async (id: number, data: {qc_passed: boolean; notes?: string}): Promise<void> => {
    try { await client.put(`/cssd/cycles/${id}/complete`, data); }
    catch (e) { console.error('Cycle complete error:', e); throw e; }
  },
  issueInstrument: async (instrumentId: number, department: string): Promise<void> => {
    try { await client.put(`/cssd/instruments/${instrumentId}/issue`, { department }); }
    catch (e) { console.error('Issue error:', e); throw e; }
  },
  returnInstrument: async (instrumentId: number): Promise<void> => {
    try { await client.put(`/cssd/instruments/${instrumentId}/return`, {}); }
    catch (e) { console.error('Return error:', e); throw e; }
  },
  getLoadLogs: async (): Promise<LoadLog[]> => {
    try { const r = await client.get('/cssd/load-logs'); return r.data.data || r.data; }
    catch { return []; }
  },
  createLoadLog: async (data: {autoclave_id: string; load_number: string; items: unknown[]}): Promise<void> => {
    try { await client.post('/cssd/load-logs', data); }
    catch (e) { console.error('Load log error:', e); throw e; }
  },
  getBioIndicators: async (): Promise<{id: number; batch_id: number; result: string; test_date: string}[]> => {
    try { const r = await client.get('/cssd/bio-indicators'); return r.data.data || r.data; }
    catch { return []; }
  },
  logBioIndicator: async (data: {batch_id: number; result: string}): Promise<void> => {
    try { await client.post('/cssd/bio-indicators', data); }
    catch (e) { console.error('BI log error:', e); throw e; }
  },
};

export default cssdService;

