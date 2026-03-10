// Comprehensive API Endpoint Scanner
// Probes all endpoints and categorizes errors by type
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function scan() {
    console.log('🔍 WOLF HMS - Deep System Scan\n' + '='.repeat(50));
    
    // First login to get token
    let token = '';
    try {
        const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'admin_user',
            password: 'password123'
        });
        token = loginRes.data.token;
        console.log('✅ Authentication successful\n');
    } catch (e) {
        console.error('❌ Login failed:', e.message);
        return;
    }
    
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    // All endpoints to test
    const endpoints = [
        // OPD
        { method: 'GET', path: '/api/opd/queue' },
        { method: 'GET', path: '/api/opd/appointments?start=2025-01-01&end=2025-12-31' },
        
        // Admin
        { method: 'GET', path: '/api/admin/users' },
        { method: 'GET', path: '/api/admin/stats' },
        { method: 'GET', path: '/api/admin/pending-approvals' },
        
        // Patients
        { method: 'GET', path: '/api/patients' },
        { method: 'GET', path: '/api/patients/search?term=test' },
        
        // Lab
        { method: 'GET', path: '/api/lab/requests' },
        { method: 'GET', path: '/api/lab/tests' },
        { method: 'GET', path: '/api/lab/change-requests' },
        { method: 'GET', path: '/api/lab/reagents' },
        
        // Pharmacy
        { method: 'GET', path: '/api/pharmacy/inventory' },
        { method: 'GET', path: '/api/pharmacy/low-stock' },
        { method: 'GET', path: '/api/pharmacy/expiring' },
        { method: 'GET', path: '/api/pharmacy/dispensing' },
        { method: 'GET', path: '/api/pharmacy/price-requests' },
        { method: 'GET', path: '/api/pharmacy/po' },
        
        // Admissions & Wards
        { method: 'GET', path: '/api/admissions' },
        { method: 'GET', path: '/api/admissions/active' },
        { method: 'GET', path: '/api/ward/wards' },
        { method: 'GET', path: '/api/ward/consumables' },
        { method: 'GET', path: '/api/ward/service-charges' },
        { method: 'GET', path: '/api/ward/change-requests' },
        
        // Beds
        { method: 'GET', path: '/api/beds/overview' },
        { method: 'GET', path: '/api/beds/wards' },
        
        // Clinical
        { method: 'GET', path: '/api/clinical/tasks' },
        { method: 'GET', path: '/api/clinical/patients' },
        
        // Nurse
        { method: 'GET', path: '/api/nurse/dashboard' },
        { method: 'GET', path: '/api/nurse/shift-handover' },
        { method: 'GET', path: '/api/nurse/consumables' },
        
        // Finance
        { method: 'GET', path: '/api/finance/invoices' },
        { method: 'GET', path: '/api/finance/revenue' },
        { method: 'GET', path: '/api/finance/tpa-receivables' },
        { method: 'GET', path: '/api/finance/kpis' },
        
        // OT
        { method: 'GET', path: '/api/ot/surgeries' },
        { method: 'GET', path: '/api/ot/theaters' },
        
        // PAC/PACU
        { method: 'GET', path: '/api/pac/assessments' },
        { method: 'GET', path: '/api/pacu/records' },
        
        // CSSD
        { method: 'GET', path: '/api/cssd/cycles' },
        { method: 'GET', path: '/api/cssd/machines' },
        
        // Radiology
        { method: 'GET', path: '/api/radiology/requests' },
        
        // Equipment
        { method: 'GET', path: '/api/equipment/items' },
        { method: 'GET', path: '/api/equipment/types' },
        { method: 'GET', path: '/api/equipment/maintenance' },
        
        // Instruments
        { method: 'GET', path: '/instruments/list' },
        { method: 'GET', path: '/instruments/drivers' },
        
        // Insurance
        { method: 'GET', path: '/api/insurance/claims' },
        { method: 'GET', path: '/api/insurance/tpa' },
        
        // TPA
        { method: 'GET', path: '/api/tpa/dashboard' },
        { method: 'GET', path: '/api/tpa/preauths' },
        { method: 'GET', path: '/api/tpa/claims' },
        
        // Preauth
        { method: 'GET', path: '/api/preauth/list' },
        
        // Automation
        { method: 'GET', path: '/api/automation/rules' },
        
        // Settings
        { method: 'GET', path: '/api/settings/hospital' },
        { method: 'GET', path: '/api/settings/departments' },
        
        // Blood Bank
        { method: 'GET', path: '/api/blood-bank/inventory' },
        { method: 'GET', path: '/api/blood-bank/donors' },
        { method: 'GET', path: '/api/blood-bank/requests' },
        
        // POS
        { method: 'GET', path: '/api/pos/providers' },
        { method: 'GET', path: '/api/pos/devices' },
        { method: 'GET', path: '/api/pos/transactions' },
        
        // Roster
        { method: 'GET', path: '/api/roster/current' },
        
        // Transfers
        { method: 'GET', path: '/api/transfers/pending' },
        
        // Analytics
        { method: 'GET', path: '/api/analytics/overview' },
        
        // AI
        { method: 'GET', path: '/api/ai/suggestions' },
        
        // Chat
        { method: 'GET', path: '/api/chat/rooms' },
        
        // Alerts
        { method: 'GET', path: '/api/alerts/active' },
        
        // Devices
        { method: 'GET', path: '/api/devices/list' },
        
        // Emergency
        { method: 'GET', path: '/api/emergency/logs' },
        
        // Procedures table
        { method: 'GET', path: '/api/procedures' },
        
        // Order Sets
        { method: 'GET', path: '/api/order-sets' },
        
        // Care Plans
        { method: 'GET', path: '/api/care-plans' },
        
        // Problem List
        { method: 'GET', path: '/api/problem-list' },
    ];
    
    const results = {
        success: [],
        notFound: [],
        serverError: [],
        dbError: [],
        authError: []
    };
    
    for (const endpoint of endpoints) {
        const url = `${BASE_URL}${endpoint.path}`;
        
        try {
            const res = await axios({ method: endpoint.method, url, ...config, timeout: 5000 });
            results.success.push({ path: endpoint.path, status: res.status });
            process.stdout.write('.');
        } catch (e) {
            const status = e.response?.status;
            const errMsg = e.response?.data?.message || e.response?.data?.error || e.message;
            
            if (status === 404) {
                results.notFound.push({ path: endpoint.path, error: errMsg });
                process.stdout.write('4');
            } else if (status === 401 || status === 403) {
                results.authError.push({ path: endpoint.path, error: errMsg });
                process.stdout.write('A');
            } else if (status === 500) {
                // Check if it's a DB error
                const isDbError = errMsg?.includes('column') || 
                                  errMsg?.includes('relation') || 
                                  errMsg?.includes('table') ||
                                  errMsg?.includes('syntax') ||
                                  errMsg?.includes('does not exist');
                if (isDbError) {
                    results.dbError.push({ path: endpoint.path, error: errMsg });
                    process.stdout.write('D');
                } else {
                    results.serverError.push({ path: endpoint.path, error: errMsg });
                    process.stdout.write('5');
                }
            } else {
                results.serverError.push({ path: endpoint.path, error: errMsg });
                process.stdout.write('E');
            }
        }
    }
    
    console.log('\n\n' + '='.repeat(50));
    console.log('📊 SCAN RESULTS\n');
    
    console.log(`✅ SUCCESS: ${results.success.length} endpoints`);
    console.log(`❌ NOT FOUND (404): ${results.notFound.length} endpoints`);
    console.log(`🔴 SERVER ERROR (500): ${results.serverError.length} endpoints`);
    console.log(`💾 DB/SCHEMA ERROR: ${results.dbError.length} endpoints`);
    console.log(`🔐 AUTH ERROR: ${results.authError.length} endpoints`);
    
    if (results.dbError.length > 0) {
        console.log('\n' + '='.repeat(50));
        console.log('💾 DATABASE/SCHEMA ERRORS (Needs Migration Fix):\n');
        results.dbError.forEach(e => console.log(`  ${e.path}\n    → ${e.error}\n`));
    }
    
    if (results.notFound.length > 0) {
        console.log('\n' + '='.repeat(50));
        console.log('❌ NOT FOUND (404) - Missing Routes:\n');
        results.notFound.forEach(e => console.log(`  ${e.path}`));
    }
    
    if (results.serverError.length > 0) {
        console.log('\n' + '='.repeat(50));
        console.log('🔴 SERVER ERRORS (500):\n');
        results.serverError.forEach(e => console.log(`  ${e.path}\n    → ${e.error}\n`));
    }
    
    // Save to file for analysis
    const fs = require('fs');
    fs.writeFileSync('scan_results.json', JSON.stringify(results, null, 2));
    console.log('\n📁 Full results saved to scan_results.json');
}

scan().catch(console.error);
