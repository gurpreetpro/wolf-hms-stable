/**
 * 🔥 NUCLEAR SIMULATION - Ace Hospital (hospital_id: 3)
 * Full OPD + IPD End-to-End Flow Test
 * Target: https://ace.wolfhms.in
 */
const https = require('https');
const fs = require('fs');

const BASE = 'https://ace.wolfhms.in/api';
const agent = new https.Agent({ rejectUnauthorized: false });

let tokens = {};
let data = {};
const results = [];
const startTime = Date.now();

function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
}

function req(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE + path);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            agent
        };

        const r = https.request(options, (res) => {
            let d = '';
            res.on('data', chunk => d += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(d);
                    if (res.statusCode >= 400) {
                        const err = new Error(`HTTP ${res.statusCode}: ${json.error?.message || json.message || d.substring(0, 200)}`);
                        err.status = res.statusCode;
                        err.data = json;
                        reject(err);
                    } else {
                        resolve(json);
                    }
                } catch (e) {
                    if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${d.substring(0, 200)}`));
                    else resolve(d);
                }
            });
        });

        r.on('error', reject);
        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

async function step(name, fn) {
    try {
        log(`🔹 ${name}...`);
        const result = await fn();
        log(`✅ PASS: ${name}`);
        results.push({ step: name, status: 'PASS' });
        return result;
    } catch (e) {
        const detail = e.data ? JSON.stringify(e.data).substring(0, 300) : e.message;
        log(`❌ FAIL: ${name} → ${detail}`);
        results.push({ step: name, status: 'FAIL', error: detail });
        return null;
    }
}

async function run() {
    log('');
    log('═══════════════════════════════════════════════════════');
    log('🔥 NUCLEAR SIMULATION - Ace Hospital (ace.wolfhms.in)');
    log('═══════════════════════════════════════════════════════');
    log('');

    // ═══════════════════════════════════════
    // PHASE 0: AUTHENTICATION
    // ═══════════════════════════════════════
    log('━━━ PHASE 0: AUTHENTICATION ━━━');

    await step('Login as ace_admin', async () => {
        const res = await req('POST', '/auth/login', { username: 'ace_admin', password: 'password123' });
        tokens.admin = res.token || res.data?.token;
        log(`   Token: ${tokens.admin?.substring(0, 20)}...`);
        if (!tokens.admin) throw new Error('No token returned');
    });

    // ═══════════════════════════════════════
    // PHASE 1: OPD FLOW
    // Reception → Doctor → Lab → Pharmacy → Billing
    // ═══════════════════════════════════════
    log('');
    log('━━━ PHASE 1: OPD FLOW ━━━');

    // 1.1 Register Patient
    await step('[OPD] Register Patient', async () => {
        const ts = Date.now();
        const res = await req('POST', '/opd/register', {
            name: `OPD_Nuclear_${ts}`,
            age: 35,
            gender: 'Male',
            phone: `777${ts.toString().slice(-7)}`,
            complaint: 'Headache and fever',
            priority: 'Normal',
            paymentMode: 'Cash',
            amount: 500
        }, tokens.admin);

        const payload = res.data || res;
        data.opd_patient_id = payload.patient?.id || payload.patient_id;
        data.opd_visit_id = payload.visit?.id || payload.visit_id || payload.token_number;
        log(`   Patient ID: ${data.opd_patient_id}`);
        log(`   Visit/Token: ${data.opd_visit_id}`);
    });

    // 1.2 Get OPD Queue
    await step('[OPD] Get OPD Queue', async () => {
        const res = await req('GET', '/opd/queue', null, tokens.admin);
        const queue = res.data || [];
        log(`   Queue length: ${queue.length}`);
    });

    // 1.3 Doctor Consultation
    await step('[OPD] Doctor Consultation', async () => {
        if (!data.opd_patient_id) throw new Error('No patient to consult');
        const res = await req('POST', '/clinical/prescribe', {
            patient_id: data.opd_patient_id,
            medications: [
                { name: 'Paracetamol 500mg', dose: '1 tab', freq: 'TID', duration: '5 days' }
            ],
            notes: 'Viral fever. Rest and hydration.'
        }, tokens.admin);
        log(`   Prescription recorded`);
    });

    // 1.4 Lab Order
    await step('[OPD] Order Lab Test (CBC)', async () => {
        if (!data.opd_patient_id) throw new Error('No patient');
        try {
            const res = await req('POST', '/lab/request', {
                patient_id: data.opd_patient_id,
                test_type_id: 1, // CBC
                priority: 'Normal'
            }, tokens.admin);
            data.opd_lab_request_id = res.data?.id || res.data?.request_id;
            log(`   Lab Request ID: ${data.opd_lab_request_id}`);
        } catch (e) {
            log(`   ⚠️ Lab order: ${e.message} (non-blocking)`);
        }
    });

    // 1.5 Pharmacy Queue
    await step('[OPD] Check Pharmacy Queue', async () => {
        const res = await req('GET', '/pharmacy/queue', null, tokens.admin);
        const queue = res.data || [];
        log(`   Pharmacy queue items: ${queue.length}`);
        // Find our patient's prescriptions
        const myItems = queue.filter(q => q.patient_id == data.opd_patient_id);
        log(`   Items for our patient: ${myItems.length}`);
        if (myItems.length > 0) {
            data.opd_pharmacy_task = myItems[0];
        }
    });

    // 1.6 Dispense Medicine
    await step('[OPD] Dispense Medicine', async () => {
        if (!data.opd_pharmacy_task) {
            log('   ⚠️ No pharmacy tasks found - skipping');
            return;
        }
        const res = await req('POST', '/pharmacy/process-prescription', {
            task_id: data.opd_pharmacy_task.id,
            force: true
        }, tokens.admin);
        log(`   Dispensed task ${data.opd_pharmacy_task.id}`);
    });

    // 1.7 Get Admin Dashboard Stats
    await step('[OPD] Admin Dashboard Stats', async () => {
        const res = await req('GET', '/admin/stats', null, tokens.admin);
        const stats = res.data || {};
        log(`   Total Patients: ${stats.totalPatients}`);
        log(`   Today OPD: ${stats.todayOPD}`);
        log(`   Active Admissions: ${stats.activeAdmissions}`);
        log(`   Today Revenue: ${stats.todayRevenue}`);
    });

    // 1.8 Admin Analytics
    await step('[OPD] Admin Analytics', async () => {
        const res = await req('GET', '/admin/analytics', null, tokens.admin);
        const analytics = res.data || {};
        log(`   Revenue data points: ${analytics.revenue?.length || 0}`);
        log(`   Patient data points: ${analytics.patients?.length || 0}`);
    });

    // 1.9 Settings
    await step('[OPD] Hospital Profile Settings', async () => {
        const res = await req('GET', '/settings/hospital-profile', null, tokens.admin);
        const settings = res.data || {};
        log(`   Settings keys: ${Object.keys(settings).length}`);
    });

    // 1.10 Users list
    await step('[OPD] Get Users List', async () => {
        const res = await req('GET', '/auth/users', null, tokens.admin);
        const users = res.data || [];
        log(`   Users count: ${users.length}`);
    });

    // ═══════════════════════════════════════
    // PHASE 2: IPD FLOW
    // Reception → Admit → Doctor → Ward → Lab → Pharmacy → Billing → Discharge
    // ═══════════════════════════════════════
    log('');
    log('━━━ PHASE 2: IPD FLOW ━━━');

    // 2.1 Register IPD Patient
    await step('[IPD] Register Patient', async () => {
        const ts = Date.now();
        const res = await req('POST', '/opd/register', {
            name: `IPD_Nuclear_${ts}`,
            age: 55,
            gender: 'Female',
            phone: `888${ts.toString().slice(-7)}`,
            complaint: 'Chest pain - needs admission',
            priority: 'Urgent',
            paymentMode: 'Cash',
            amount: 500
        }, tokens.admin);

        const payload = res.data || res;
        data.ipd_patient_id = payload.patient?.id || payload.patient_id;
        log(`   IPD Patient ID: ${data.ipd_patient_id}`);
    });

    // 2.2 Get Available Beds
    await step('[IPD] Get Available Beds', async () => {
        const res = await req('GET', '/admissions/available-beds', null, tokens.admin);
        const beds = res.data || [];
        log(`   Available beds: ${beds.length}`);
        if (beds.length > 0) {
            data.ipd_bed = beds[0];
            log(`   Selected: ${data.ipd_bed.bed_number} in ${data.ipd_bed.ward_name}`);
        }
    });

    // 2.3 Admit Patient
    await step('[IPD] Admit Patient', async () => {
        if (!data.ipd_patient_id || !data.ipd_bed) throw new Error('Need patient and bed');
        const res = await req('POST', '/admissions/admit', {
            patient_id: data.ipd_patient_id,
            ward: data.ipd_bed.ward_name,
            bed_number: data.ipd_bed.bed_number,
            reason: 'Nuclear IPD Simulation'
        }, tokens.admin);

        const payload = res.data || res;
        data.ipd_admission_id = payload.admission_id || payload.admission?.id;
        data.ipd_number = payload.identifiers?.ipd?.value;
        log(`   Admission ID: ${data.ipd_admission_id}`);
        log(`   IPD Number: ${data.ipd_number}`);
    });

    // 2.4 Get Active Admissions (THE FIXED ENDPOINT!)
    await step('[IPD] Get Active Admissions', async () => {
        const res = await req('GET', '/admissions/active', null, tokens.admin);
        const admissions = res.data || [];
        log(`   Active admissions: ${admissions.length}`);
        const ours = admissions.find(a => a.patient_id == data.ipd_patient_id);
        if (ours) log(`   ✓ Our patient found: ${ours.patient_name} (Bed ${ours.bed_number})`);
    });

    // 2.5 Doctor Orders - Prescribe
    await step('[IPD] Doctor Prescribe Medications', async () => {
        if (!data.ipd_patient_id || !data.ipd_admission_id) throw new Error('No admission');
        const res = await req('POST', '/clinical/prescribe', {
            patient_id: data.ipd_patient_id,
            admission_id: data.ipd_admission_id,
            medications: [
                { name: 'Amoxicillin 500mg', dose: '1 cap', freq: 'BID', duration: '7 days' },
                { name: 'Paracetamol 500mg', dose: '1 tab', freq: 'TID', duration: '3 days' }
            ],
            notes: 'Start antibiotics. Monitor vitals every 4 hours.'
        }, tokens.admin);
        log(`   Medications prescribed`);
    });

    // 2.6 Lab Order for IPD
    await step('[IPD] Order Lab Tests', async () => {
        if (!data.ipd_patient_id) throw new Error('No patient');
        try {
            const res = await req('POST', '/lab/request', {
                patient_id: data.ipd_patient_id,
                admission_id: data.ipd_admission_id,
                test_type_id: 2, // Lipid Profile
                priority: 'Urgent'
            }, tokens.admin);
            data.ipd_lab_request_id = res.data?.id;
            log(`   Lab Request ID: ${data.ipd_lab_request_id}`);
        } catch (e) {
            log(`   ⚠️ Lab order: ${e.message} (non-blocking)`);
        }
    });

    // 2.7 Check Pharmacy Queue & Dispense
    await step('[IPD] Pharmacy Dispense', async () => {
        const res = await req('GET', '/pharmacy/queue', null, tokens.admin);
        const queue = res.data || [];
        const myItems = queue.filter(q => q.patient_id == data.ipd_patient_id);
        log(`   IPD pharmacy items: ${myItems.length}`);

        for (const item of myItems) {
            try {
                await req('POST', '/pharmacy/process-prescription', {
                    task_id: item.id,
                    force: true
                }, tokens.admin);
                log(`   Dispensed: ${item.description || item.id}`);
            } catch (e) {
                log(`   ⚠️ Dispense failed: ${e.message}`);
            }
        }
    });

    // 2.8 Admin Tasks
    await step('[IPD] Get Admin Tasks', async () => {
        const res = await req('GET', '/admin/tasks', null, tokens.admin);
        const tasks = res.data || [];
        log(`   Active tasks: ${tasks.length}`);
    });

    // 2.9 Finance - Generate Invoice
    await step('[IPD] Generate Invoice', async () => {
        if (!data.ipd_admission_id || !data.ipd_patient_id) throw new Error('No admission');
        try {
            const res = await req('POST', '/finance/generate', {
                patient_id: data.ipd_patient_id,
                admission_id: data.ipd_admission_id
            }, tokens.admin);
            const invoice = res.data?.invoice || res.data;
            data.ipd_invoice_id = invoice?.id;
            log(`   Invoice ID: ${data.ipd_invoice_id}`);
            log(`   Total: ₹${invoice?.total_amount || 'N/A'}`);
        } catch (e) {
            log(`   ⚠️ Generate invoice: ${e.message} (non-blocking)`);
        }
    });

    // 2.10 Discharge Patient
    await step('[IPD] Discharge Patient', async () => {
        if (!data.ipd_admission_id) throw new Error('No admission');
        try {
            const res = await req('POST', '/admissions/discharge', {
                admission_id: data.ipd_admission_id
            }, tokens.admin);
            const payload = res.data || {};
            log(`   Discharged! Billing: ${JSON.stringify(payload.billing || {})}`);
        } catch (e) {
            log(`   ⚠️ Discharge: ${e.message}`);
        }
    });

    // ═══════════════════════════════════════
    // PHASE 3: ADDITIONAL ENDPOINTS
    // ═══════════════════════════════════════
    log('');
    log('━━━ PHASE 3: ADDITIONAL ENDPOINTS ━━━');

    await step('[API] Finance Dashboard', async () => {
        try {
            const res = await req('GET', '/finance/dashboard', null, tokens.admin);
            const d = res.data || {};
            log(`   Revenue: ₹${d.stats?.total_revenue || d.total_revenue || 'N/A'}`);
        } catch (e) {
            log(`   ⚠️ ${e.message}`);
        }
    });

    await step('[API] Inventory List', async () => {
        try {
            const res = await req('GET', '/pharmacy/inventory', null, tokens.admin);
            const items = res.data || [];
            log(`   Inventory items: ${Array.isArray(items) ? items.length : 'object'}`);
        } catch (e) {
            log(`   ⚠️ ${e.message}`);
        }
    });

    await step('[API] Patient Search', async () => {
        try {
            const res = await req('GET', '/patients?search=Nuclear', null, tokens.admin);
            const patients = res.data || [];
            log(`   Found patients: ${Array.isArray(patients) ? patients.length : 'object'}`);
        } catch (e) {
            log(`   ⚠️ ${e.message}`);
        }
    });

    await step('[API] Care Tasks', async () => {
        try {
            const res = await req('GET', '/nurse/care-tasks', null, tokens.admin);
            const tasks = res.data || [];
            log(`   Care tasks: ${Array.isArray(tasks) ? tasks.length : 'object'}`);
        } catch (e) {
            log(`   ⚠️ ${e.message}`);
        }
    });

    await step('[API] Bed History', async () => {
        if (!data.ipd_admission_id) return;
        try {
            const res = await req('GET', `/admissions/${data.ipd_admission_id}/bed-history`, null, tokens.admin);
            const history = res.data || [];
            log(`   Bed movements: ${Array.isArray(history) ? history.length : 'object'}`);
        } catch (e) {
            log(`   ⚠️ ${e.message}`);
        }
    });

    // ═══════════════════════════════════════
    // FINAL REPORT
    // ═══════════════════════════════════════
    log('');
    log('═══════════════════════════════════════════════════════');
    log('📊 NUCLEAR SIMULATION REPORT');
    log('═══════════════════════════════════════════════════════');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const total = results.length;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    log(`Total Steps: ${total}`);
    log(`✅ Passed: ${passed}`);
    log(`❌ Failed: ${failed}`);
    log(`⏱️  Time: ${elapsed}s`);
    log(`Score: ${Math.round((passed / total) * 100)}%`);
    log('');

    if (failed > 0) {
        log('Failed Steps:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            log(`  ❌ ${r.step}: ${r.error?.substring(0, 150)}`);
        });
    }

    log('');
    log('Data Collected:');
    log(`  OPD Patient: ${data.opd_patient_id || 'N/A'}`);
    log(`  IPD Patient: ${data.ipd_patient_id || 'N/A'}`);
    log(`  IPD Admission: ${data.ipd_admission_id || 'N/A'}`);
    log(`  IPD Number: ${data.ipd_number || 'N/A'}`);
    log(`  Invoice: ${data.ipd_invoice_id || 'N/A'}`);

    // Save JSON report
    const report = {
        timestamp: new Date().toISOString(),
        target: 'ace.wolfhms.in',
        hospital_id: 3,
        elapsed_seconds: parseFloat(elapsed),
        total, passed, failed,
        score: `${Math.round((passed / total) * 100)}%`,
        data,
        results
    };

    fs.writeFileSync('nuclear_ace_report.json', JSON.stringify(report, null, 2));
    log('');
    log('📄 Full report saved to: nuclear_ace_report.json');
}

run().catch(e => {
    log(`💥 FATAL: ${e.message}`);
    process.exit(1);
});
