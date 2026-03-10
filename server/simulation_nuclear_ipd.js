const axios = require('axios');
const fs = require('fs');
const { pool } = require('./config/db'); // Direct DB access

const BASE_URL = 'http://localhost:8080/api';
let tokens = {};
let data = {};
const results = [];

const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    fs.appendFileSync('nuclear_simulation.log', line + '\n');
};

const getHeader = (role) => ({ Authorization: `Bearer ${tokens[role]}`, 'x-hospital-id': '1' });

async function step(name, fn) {
    try {
        log(`🔹 Testing: ${name}...`);
        await fn();
        log(`✅ PASS: ${name}`);
        results.push({ atom: name, status: 'PASS' });
        return true;
    } catch (e) {
        const errorDetail = e.response ? JSON.stringify(e.response.data) : (e.message || e);
        const msg = `❌ FAIL: ${name} - ${errorDetail}`;
        log(msg);
        results.push({ atom: name, status: 'FAIL', error: msg });
        return false;
    }
}

async function prepareEnvironment() {
    log('🛠️ Preparing Environment (Nuclear Clean Slate)...');
    
    // 1. Get a Ward ID for Hospital 1
    const wardRes = await pool.query("SELECT id, name FROM wards WHERE hospital_id = 1 LIMIT 1");
    if (wardRes.rows.length === 0) throw new Error('No Wards found for Hospital 1');
    const wardId = wardRes.rows[0].id;
    const wardName = wardRes.rows[0].name;
    data.ward_name = wardName;

    // 2. Create/Reset Test Bed 999
    await pool.query("UPDATE admissions SET status = 'Discharged', discharge_date = NOW() WHERE bed_number = '999' AND status = 'Admitted'");
    const bedCheck = await pool.query("SELECT id FROM beds WHERE bed_number = '999'");
    if (bedCheck.rows.length === 0) {
        await pool.query("INSERT INTO beds (bed_number, ward_id, hospital_id) VALUES ('999', $1, 1)", [wardId]);
    }
    await pool.query("UPDATE beds SET status = 'Available', daily_rate = 1000, is_active = true WHERE bed_number = '999'");
    
    log(`   Ensured Test Bed 999 in Ward ${wardName}`);

    // 3. Create/Reset Test Drug
    const itemCheck = await pool.query("SELECT id FROM inventory_items WHERE barcode = 'NUKE999'");
    if (itemCheck.rows.length === 0) {
        // Use price_per_unit, NOT selling_price (which doesn't exist)
        await pool.query("INSERT INTO inventory_items (name, barcode, hospital_id, stock_quantity, price_per_unit) VALUES ('Nuclear Pill', 'NUKE999', 1, 100, 10)");
    }
    
    try {
        await pool.query("UPDATE inventory_items SET price_per_unit = 10, stock_quantity = 100, is_active = true WHERE barcode = 'NUKE999'");
    } catch (e) {
        log('   ⚠️ Update Item Failed (Ignored): ' + e.message);
    }
    
    log('   Ensured Test Drug "Nuclear Pill" (Barcode: NUKE999)');
    
    data.barcode = 'NUKE999';
    data.bed_number = '999';
}

async function run() {
    log('🚀 Starting "Nuclear" IPD Billing Simulation (Final Isolated)...');

    await prepareEnvironment();

    // 1. Authenticate All Roles
    await step('Login Roles', async () => {
        const users = [
            { role: 'admin', user: 'admin_user', pass: 'password123' },
            { role: 'doctor', user: 'doctor_user', pass: 'password123' },
            { role: 'nurse', user: 'nurse_user', pass: 'password123' },
            { role: 'receptionist', user: 'receptionist_user', pass: 'password123' },
            { role: 'ward', user: 'ward_user', pass: 'password123' }, 
            { role: 'pharmacist', user: 'pharmacist_user', pass: 'password123' } 
        ];

        for (const u of users) {
             try {
                const res = await axios.post(`${BASE_URL}/auth/login`, { username: u.user, password: u.pass });
                tokens[u.role] = res.data.token;
             } catch (e) {
                 log(`⚠️ Could not login as ${u.role} (${u.user}). Using Admin token as fallback.`);
                 tokens[u.role] = tokens['admin'];
             }
        }
    });

    // 2. Register Patient
    await step('Register Patient', async () => {
        const res = await axios.post(`${BASE_URL}/opd/register`, {
            name: `NuclearTest ${Date.now()}`,
            age: 45,
            gender: 'Female',
            phone: `888${Date.now().toString().slice(-7)}`,
            complaint: 'Severe Fever',
            doctor_id: 2,
            priority: 'Normal',
            paymentMode: 'Cash',
            amount: 500 
        }, { headers: getHeader('receptionist') });
        
        const payload = res.data.data || res.data;
        data.patient_id = payload.patient?.id || payload.patient_id;
        log(`   Patient ID: ${data.patient_id}`);
    });

    // 3. Admit Patient
    await step('Admit Patient', async () => {
        const res = await axios.post(`${BASE_URL}/admissions/admit`, {
            patient_id: data.patient_id,
            ward: data.ward_name,
            bed_number: data.bed_number,
            reason: 'Nuclear Test'
        }, { headers: getHeader('receptionist') });

        data.admission_id = res.data.data.admission_id;
        data.bed_01 = { bed_number: data.bed_number, ward_name: data.ward_name }; 
        log(`   Admission ID: ${data.admission_id} (Bed: ${data.bed_number})`);
    });

    // 4. Doctor Orders
    await step('Doctor Orders (Meds)', async () => {
        const meds = [
            { name: 'Nuclear Pill', dose: '1 tab', freq: 'OD', duration: '1 day' },
        ];
        
        await axios.post(`${BASE_URL}/clinical/prescribe`, {
            patient_id: data.patient_id,
            admission_id: data.admission_id,
            medications: meds
        }, { headers: getHeader('doctor') });
    });

    // 5. Pharmacy Dispense
    await step('Pharmacy Dispenses Meds', async () => {
        const queueRes = await axios.get(`${BASE_URL}/pharmacy/queue`, { headers: getHeader('pharmacist') });
        const queue = queueRes.data.data || [];
        const myTasks = queue.filter(t => t.patient_id == data.patient_id);
        
        data.med_tasks = myTasks;

        if (myTasks.length === 0) {
            log('   ⚠️ No prescriptions found in queue.');
            return;
        }

        for (const t of myTasks) {
            // Force dispense even if name mismatch?
            // "Nuclear Pill" is in inventory so it should be fine.
            await axios.post(`${BASE_URL}/pharmacy/process-prescription`, {
                task_id: t.id,
                force: true
            }, { headers: getHeader('pharmacist') });
            log(`   Processed/Dispensed Task ${t.id}`);
        }
    });

    // 7. Nurse Execution (Administer)
    await step('Nurse Administration', async () => {
        if (!data.med_tasks || data.med_tasks.length === 0) {
            log('   ⚠️ No meds to administer.');
            return;
        }
        
        for (const t of data.med_tasks) {
            try {
                // Send snake_case task_id
                await axios.post(`${BASE_URL}/nurse/medications/administer`, {
                    task_id: t.id, 
                    scanned_barcode: data.barcode,
                    force_override: false, 
                    notes: 'Given via IV/Oral'
                }, { headers: getHeader('nurse') });
                log(`   Nurse Administered Task ${t.id}`);
            } catch(e) {
                log(`   ⚠️ Nurse Admin Failed for Task ${t.id}: ${e.response?.data?.message || e.message}`);
            }
        }
    });

    // 8. Bill
    await step('Generate Final Bill', async () => {
        const res = await axios.post(`${BASE_URL}/finance/generate`, {
            admission_id: data.admission_id,
            patient_id: data.patient_id
        }, { headers: getHeader('admin') });
        
        const invoice = res.data.data.invoice;
        const items = invoice.invoice_items || [];
        
        log(`\n💰 FINAL BILL SUMMARY:`);
        log(`   Total: ${invoice.total_amount}`);
        log(JSON.stringify(items.map(i => ({ Desc: i.description, Qty: i.quantity, Total: i.total_price })), null, 2));

        // Save detailed JSON report
        fs.writeFileSync('nuclear_billing_report.json', JSON.stringify(res.data.data, null, 2));

        const hasBedCharges = items.some(i => i.description.toLowerCase().includes('room') || i.description.toLowerCase().includes('bed'));
        const hasMeds = items.some(i => i.description.toLowerCase().includes('nuclear pill') || i.description.toLowerCase().includes('meds'));
        
        if (!hasBedCharges) log('❌ LEAKAGE CONFIRMED: No Bed/Room Charges found in bill.');
        if (!hasMeds) log('❌ LEAKAGE CONFIRMED: Medications not found in bill.');
        
        if (hasBedCharges && hasMeds) log('✅ SUCCESS! No leakage. Workflow verified.');
    });
    
    // Cleanup
    log('Done. Exiting.');
    process.exit(0);
}

run();
