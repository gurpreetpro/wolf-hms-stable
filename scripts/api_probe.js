/**
 * Wolf HMS - System-wide API Probe
 * 
 * Tests ALL backend endpoints and identifies:
 * - 500 errors (server crashes)
 * - 404 errors (missing routes)
 * - Database schema issues
 * 
 * Generates a comprehensive stability report
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// =============================================
// CONFIGURATION
// =============================================

const BASE_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';
const SETUP_KEY = 'WolfSetup2024!';

// Test user token (will login to get this)
let authToken = '';

// =============================================
// ALL API ENDPOINTS TO TEST
// =============================================

const ENDPOINTS = [
    // Auth Routes
    { method: 'GET', path: '/api/auth/users', auth: true, name: 'Get Users' },
    { method: 'GET', path: '/api/auth/me', auth: true, name: 'Get Current User' },
    
    // Patient Routes
    { method: 'GET', path: '/api/patients', auth: true, name: 'Get Patients' },
    { method: 'GET', path: '/api/patients/today', auth: true, name: 'Get Today Patients' },
    
    // Admission Routes  
    { method: 'GET', path: '/api/admissions/active', auth: true, name: 'Get Active Admissions' },
    
    // OPD Routes
    { method: 'GET', path: '/api/opd/visits/today', auth: true, name: 'Get Today OPD' },
    { method: 'GET', path: '/api/opd/queue', auth: true, name: 'Get OPD Queue' },
    
    // Lab Routes
    { method: 'GET', path: '/api/lab/queue', auth: true, name: 'Lab Queue' },
    { method: 'GET', path: '/api/lab/stats', auth: true, name: 'Lab Stats' },
    { method: 'GET', path: '/api/lab/tests', auth: true, name: 'Lab Tests' },
    { method: 'GET', path: '/api/lab/reagents', auth: true, name: 'Lab Reagents' },
    { method: 'GET', path: '/api/lab/qc/materials', auth: true, name: 'Lab QC Materials' },
    { method: 'GET', path: '/api/lab/packages', auth: true, name: 'Lab Packages' },
    { method: 'GET', path: '/api/lab/history', auth: true, name: 'Lab History' },
    { method: 'GET', path: '/api/lab/analytics/revenue', auth: true, name: 'Lab Revenue' },
    { method: 'GET', path: '/api/lab/analytics/workload', auth: true, name: 'Lab Workload' },
    { method: 'GET', path: '/api/lab/pending-payments', auth: true, name: 'Lab Pending Payments' },
    
    // Pharmacy Routes
    { method: 'GET', path: '/api/pharmacy/inventory', auth: true, name: 'Pharmacy Inventory' },
    { method: 'GET', path: '/api/pharmacy/prescriptions', auth: true, name: 'Pharmacy Prescriptions' },
    
    // Inventory Routes
    { method: 'GET', path: '/api/inventory', auth: true, name: 'Inventory Items' },
    { method: 'GET', path: '/api/inventory/categories', auth: true, name: 'Inventory Categories' },
    
    // Ward Routes
    { method: 'GET', path: '/api/wards', auth: true, name: 'Get Wards' },
    { method: 'GET', path: '/api/wards/beds', auth: true, name: 'Get Beds' },
    { method: 'GET', path: '/api/wards/consumables', auth: true, name: 'Ward Consumables' },
    
    // Finance Routes
    { method: 'GET', path: '/api/finance/summary', auth: true, name: 'Finance Summary' },
    { method: 'GET', path: '/api/finance/invoices', auth: true, name: 'Finance Invoices' },
    { method: 'GET', path: '/api/finance/transactions', auth: true, name: 'Finance Transactions' },
    { method: 'GET', path: '/api/finance/pending', auth: true, name: 'Finance Pending' },
    { method: 'GET', path: '/api/finance/revenue', auth: true, name: 'Finance Revenue' },
    { method: 'GET', path: '/api/finance/analytics', auth: true, name: 'Finance Analytics' },
    
    // Billing Routes
    { method: 'GET', path: '/api/billing/pending', auth: true, name: 'Billing Pending' },
    { method: 'GET', path: '/api/billing/invoices', auth: true, name: 'Billing Invoices' },
    
    // Blood Bank Routes
    { method: 'GET', path: '/api/bloodbank/inventory', auth: true, name: 'Blood Bank Inventory' },
    { method: 'GET', path: '/api/bloodbank/donors', auth: true, name: 'Blood Bank Donors' },
    
    // Appointment Routes
    { method: 'GET', path: '/api/appointments', auth: true, name: 'Appointments' },
    { method: 'GET', path: '/api/appointments/today', auth: true, name: 'Today Appointments' },
    
    // Dashboard Routes
    { method: 'GET', path: '/api/dashboard/stats', auth: true, name: 'Dashboard Stats' },
    { method: 'GET', path: '/api/dashboard/kpi', auth: true, name: 'Dashboard KPIs' },
    
    // Hospital Routes
    { method: 'GET', path: '/api/hospital/profile', auth: true, name: 'Hospital Profile' },
    { method: 'GET', path: '/api/hospital/departments', auth: true, name: 'Hospital Departments' },
    
    // Staff Routes
    { method: 'GET', path: '/api/staff', auth: true, name: 'Get Staff' },
    
    // Nursing Routes
    { method: 'GET', path: '/api/nurse/care-tasks', auth: true, name: 'Nurse Care Tasks' },
    { method: 'GET', path: '/api/nurse/handover', auth: true, name: 'Nurse Handover' },
    
    // IPD Routes
    { method: 'GET', path: '/api/ipd/rounds', auth: true, name: 'IPD Rounds' },
    { method: 'GET', path: '/api/ipd/vitals', auth: true, name: 'IPD Vitals' },
    
    // Radiology Routes
    { method: 'GET', path: '/api/radiology/queue', auth: true, name: 'Radiology Queue' },
    
    // Reports Routes
    { method: 'GET', path: '/api/reports/daily', auth: true, name: 'Daily Report' },
    
    // Security Routes
    { method: 'GET', path: '/api/security/incidents', auth: true, name: 'Security Incidents' },
    { method: 'GET', path: '/api/security/patrols', auth: true, name: 'Security Patrols' },
    
    // Visitor Routes
    { method: 'GET', path: '/api/visitors/active', auth: true, name: 'Active Visitors' },
    
    // Equipment Routes
    { method: 'GET', path: '/api/equipment', auth: true, name: 'Equipment List' },
    
    // Housekeeping Routes
    { method: 'GET', path: '/api/housekeeping/tasks', auth: true, name: 'Housekeeping Tasks' },
    
    // Dietary Routes
    { method: 'GET', path: '/api/dietary/orders', auth: true, name: 'Dietary Orders' },
    
    // Health Check
    { method: 'GET', path: '/api/health', auth: false, name: 'Health Check' },
];

// =============================================
// TEST FUNCTIONS
// =============================================

async function login() {
    try {
        const res = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'admin_kokila',
            password: 'password123'
        });
        authToken = res.data.token;
        console.log('✅ Login successful\n');
        return true;
    } catch (e) {
        console.error('❌ Login failed:', e.response?.data?.message || e.message);
        return false;
    }
}

async function testEndpoint(endpoint) {
    const url = `${BASE_URL}${endpoint.path}`;
    const headers = endpoint.auth ? { Authorization: `Bearer ${authToken}` } : {};
    
    try {
        const start = Date.now();
        const res = await axios({
            method: endpoint.method,
            url,
            headers,
            timeout: 10000
        });
        const duration = Date.now() - start;
        
        return {
            name: endpoint.name,
            path: endpoint.path,
            status: res.status,
            ok: true,
            duration,
            data_count: Array.isArray(res.data) ? res.data.length : (res.data ? 1 : 0)
        };
    } catch (e) {
        const status = e.response?.status || 0;
        const error = e.response?.data?.message || e.response?.data?.error || e.message;
        
        return {
            name: endpoint.name,
            path: endpoint.path,
            status,
            ok: false,
            error: error.substring(0, 100)
        };
    }
}

// =============================================
// MAIN
// =============================================

async function runProbe() {
    console.log('🔍 Wolf HMS System-wide API Probe');
    console.log('='.repeat(50));
    console.log(`Testing ${ENDPOINTS.length} endpoints...`);
    console.log('');
    
    // Login first
    const loggedIn = await login();
    if (!loggedIn) {
        console.log('Cannot proceed without authentication');
        return;
    }
    
    // Test all endpoints
    const results = [];
    let passed = 0;
    let failed = 0;
    
    for (const endpoint of ENDPOINTS) {
        process.stdout.write(`Testing ${endpoint.name}...`);
        const result = await testEndpoint(endpoint);
        results.push(result);
        
        if (result.ok) {
            passed++;
            console.log(` ✅ ${result.status} (${result.duration}ms)`);
        } else {
            failed++;
            console.log(` ❌ ${result.status} - ${result.error}`);
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed out of ${ENDPOINTS.length}\n`);
    
    // Generate report
    let report = `# System-wide API Probe Report\n\n`;
    report += `**Generated:** ${new Date().toLocaleString('en-IN')}\n\n`;
    report += `## Summary\n\n`;
    report += `| Metric | Count |\n|--------|-------|\n`;
    report += `| Total Endpoints | ${ENDPOINTS.length} |\n`;
    report += `| ✅ Passed | ${passed} |\n`;
    report += `| ❌ Failed | ${failed} |\n`;
    report += `| Success Rate | ${((passed/ENDPOINTS.length)*100).toFixed(1)}% |\n\n`;
    
    // Failed endpoints
    const failedEndpoints = results.filter(r => !r.ok);
    if (failedEndpoints.length > 0) {
        report += `## ❌ Failed Endpoints\n\n`;
        report += `| Endpoint | Status | Error |\n|----------|--------|-------|\n`;
        failedEndpoints.forEach(r => {
            report += `| \`${r.path}\` | ${r.status} | ${r.error} |\n`;
        });
        report += `\n`;
    }
    
    // Successful endpoints
    const passedEndpoints = results.filter(r => r.ok);
    if (passedEndpoints.length > 0) {
        report += `## ✅ Passing Endpoints\n\n`;
        report += `| Endpoint | Status | Duration | Data Count |\n|----------|--------|----------|------------|\n`;
        passedEndpoints.forEach(r => {
            report += `| \`${r.path}\` | ${r.status} | ${r.duration}ms | ${r.data_count} |\n`;
        });
    }
    
    // Save report
    const reportPath = path.join(__dirname, 'api_probe_report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Report saved to: ${reportPath}\n`);
    
    // Print failed endpoints for quick action
    if (failedEndpoints.length > 0) {
        console.log('🔴 FAILED ENDPOINTS REQUIRING IMMEDIATE FIX:');
        failedEndpoints.forEach(r => {
            console.log(`   ${r.path} -> ${r.status}: ${r.error}`);
        });
    }
    
    return { passed, failed, results };
}

runProbe();
