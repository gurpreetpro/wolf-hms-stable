#!/usr/bin/env node
/**
 * Wolf HMS — System-Wide Endpoint Crawler (v4 — AbortController SSE-Safe)
 * =====================================================================
 * 1. Calls POST /api/auth/login with seeded admin credentials to get a valid JWT
 * 2. Probes 197 GET endpoints across all domains
 * 3. Extracts PostgreSQL errors from 5xx responses
 * 4. Outputs a terminal report grouped by domain
 * 5. v4: req.destroy() + socket.destroy() + setTimeout triple-kill for SSE streams
 *
 * Usage:
 *   node tests/load/system_wide_endpoint_crawler.js
 *   BASE_URL=http://localhost:3000 TIMEOUT_MS=3000 node tests/load/system_wide_endpoint_crawler.js
 */

const http = require('http');
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8080';
const PROBE_TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '3000');

// ─── Step 0: Login to get a valid JWT from the server ────────────
async function loginAndGetToken() {
  const body = JSON.stringify({ username: 'admin_taneja', password: 'password123' });
  return new Promise((resolve) => {
    const url = new URL(BASE_URL + '/api/auth/login');
    const req = http.request({
      hostname: url.hostname, port: url.port || 80, path: url.pathname,
      method: 'POST', timeout: 10000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.token) { console.log('   [OK] Login - token obtained\
'); resolve(json.token); }
          else { console.error('   [FAIL] No token:', json.message || data); process.exit(1); }
        } catch (e) { console.error('   [FAIL] Login parse error:', data.substring(0, 200)); process.exit(1); }
      });
    });
    req.on('error', (e) => { console.error('   [FAIL] Login connection:', e.message); process.exit(1); });
    req.write(body); req.end();
  });
}

let TOKEN = '';
let PATIENT_UUID = '00000000-0000-0000-0000-000000000000'; // fallback

// ─── Step 0b: Get a real patient UUID from the DB ────────────────
async function fetchPatientUUID() {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL + '/api/patients/search?q=a');
    const req = http.request({
      hostname: url.hostname, port: url.port || 80, path: url.pathname + url.search,
      method: 'GET', timeout: 5000,
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'X-Hospital-ID': '1' },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const patients = json.patients || json.data || json;
          if (Array.isArray(patients) && patients.length > 0 && patients[0].id) {
            PATIENT_UUID = patients[0].id;
            console.log('   [OK] Patient UUID: ' + PATIENT_UUID + '\
');
          } else {
            console.log('   [WARN] No patients found - using fallback UUID\
');
          }
        } catch (e) {
          console.log('   [WARN] Patient search parse error - using fallback UUID\
');
        }
        resolve();
      });
    });
    req.on('error', () => { console.log('   [WARN] Patient fetch failed - using fallback\
'); resolve(); });
    req.end();
  });
}

// ─── Endpoint Catalog (use {PID} as patient ID placeholder) ─────
const ENDPOINTS = [
  // Health & Diagnostics (public)
  { path: '/api/health', label: 'Health Check' },
  { path: '/api/health/db', label: 'Health - DB Ping' },
  { path: '/api/health/redis', label: 'Health - Redis Ping' },
  { path: '/api/metrics', label: 'Prometheus Metrics' },

  // Auth & Users
  { path: '/api/users', label: 'Users List' },
  { path: '/api/auth/me', label: 'Auth - Current User' },

  // OPD & Reception
  { path: '/api/opd/queue', label: 'OPD Queue' },
  { path: '/api/opd/appointments', label: 'OPD Appointments' },
  { path: '/api/reception/stats', label: 'Reception Stats' },
  { path: '/api/reception/collections', label: 'Reception Collections' },
  { path: '/api/reception/collections/summary', label: 'Reception Collection Summary' },

  // Appointments
  { path: '/api/appointments', label: 'Appointments List' },
  { path: '/api/appointments/today', label: 'Today Appointments' },

  // Patients
  { path: '/api/patients/search?q=test', label: 'Patient Search' },
  { path: '/api/patients/{PID}', label: 'Patient by ID' },
  { path: '/api/patients/{PID}/visits', label: 'Patient Visits' },
  { path: '/api/patients/{PID}/payments', label: 'Patient Payments' },
  { path: '/api/patients/doctors', label: 'Doctors List (Public)' },
  { path: '/api/patients/check-patient?phone=9999999999', label: 'Check Patient by Phone' },
  { path: '/api/patients/profile?phone=9999999999', label: 'Patient Profile by Phone' },

  // IPD & Admissions
  { path: '/api/admissions/available-beds', label: 'Available Beds' },
  { path: '/api/admissions/active', label: 'Active Admissions' },
  { path: '/api/admissions/bed-history/1', label: 'Bed History' },

  // ICU & Telemetry
  { path: '/api/icu/ventilator-logs/1', label: 'ICU Ventilator Logs' },
  { path: '/api/icu/fluid-io/1', label: 'ICU Fluid I/O History' },

  // Maternity
  { path: '/api/maternity/antenatal/1', label: 'Maternity Antenatal' },
  { path: '/api/maternity/partograph/1', label: 'Maternity Partograph' },
  { path: '/api/maternity/deliveries/1', label: 'Maternity Deliveries' },

  // Wards & Beds
  { path: '/api/wards', label: 'Wards List' },
  { path: '/api/wards/wards', label: 'Wards (Alt)' },
  { path: '/api/wards/my-assignments', label: 'Ward My Assignments' },
  { path: '/api/wards/dashboard', label: 'Ward Dashboard' },
  { path: '/api/wards/beds', label: 'Ward Beds' },
  { path: '/api/wards/consumables', label: 'Ward Consumables' },
  { path: '/api/wards/charges', label: 'Ward Charges' },
  { path: '/api/wards/requests', label: 'Ward Requests' },
  { path: '/api/wards/vitals/1', label: 'Ward Vitals' },
  { path: '/api/wards/emar/1', label: 'Ward eMAR' },
  { path: '/api/beds/wards', label: 'Bed Wards' },
  { path: '/api/beds/occupancy', label: 'Bed Occupancy' },
  { path: '/api/ward/beds', label: 'Ward -> Beds (Alias)' },

  // Nursing
  { path: '/api/nurse/assignments', label: 'Nurse Assignments' },
  { path: '/api/nurse/tasks', label: 'Nurse Tasks' },
  { path: '/api/nurse/handoff', label: 'Nurse Handoff' },

  // Care Plans & Transitions
  { path: '/api/care-plans', label: 'Care Plans' },
  { path: '/api/transitions', label: 'Care Transitions' },
  { path: '/api/order-sets', label: 'Order Sets' },

  // Laboratory
  { path: '/api/lab/queue', label: 'Lab Queue' },
  { path: '/api/lab/stats', label: 'Lab Stats' },
  { path: '/api/lab/tests', label: 'Lab Tests' },
  { path: '/api/lab/packages', label: 'Lab Packages' },
  { path: '/api/lab/history', label: 'Lab History' },
  { path: '/api/lab/requests', label: 'Lab Change Requests' },
  { path: '/api/lab/audit/1', label: 'Lab Audit Log' },
  { path: '/api/lab/reference-ranges', label: 'Lab Reference Ranges' },
  { path: '/api/lab/critical-alerts', label: 'Lab Critical Alerts' },
  { path: '/api/lab/critical-alerts/pending', label: 'Lab Pending Critical Alerts' },
  { path: '/api/lab/analytics/tat', label: 'Lab TAT Analytics' },
  { path: '/api/lab/trends/1', label: 'Lab Patient Trends' },
  { path: '/api/lab/reagents', label: 'Lab Reagents' },
  { path: '/api/lab/reagents/low-stock', label: 'Lab Low-Stock Alerts' },
  { path: '/api/lab/qc/materials', label: 'Lab QC Materials' },
  { path: '/api/lab/qc/violations', label: 'Lab QC Violations' },
  { path: '/api/lab/analytics/revenue', label: 'Lab Revenue Analytics' },
  { path: '/api/lab/analytics/workload', label: 'Lab Workload Analytics' },
  { path: '/api/lab/pending-payments', label: 'Lab Pending Payments' },
  { path: '/api/lab/test-types', label: 'Lab Test Types' },
  { path: '/api/lab-params', label: 'Lab Test Parameters' },
  { path: '/api/instruments', label: 'Lab Instruments' },
  { path: '/api/instruments/status', label: 'Instrument Status' },

  // Radiology
  { path: '/api/radiology/orders', label: 'Radiology Orders' },
  { path: '/api/ris/orders', label: 'RIS Orders' },
  { path: '/api/dicom/studies', label: 'DICOM Studies' },

  // Pharmacy
  { path: '/api/pharmacy/inventory', label: 'Pharmacy Inventory' },
  { path: '/api/pharmacy/inventory/search?q=para', label: 'Pharmacy Inventory Search' },
  { path: '/api/pharmacy/queue', label: 'Pharmacy Prescription Queue' },
  { path: '/api/pharmacy/price-requests', label: 'Pharmacy Price Requests' },
  { path: '/api/pharmacy/heatmap', label: 'Pharmacy Expiry Heatmap' },
  { path: '/api/pharmacy/forecast', label: 'Pharmacy Demand Forecast' },
  { path: '/api/pharmacy/suppliers', label: 'Pharmacy Suppliers' },
  { path: '/api/pharmacy/purchase-orders', label: 'Pharmacy Purchase Orders' },
  { path: '/api/pharmacy/reports/abc', label: 'Pharmacy ABC Analysis' },
  { path: '/api/pharmacy/reports/expiry', label: 'Pharmacy Expiry Report' },
  { path: '/api/pharmacy/reports/smart-alerts', label: 'Pharmacy Smart Alerts' },
  { path: '/api/pharmacy/dispenses/recent', label: 'Pharmacy Recent Dispenses' },
  { path: '/api/pharmacy/refunds', label: 'Pharmacy Refunds' },
  { path: '/api/pharmacy/controlled-log', label: 'Pharmacy Controlled Substance Log' },

  // Blood Bank
  { path: '/api/blood-bank/dashboard', label: 'Blood Bank Dashboard' },
  { path: '/api/blood-bank/donors', label: 'Blood Bank Donors' },
  { path: '/api/blood-bank/inventory', label: 'Blood Bank Inventory' },
  { path: '/api/blood-bank/units', label: 'Blood Bank Units' },
  { path: '/api/blood-bank/requests', label: 'Blood Bank Requests' },
  { path: '/api/blood-bank/component-types', label: 'Blood Bank Component Types' },
  { path: '/api/blood-bank/testing/pending', label: 'Blood Bank Pending Testing' },
  { path: '/api/blood-bank/transfusions/active', label: 'Blood Bank Active Transfusions' },
  { path: '/api/blood-bank/reactions', label: 'Blood Bank Reactions' },
  { path: '/api/blood-bank/ai/forecast', label: 'Blood Bank AI Forecast' },
  { path: '/api/blood-bank/ai/expiry-analysis', label: 'Blood Bank AI Expiry' },
  { path: '/api/blood-bank/eraktkosh/inventory', label: 'Blood Bank eRaktKosh Inventory' },
  { path: '/api/blood-bank/pricing', label: 'Blood Bank Pricing' },
  { path: '/api/blood-bank/surgery/standards', label: 'Blood Bank Surgery Standards' },
  { path: '/api/blood-bank/patient/{PID}/blood-profile', label: 'Blood Bank Patient Profile' },
  { path: '/api/blood-bank/public/availability', label: 'Blood Bank Public Availability' },

  // OT & Surgical
  { path: '/api/ot/rooms', label: 'OT Rooms' },
  { path: '/api/ot/schedule', label: 'OT Schedule' },

  // Emergency
  { path: '/api/emergency/config', label: 'Emergency Config' },
  { path: '/api/emergency/status', label: 'Emergency Status' },

  // CSSD
  { path: '/api/cssd/trays', label: 'CSSD Trays' },
  { path: '/api/cssd/cycles', label: 'CSSD Cycles' },

  // Finance & Billing
  { path: '/api/finance/test', label: 'Finance Test' },
  { path: '/api/finance/dashboard', label: 'Finance Dashboard' },
  { path: '/api/finance/stats', label: 'Finance Stats' },
  { path: '/api/finance/invoices', label: 'Finance Invoices' },
  { path: '/api/finance/payments', label: 'Finance Payments' },
  { path: '/api/finance/outstanding-patients', label: 'Finance Outstanding Patients' },
  { path: '/api/finance/ledger/1', label: 'Finance Patient Ledger' },
  { path: '/api/finance/invoices/1/items', label: 'Finance Invoice Items' },
  { path: '/api/finance/invoices/1/payments', label: 'Finance Invoice Payments' },
  { path: '/api/finance/billable/1', label: 'Finance Billable Items' },
  { path: '/api/finance/ar-aging', label: 'Finance AR Aging' },
  { path: '/api/finance/denials', label: 'Finance Denials' },
  { path: '/api/finance/kpis', label: 'Finance KPIs' },
  { path: '/api/finance/reports/department-revenue', label: 'Finance Dept Revenue' },
  { path: '/api/finance/reports/payer-analysis', label: 'Finance Payer Analysis' },
  { path: '/api/finance/reports/ar-details', label: 'Finance AR Details' },
  { path: '/api/finance/reports/revenue-trend', label: 'Finance Revenue Trend' },
  { path: '/api/finance/reports/atb', label: 'Finance Aged Trial Balance' },
  { path: '/api/finance/reports/daily-revenue', label: 'Finance Daily Revenue' },
  { path: '/api/finance/periods', label: 'Finance Accounting Periods' },
  { path: '/api/billing/pending', label: 'Billing Pending' },
  { path: '/api/billing/invoices', label: 'Billing Invoices' },
  { path: '/api/billing/ar-aging', label: 'Billing AR Aging' },
  { path: '/api/billing/kpis', label: 'Billing KPIs' },
  { path: '/api/billing/denials', label: 'Billing Denials' },
  { path: '/api/billing/ping', label: 'Billing Ping' },

  // Insurance & TPA
  { path: '/api/insurance/providers', label: 'Insurance Providers' },
  { path: '/api/insurance/patient/{PID}', label: 'Insurance Patient Policies' },
  { path: '/api/insurance/claims/pending', label: 'Insurance Pending Claims' },
  { path: '/api/insurance/claims/stats', label: 'Insurance Claim Stats' },
  { path: '/api/insurance/denial-codes', label: 'Insurance Denial Codes' },

  // Treatment Packages
  { path: '/api/packages', label: 'Treatment Packages' },

  // Specialist Billing
  { path: '/api/specialists', label: 'Specialist List' },

  // Corporate Billing
  { path: '/api/corporate/contracts', label: 'Corporate Contracts' },

  // Government Schemes (PMJAY/CGHS/ECHS)
  { path: '/api/govt-schemes', label: 'Govt Schemes' },
  { path: '/api/pmjay/hbp/rates', label: 'PMJAY HBP Rates' },
  { path: '/api/pmjay/claims', label: 'PMJAY Claims' },

  // Horizon 2 - Dental
  { path: '/api/dental/visits', label: 'Dental Visits' },
  { path: '/api/dental/procedures', label: 'Dental Procedures' },
  { path: '/api/dental/inventory', label: 'Dental Inventory' },
  { path: '/api/dental/lab-orders', label: 'Dental Lab Orders' },

  // Horizon 2 - Ophthalmology
  { path: '/api/ophthalmology/visits', label: 'Ophthalmology Visits' },
  { path: '/api/ophthalmology/procedures', label: 'Ophthalmology Procedures' },
  { path: '/api/ophthalmology/biometry', label: 'Ophthalmology Biometry' },
  { path: '/api/ophthalmology/inventory', label: 'Ophthalmology IOL Inventory' },

  // Horizon 2 - Orthopedics
  { path: '/api/orthopedics/visits', label: 'Orthopedic Visits' },
  { path: '/api/orthopedics/procedures', label: 'Orthopedic Procedures' },
  { path: '/api/orthopedics/implants', label: 'Orthopedic Implants' },
  { path: '/api/orthopedics/physio-orders', label: 'Orthopedic Physio Orders' },

  // Clinical
  { path: '/api/clinical/soap/{PID}', label: 'Clinical SOAP Notes' },
  { path: '/api/clinical/prescriptions/{PID}', label: 'Clinical Prescriptions' },
  { path: '/api/clinical/vitals/{PID}', label: 'Clinical Vitals' },
  { path: '/api/clinical/alerts', label: 'Clinical Alerts' },

  // Security & Audit
  { path: '/api/security/stats', label: 'Security Stats' },
  { path: '/api/security/audit-log', label: 'Security Audit Log' },
  { path: '/api/security/sessions', label: 'Security Active Sessions' },
  { path: '/api/audit/logs', label: 'Audit Logs (Filtered)' },
  { path: '/api/audit/logs/1', label: 'Audit Log Detail' },
  { path: '/api/audit/stats', label: 'Audit Stats' },
  { path: '/api/audit/export', label: 'Audit Export CSV' },

  // Support Services
  { path: '/api/physio/sessions', label: 'Physiotherapy Sessions' },
  { path: '/api/dietary/orders', label: 'Dietary Orders' },
  { path: '/api/dietary/meals', label: 'Dietary Meals' },

  // Settings & Admin
  { path: '/api/settings/hospital-profile', label: 'Hospital Profile' },
  { path: '/api/settings/services', label: 'Settings Services' },
  { path: '/api/settings/payment', label: 'Settings Payment' },
  { path: '/api/settings/sms', label: 'Settings SMS' },
  { path: '/api/settings/confirmation', label: 'Settings Confirmation' },
  { path: '/api/settings/id-series', label: 'Settings ID Series' },

  // Dashboard
  { path: '/api/dashboard', label: 'Dashboard' },

  // Doctor Analytics
  { path: '/api/doctor', label: 'Doctor Analytics' },

  // Equipment
  { path: '/api/equipment', label: 'Equipment' },

  // Hospital Admin
  { path: '/api/hospitals', label: 'Hospitals List' },

  // IPD Patient Portal
  { path: '/api/ipd/my-stay/1', label: 'IPD My Stay' },

  // Logistics & Parking
  { path: '/api/logistics/trips', label: 'Logistics Trips' },
  { path: '/api/parking/sessions', label: 'Parking Sessions' },

  // Location Tracking
  { path: '/api/locations/online', label: 'Online Staff Locations' },

  // Ward Access
  { path: '/api/ward-access/passes', label: 'Ward Passes' },

  // Admin Recovery
  { path: '/api/admin/recovery/deleted-patients', label: 'Admin Deleted Patients' },
  { path: '/api/admin/recovery/audit-logs', label: 'Admin Recovery Audit Logs' },

  // AI
  { path: '/api/ai/status', label: 'AI Status' },

  // Analytics
  { path: '/api/analytics/doctors', label: 'Analytics Doctors' },
  { path: '/api/analytics/patients', label: 'Analytics Patients' },
  { path: '/api/analytics/activity', label: 'Analytics Activity' },
  { path: '/api/analytics/readmission-risk', label: 'Analytics Readmission Risk' },
  { path: '/api/analytics/bed-forecast', label: 'Analytics Bed Forecast' },
  { path: '/api/analytics/disease-registries', label: 'Analytics Disease Registries' },
  { path: '/api/analytics/nabh-readiness', label: 'Analytics NABH Readiness' },
];

// ─── PostgreSQL Error Parser ─────────────────────────────────────
function extractPostgresErrors(text) {
  const errors = [];
  const patterns = [
    /relation \"([^\"]+)\" does not exist/gi,
    /column \"([^\"]+)\" does not exist/gi,
    /column \"([^\"]+)\" of relation \"([^\"]+)\" does not exist/gi,
    /operator does not exist:\\s*([^\
]+)/gi,
    /function \"([^\"]+)\" does not exist/gi,
    /type \"([^\"]+)\" does not exist/gi,
    /syntax error at or near \"([^\"]+)\"/gi,
    /column \"([^\"]+)\" cannot be cast/i,
    /cannot be cast automatically to type\\s+(\\S+)/i,
    /foreign key constraint.*violates/i,
    /duplicate key value violates unique constraint \"([^\"]+)\"/i,
    /null value in column \"([^\"]+)\"/i,
    /invalid input syntax for type\\s+(\\S+)/i,
    /ERROR:\\s*(.*?)(?:\
|$)/i,
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      const msg = m[0].trim();
      if (!errors.find((e) => e.includes(msg.substring(0, 40)))) errors.push(msg);
    }
  }
  if (errors.length === 0) {
    const pm = text.match(/error:\\s*([^\
]{10,200})/i);
    if (pm) errors.push(pm[1].trim());
  }
  return errors;
}

// ─── HTTP Probe — nuclear-grade socket severing ──────────────────
function httpGet(url, token, timeoutMs) {
  return new Promise((resolve) => {
    let resolved = false;
    let req = null;
    let res = null;
    let timer = null;

    const killAll = () => {
      try { if (res) { res.destroy(); if (res.socket) res.socket.destroy(); } } catch (_) { }
      try { if (req) { if (req.socket) req.socket.destroy(); req.destroy(); } } catch (_) { }
    };

    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      if (timer) clearTimeout(timer);
      killAll();
      resolve(result);
    };

    timer = setTimeout(() => {
      finish({ status: res ? res.statusCode : 0, body: '', sseTimeout: true, timedOut: true });
    }, timeoutMs);

    try {
      const parsed = new URL(url);
      req = http.request({
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        agent: false,
        timeout: timeoutMs + 500,
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'X-Hospital-ID': '1',
          'Connection': 'close',
        },
      }, (response) => {
        res = response;
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          finish({ status: res.statusCode, body: data, timedOut: false });
        });
        res.on('error', () => {
          finish({ status: res.statusCode || 0, body: data, sseTimeout: true, timedOut: true });
        });
      });

      req.on('timeout', () => {
        finish({ status: res ? res.statusCode : 0, body: '', sseTimeout: true, timedOut: true });
      });

      req.on('error', (e) => {
        if (e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT' || e.code === 'ABORT_ERR') {
          finish({ status: res ? res.statusCode : 0, body: '', sseTimeout: true, timedOut: true });
        } else {
          finish({ status: 0, body: e.message, timedOut: false, error: true });
        }
      });

      req.end();
    } catch (e) {
      finish({ status: 0, body: e.message, timedOut: false, error: true });
    }
  });
}

let completed = 0;
let sseCount = 0;
const total = ENDPOINTS.length;

async function probeEndpoint(ep) {
  const resolvedPath = ep.path.replace(/\\{PID\\}/g, PATIENT_UUID);
  const url = BASE_URL + resolvedPath;
  const start = Date.now();
  const resp = await httpGet(url, TOKEN, PROBE_TIMEOUT_MS);
  const elapsed = Date.now() - start;
  completed++;

  const streamTimeout = !!(resp.sseTimeout);
  const icon = resp.status >= 500 ? 'X' : resp.status >= 400 ? 'w' : streamTimeout ? 'S' : resp.status === 0 ? 'T' : '.';
  const code = resp.status === 0 && streamTimeout ? 'SSE' : resp.status === 0 ? 'HUNG' : String(resp.status);
  if (streamTimeout) sseCount++;
  process.stdout.write(icon + ' [' + String(completed).padStart(3) + '/' + total + '] ' + ep.path.padEnd(52) + ' ' + code.padEnd(4) + ' ' + elapsed + 'ms\
');

  if (streamTimeout) {
    return { endpoint: ep, status: 0, elapsed, passed: true, crash: false, streamTimeout: true, note: 'SSE/stream - expected, not a crash' };
  }

  if (resp.status === 0 || resp.error) {
    return { endpoint: ep, status: 0, elapsed, passed: false, crash: true, errorBody: resp.body, pgErrors: [] };
  }

  let parsed = null;
  try { parsed = JSON.parse(resp.body); } catch (_) { }

  if (resp.status < 300) return { endpoint: ep, status: resp.status, elapsed, passed: true, crash: false };
  if (resp.status < 500) return { endpoint: ep, status: resp.status, elapsed, passed: true, crash: false, note: resp.status === 401 || resp.status === 403 ? 'Auth denied' : 'Not found' };

  const bodyStr = (parsed ? JSON.stringify(parsed) : resp.body).substring(0, 2000);
  return { endpoint: ep, status: resp.status, elapsed, passed: false, crash: true, errorBody: bodyStr.substring(0, 500), pgErrors: extractPostgresErrors(bodyStr) };
}

// ─── Concurrency ─────────────────────────────────────────────────
async function runAll(tasks, concurrency) {
  const results = [];
  const q = [...tasks];
  async function w() { while (q.length) results.push(await probeEndpoint(q.shift())); }
  await Promise.all(Array.from({ length: concurrency }, w));
  return results;
}

// ─── Report ──────────────────────────────────────────────────────
function generateReport(results) {
  const crashed = results.filter((r) => r.crash);
  const sseStreams = results.filter((r) => r.streamTimeout);
  const passed = results.filter((r) => !r.crash && !r.streamTimeout);

  console.log('\
' + '='.repeat(90));
  console.log('  WOLF HMS — System-Wide Endpoint Crawler v4 (AbortController SSE-Safe)');
  console.log('='.repeat(90));
  console.log('  Target: ' + BASE_URL + '  |  Probed: ' + results.length + '  |  Passed: ' + passed.length + '  |  Crashed: ' + crashed.length + '  |  SSE: ' + sseStreams.length);
  console.log('='.repeat(90));

  if (sseStreams.length > 0) {
    console.log('');
    console.log('  *** SSE/STREAM ENDPOINTS (Aborted after 3s — expected, not crashes) ***');
    console.log('-'.repeat(65));
    for (const s of sseStreams) {
      console.log('  [S] ' + s.endpoint.path.padEnd(55) + ' - ' + (s.note || 'Live stream'));
    }
  }

  if (crashed.length > 0) {
    console.log('');
    console.log('  *** CRASHED ENDPOINTS — Database Errors Detected ***');
    console.log('-'.repeat(65));
    for (const c of crashed) {
      console.log('  Path  : ' + c.endpoint.path);
      console.log('  Status: ' + c.status);
      if (c.pgErrors.length > 0) {
        console.log('  PG Errors:');
        for (const err of c.pgErrors) {
          console.log('    -> ' + err);
        }
      } else {
        console.log('  Error: ' + (c.errorBody || '(none)').substring(0, 120));
      }
      console.log('');
    }
  }

  // Domain summary
  console.log('  -- By Domain --');
  console.log('-'.repeat(60));
  const dom = {};
  for (const r of results) {
    const seg = r.endpoint.path.split('/')[2] || 'root';
    if (!dom[seg]) dom[seg] = { t: 0, c: 0, s: 0 };
    dom[seg].t++;
    if (r.crash) dom[seg].c++;
    if (r.streamTimeout) dom[seg].s++;
  }
  for (const [k, v] of Object.entries(dom).sort()) {
    const icon = v.c > 0 ? 'X' : v.s > 0 ? 'S' : '.';
    const extra = v.s > 0 ? ', ' + v.s + ' SSE' : '';
    const pct = v.t > 0 ? Math.round((v.c / v.t) * 100) : 0;
    console.log('  ' + icon + ' /api/' + k.padEnd(30) + ' ' + String(v.t).padStart(3) + ' probes, ' + String(v.c).padStart(3) + ' crashes (' + pct + '%)' + extra);
  }

  console.log('='.repeat(90));
  if (crashed.length > 0) {
    console.log('  FAIL: ' + crashed.length + ' crashed — fix before deploy');
    process.exitCode = 1;
  } else {
    console.log('  ALL CLEAR — no database errors detected');
  }
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('Wolf HMS Endpoint Crawler v4 — AbortController + SSE-Safe');
  console.log('Target: ' + BASE_URL + '  |  Endpoints: ' + ENDPOINTS.length + '  |  Concurrency: ' + CONCURRENCY + '  |  Timeout: ' + PROBE_TIMEOUT_MS + 'ms');
  console.log('');

  // Step 0: Get valid token
  console.log('Logging in as admin_taneja...');
  TOKEN = await loginAndGetToken();

  // Step 0b: Get a real patient UUID
  console.log('Fetching patient UUID...');
  await fetchPatientUUID();

  // Step 1: Probe all endpoints
  console.log('');
  const start = Date.now();
  const results = await runAll(ENDPOINTS, CONCURRENCY);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\
Elapsed: ' + elapsed + 's');

  results.sort((a, b) => (a.crash !== b.crash ? (a.crash ? -1 : 1) : a.endpoint.path.localeCompare(b.endpoint.path)));
  generateReport(results);

  // Force exit — don't let dangling sockets hold the process open
  process.exit(process.exitCode || 0);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(2); });
