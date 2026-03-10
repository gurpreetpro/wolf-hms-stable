/**
 * Wolf HMS Local Audit Script v3
 * With correct credentials from reproduce_issue.js
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

const ENDPOINTS = {
    'Core Health': [
        { method: 'GET', path: '/api/health' },
    ],
    'Authentication': [
        { method: 'POST', path: '/api/auth/login', body: { username: 'admin_kokila', password: 'Wolf@2024!' }, expectToken: true },
    ],
    'User Management': [
        { method: 'GET', path: '/api/auth/users', auth: true },
        { method: 'GET', path: '/api/admin/staff', auth: true },
    ],
    'Patient Records': [
        { method: 'GET', path: '/api/patients', auth: true },
    ],
    'Appointments': [
        { method: 'GET', path: '/api/appointments', auth: true },
    ],
    'Ward/IPD': [
        { method: 'GET', path: '/api/ward/admissions', auth: true },
        { method: 'GET', path: '/api/ward/beds', auth: true },
    ],
    'Emergency Management': [
        { method: 'GET', path: '/api/emergency/status', auth: true },
        { method: 'GET', path: '/api/emergency/config', auth: true },
    ],
    'Laboratory': [
        { method: 'GET', path: '/api/lab/orders', auth: true },
    ],
    'Pharmacy': [
        { method: 'GET', path: '/api/pharmacy/medications', auth: true },
    ],
    'Billing': [
        { method: 'GET', path: '/api/billing/invoices', auth: true },
    ],
    'Hospitals': [
        { method: 'GET', path: '/api/hospitals', auth: true },
    ],
    'OPD': [
        { method: 'GET', path: '/api/opd/queue', auth: true },
    ],
};

let token = null;
const results = { passed: 0, failed: 0, errors: [] };

async function runAudit() {
    console.log('WOLF HMS SYSTEM AUDIT REPORT');
    console.log('============================');
    console.log('Target: ' + BASE_URL);
    console.log('Time: ' + new Date().toISOString());
    console.log('============================\n');
    
    for (const [module, endpoints] of Object.entries(ENDPOINTS)) {
        console.log(`[${module}]`);
        
        for (const ep of endpoints) {
            const url = `${BASE_URL}${ep.path}`;
            const headers = ep.auth && token ? { Authorization: `Bearer ${token}` } : {};
            
            try {
                let res;
                if (ep.method === 'GET') {
                    res = await axios.get(url, { headers, timeout: 5000 });
                } else if (ep.method === 'POST') {
                    res = await axios.post(url, ep.body || {}, { headers, timeout: 5000 });
                }
                
                if (ep.expectToken && res.data?.token) {
                    token = res.data.token;
                    console.log(`  ✓ ${ep.path} → AUTHENTICATED`);
                } else {
                    console.log(`  ✓ ${ep.path} → OK`);
                }
                results.passed++;
            } catch (err) {
                const status = err.response?.status || 'NET_ERR';
                const msg = err.response?.data?.message || err.code || err.message;
                console.log(`  ✗ ${ep.path} → ${status} (${msg.substring(0, 50)})`);
                results.failed++;
                results.errors.push({ module, path: ep.path, status, msg });
            }
        }
    }
    
    console.log('\n============================');
    console.log(`SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED`);
    console.log('============================');
    
    if (results.errors.length > 0) {
        console.log('\nFAILED ENDPOINTS:');
        results.errors.forEach(e => {
            console.log(`  ${e.path}: [${e.status}] ${e.msg}`);
        });
    } else {
        console.log('\n✅ ALL CHECKS PASSED - System is healthy!');
    }
    
    process.exit(0);
}

runAudit();
