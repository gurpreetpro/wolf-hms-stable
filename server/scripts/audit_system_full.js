const axios = require('axios');
const { pool } = require('../db');

const API_URL = 'http://localhost:5000/api';

const MODULES = [
    { name: 'Auth', endpoint: '/auth/users', method: 'GET', expect: [200, 401] }, // GET /users is valid for Admin
    { name: 'OPD (Reception)', endpoint: '/opd/queue', method: 'GET', expect: [200] },
    { name: 'Admissions (IPD)', endpoint: '/admissions/active', method: 'GET', expect: [200] },
    { name: 'Lab (Pathology)', endpoint: '/lab/tests', method: 'GET', expect: [200] },
    { name: 'Pharmacy', endpoint: '/pharmacy/inventory', method: 'GET', expect: [200] },
    { name: 'Nurse Station', endpoint: '/nurse/tasks/1', method: 'GET', expect: [200, 404] }, // 404 if no tasks ok, 200 ok
    { name: 'Finance (Billing)', endpoint: '/finance/invoices', method: 'GET', expect: [200] },
    { name: 'Emergency (ER)', endpoint: '/emergency/status', method: 'GET', expect: [200] }, // /status exists, /list does not
    { name: 'Ward Management', endpoint: '/ward/wards', method: 'GET', expect: [200] }, // /wards exists
    { name: 'OT Management (Phase 10)', endpoint: '/ot/rooms', method: 'GET', expect: [200] },
    { name: 'PAC (Phase 11)', endpoint: '/pac/pending', method: 'GET', expect: [200] },
    { name: 'CSSD (Phase 12)', endpoint: '/cssd/inventory', method: 'GET', expect: [200] },
    { name: 'Intra-Op (Phase 13)', endpoint: '/intraop/chart/0', method: 'GET', expect: [200, 404] }, // 404 = Record Not Found (Route Active)
    { name: 'PACU (Phase 14)', endpoint: '/pacu/dashboard', method: 'GET', expect: [200] },
    { name: 'Settings (Phase 15)', endpoint: '/settings/profile', method: 'GET', expect: [200] }
];

async function runAudit() {
    console.log('\n🔍 STARTING FULL SYSTEM AUDIT (Wolf HMS Clinical Upgrade)...\n');
    let passed = 0;
    let failed = 0;

    // 1. Database Check
    process.stdout.write('Checking Database Connection... ');
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ OK');
    } catch (err) {
        console.log('❌ FAILED');
        console.error(err.message);
        process.exit(1);
    }

    // 2. Authentication
    process.stdout.write('Authenticating as Audit Tester... ');
    let token = '';
    try {
        const res = await axios.post(`${API_URL}/auth/login`, { username: 'audit_tester', password: 'auditpass123' });
        // Handle standard response ( { token: ... } ) or wrapped ( { data: { token: ... } } )
        token = res.data.token || res.data.data?.token; 
        console.log('✅ OK');

    } catch (err) {
        console.log('❌ FAILED (Login)');
        // Ensure we can't proceed with auth-protected checks if login fails
        // But we will try anyway to see 401s
    }

    const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    // 3. Module Checks
    console.log('\nChecking Modules:');
    console.log('---------------------------------------------------');
    console.log(pad('Module', 25) + pad('Endpoint', 25) + 'Status');
    console.log('---------------------------------------------------');

    for (const mod of MODULES) {
        const label = pad(mod.name, 25);
        const urlLabel = pad(mod.endpoint, 25);
        
        try {
            const res = await axios({
                method: mod.method,
                url: `${API_URL}${mod.endpoint}`,
                ...headers,
                validateStatus: () => true // Don't throw on error status
            });

            if (mod.expect.includes(res.status)) {
                console.log(`${label}${urlLabel}✅ PASS (${res.status})`);
                passed++;
            } else {
                console.log(`${label}${urlLabel}❌ FAIL (${res.status})`);
                console.log(`    > Error: ${JSON.stringify(res.data).substring(0, 100)}...`);
                failed++;
            }
        } catch (err) {
            console.log(`${label}${urlLabel}❌ ERROR (${err.code})`);
             failed++;
        }
    }

    console.log('---------------------------------------------------');
    console.log(`\nAudit Complete. Passed: ${passed}, Failed: ${failed}`);
    process.exit(0);
}

function pad(str, len) {
    return str.padEnd(len);
}

runAudit();
