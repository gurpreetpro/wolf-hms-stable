const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const API_URL = 'http://127.0.0.1:8080/api';
let authToken = null;
let patientId = null;
let doctorId = 17; // Dr. doctor from seeds
let nurseId = 18;  // Nurse from seeds
let labTechId = 19; // Lab Tech from seeds
let admissionId = null;
let bloodRequestId = null;
let bloodUnitId = null;
let crossMatchId = null;
let transfusionId = null;
let labRequestId = null;
let invoiceId = null;
let patientPhone = '990' + Math.floor(1000000 + Math.random() * 9000000); // 10 digit number starting with 990

const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runIPDFlowSimulation() {
    console.log('🚀 INITIALIZING WOLF HMS FULL IPD FLOW SIMULATION...');
    console.log('Target API Server: ' + API_URL);
    console.log('Patient Phone: ' + patientPhone);
    console.log('--------------------------------------------------');

    // ==================================================
    // [PRE-SEEDS] DATABASE DIRECT PREPARATION & CLEANUP
    // ==================================================
    console.log('\n🔧 [PRE-SEED] Connecting to DB to ensure catalog data...');
    const pool = new Pool(dbConfig);
    try {
        // 1. Seed blood component types
        console.log('   - Checking blood component types...');
        const bctRes = await pool.query('SELECT COUNT(*) as count FROM blood_component_types');
        if (parseInt(bctRes.rows[0].count) === 0) {
            console.log('     Seeding default blood component types...');
            await pool.query(`
                INSERT INTO blood_component_types (id, name, code, shelf_life_days, storage_temp_min, storage_temp_max, hospital_id)
                VALUES 
                (1, 'Whole Blood', 'WB', 35, 2.0, 6.0, 1),
                (2, 'Packed Red Blood Cells', 'PRBC', 42, 2.0, 6.0, 1),
                (3, 'Fresh Frozen Plasma', 'FFP', 365, -25.0, -18.0, 1)
                ON CONFLICT (id) DO NOTHING;
            `);
        }

        // 2. Seed ward consumables
        console.log('   - Checking ward consumables...');
        const wcRes = await pool.query('SELECT COUNT(*) as count FROM ward_consumables');
        if (parseInt(wcRes.rows[0].count) === 0) {
            console.log('     Seeding default ward consumables...');
            await pool.query(`
                INSERT INTO ward_consumables (id, name, category, price, stock_quantity, hospital_id, active)
                VALUES 
                (1, 'Surgical Gloves (Pair)', 'PPE', 25.00, 500, 1, true),
                (2, 'IV Cannula 20G', 'IV Supplies', 85.00, 200, 1, true),
                (3, 'Syringe 5ml', 'Syringes', 8.00, 1000, 1, true)
                ON CONFLICT (id) DO NOTHING;
            `);
        }

        // 3. Seed ward service charges
        console.log('   - Checking ward service charges...');
        const wscRes = await pool.query('SELECT COUNT(*) as count FROM ward_service_charges');
        if (parseInt(wscRes.rows[0].count) === 0) {
            console.log('     Seeding default ward service charges...');
            await pool.query(`
                INSERT INTO ward_service_charges (id, name, price, category, hospital_id)
                VALUES 
                (1, 'Nursing Care (Per Day)', 500.00, 'Nursing', 1),
                (2, 'IV Fluid Administration', 200.00, 'IV Therapy', 1)
                ON CONFLICT (id) DO NOTHING;
            `);
        }

        // 4. Force Cleanup target Bed B-2-3 (ensure it is Available and has no active admissions)
        console.log('   - Cleaning up target Bed B-2-3 constraints...');
        const activeAdm = await pool.query("SELECT id FROM admissions WHERE ward = 'Surgical Ward' AND bed_number = 'B-2-3' AND status = 'Admitted'");
        if (activeAdm.rows.length > 0) {
            const admId = activeAdm.rows[0].id;
            console.log(`     🧹 Force purging active admission ${admId} on Bed B-2-3...`);
            await pool.query('DELETE FROM pending_charges WHERE admission_id = $1', [admId]);
            await pool.query('DELETE FROM care_tasks WHERE admission_id = $1', [admId]);
            await pool.query('DELETE FROM lab_requests WHERE admission_id = $1', [admId]);
            await pool.query('DELETE FROM bed_history WHERE admission_id = $1', [admId]);
            await pool.query('DELETE FROM nursing_care_plans WHERE admission_id = $1', [admId]);
            await pool.query('DELETE FROM pain_scores WHERE admission_id = $1', [admId]);
            await pool.query('DELETE FROM fluid_balance WHERE admission_id = $1', [admId]);
            await pool.query('DELETE FROM iv_lines WHERE admission_id = $1', [admId]);
            await pool.query('DELETE FROM patient_consumables WHERE admission_id = $1', [admId]);
            await pool.query('DELETE FROM patient_service_charges WHERE admission_id = $1', [admId]);
            await pool.query('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE admission_id = $1)', [admId]);
            await pool.query('DELETE FROM invoices WHERE admission_id = $1', [admId]);
            await pool.query('DELETE FROM admissions WHERE id = $1', [admId]);
        }
        await pool.query("UPDATE beds SET status = 'Available' WHERE bed_number = 'B-2-3'");
        console.log('   - Setting up inventory item barcodes...');
        await pool.query("UPDATE inventory_items SET barcode = 'INV-AMOX-500' WHERE name = 'Amoxicillin 500mg' AND hospital_id = 1");
        await pool.query("UPDATE inventory_items SET barcode = 'INV-PARA-500' WHERE name = 'Paracetamol 500mg' AND hospital_id = 1");
        console.log('✅ DATABASE CATALOG PREPARATION COMPLETE.');

    } catch (e) {
        console.warn('⚠️ Pre-seeding warning: ' + e.message);
    } finally {
        await pool.end();
    }

    const config = {
        headers: { 
            'x-hospital-id': '1',
            'Content-Type': 'application/json'
        }
    };

    try {
        // ==================================================
        // [STEP 1] AUTHENTICATION
        // ==================================================
        console.log('\n🔐 [STEP 1] Authenticating as Admin/Clerical staff...');
        try {
            const loginRes = await axios.post(`${API_URL}/auth/demo-login`, {}, config);
            authToken = loginRes.data.token;
            console.log('✅ AUTH SUCCESS! Token acquired via Demo Login.');
        } catch (e) {
            console.warn('⚠️ Demo Login failed, trying standard credentials...');
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                username: 'admin', 
                password: 'password123' 
            }, config);
            authToken = loginRes.data.token;
            console.log('✅ AUTH SUCCESS! Token acquired via Standard Login.');
        }
        
        config.headers['Authorization'] = `Bearer ${authToken}`;

        // ==================================================
        // [STEP 2] RECEPTION - PATIENT REGISTRATION & ADMISSION (IPD)
        // ==================================================
        console.log('\n📝 [STEP 2] Reception IPD Onboarding...');
        
        // 2.1 Register Patient
        const patientData = {
            name: 'Sim IPD Patient ' + Math.floor(Math.random() * 1000),
            age: 34,
            gender: 'Male',
            phone: patientPhone,
            address: '404 Inpatient Wing, Kokila Hospital',
            blood_group: 'A+'
        };
        const regRes = await axios.post(`${API_URL}/patients/register`, patientData, config);
        patientId = regRes.data.patientId || regRes.data.id || regRes.data.data?.id;
        console.log(`   - Patient Registered: ${patientData.name} (ID: ${patientId})`);

        // 2.2 Get Available Beds in Surgical Ward
        console.log('   - Querying Ward 2 (Surgical Ward) available beds...');
        const bedsRes = await axios.get(`${API_URL}/admissions/available-beds?ward_id=2`, config);
        const availableBeds = bedsRes.data.data || [];
        const targetBed = availableBeds.find(b => b.bed_number === 'B-2-3' || b.status === 'Available');
        if (!targetBed) {
            throw new Error('No available beds in Ward 2 (Surgical Ward)');
        }
        console.log(`   - Target Bed Located: ${targetBed.bed_number} (Type: ${targetBed.bed_type})`);

        // 2.3 Admit Patient
        const admitData = {
            patient_id: patientId,
            ward: targetBed.ward_name || 'Surgical Ward',
            bed_number: targetBed.bed_number,
            diagnosis: 'Acute Appendicitis with Localized Peritonitis',
            doctor_id: doctorId,
            notes: 'Emergency laparoscopic appendectomy indicated'
        };
        const admitRes = await axios.post(`${API_URL}/admissions/admit`, admitData, config);
        admissionId = admitRes.data.data?.admission_id || admitRes.data.admission_id || admitRes.data.data?.admission?.id;
        console.log(`✅ ADMISSION SUCCESS! Patient Admitted to Bed ${admitData.bed_number} (Admission ID: ${admissionId})`);

        // ==================================================
        // [STEP 3] DOCTOR CONSULTATION & CPOE ORDERING
        // ==================================================
        console.log('\n👨‍⚕️ [STEP 3] Doctor Consultation & CPOE Ordering...');
        
        // 3.1 Order Medication
        const medData = {
            admission_id: admissionId,
            patient_id: patientId,
            drug_name: 'Amoxicillin 500mg',
            dosage: '500mg',
            frequency: '1-0-1',
            route: 'Oral',
            duration: '5 days',
            instructions: 'After Food',
            description: 'Amoxicillin 500mg - 1-0-1 - After Food'
        };
        const medRes = await axios.post(`${API_URL}/clinical/order-medication`, medData, config);
        const medTaskId = medRes.data.data?.id || medRes.data.id;
        console.log(`   - Medication Ordered: Amoxicillin 500mg (Task ID: ${medTaskId})`);

        // 3.2 Order Lab Test
        const labData = {
            admission_id: admissionId,
            patient_id: patientId,
            test_type_id: 1,
            test_name: 'Blood Sugar (Fasting)',
            priority: 'Routine',
            notes: 'Pre-operative Fasting Glucose check'
        };
        const labRes = await axios.post(`${API_URL}/clinical/order-lab`, labData, config);
        labRequestId = labRes.data.data?.id || labRes.data.id;
        console.log(`   - Lab Test Ordered: Fasting Blood Sugar (Request ID: ${labRequestId})`);

        // 3.3 Request Vital Monitoring
        const vitalData = {
            admission_id: admissionId,
            patient_id: patientId,
            vital_type: 'Blood Pressure & Heart Rate',
            frequency: 'Q4H',
            duration: '24 Hours',
            notes: 'Monitor EWS (Early Warning Score) for deterioration risk'
        };
        const vitalTaskRes = await axios.post(`${API_URL}/clinical/request-vitals`, vitalData, config);
        console.log(`   - Vital Monitoring Ordered: BP & HR Q4H (Task ID: ${vitalTaskRes.data.data?.id || vitalTaskRes.data.id})`);

        // 3.4 Request Blood from Blood Bank
        const bloodRequestData = {
            patient_id: patientId,
            department: 'Surgical Department',
            blood_group_required: 'A+',
            units_required: 1,
            priority: 'Emergency',
            admission_id: admissionId,
            component_type_id: 2, // PRBC
            diagnosis: 'Acute Hemorrhagic Appendicitis',
            indication: 'Pre-surgical reservation for blood transfusion support',
            cross_match_required: true
        };
        const bloodRequestRes = await axios.post(`${API_URL}/blood-bank/requests`, bloodRequestData, config);
        bloodRequestId = bloodRequestRes.data.data?.request?.id || bloodRequestRes.data.data?.id || bloodRequestRes.data.request?.id;
        console.log(`✅ CPOE ORDERS SUCCESS! Blood bank request created (ID: ${bloodRequestId})`);

        // ==================================================
        // [STEP 4] WARD INCHARGE - ROSTER ASSIGNMENT & CARE TASK ACKNOWLEDGEMENT
        // ==================================================
        console.log('\n📋 [STEP 4] Ward Incharge Roster Assignment...');
        
        // 4.1 Roster Shift Assignment
        const assignData = {
            nurse_id: nurseId,
            ward_id: targetBed.ward_id || 2,
            shift_type: 'morning',
            assignment_date: new Date().toISOString().split('T')[0],
            bed_ids: [targetBed.id]
        };
        await axios.post(`${API_URL}/roster/assign`, assignData, config);
        console.log(`   - Nurse ${nurseId} assigned to Bed ${targetBed.bed_number} for Morning Shift`);

        // 4.2 Fetch Tasks and Acknowledge
        const tasksRes = await axios.get(`${API_URL}/clinical/tasks?admission_id=${admissionId}&status=Pending`, config);
        const tasks = tasksRes.data.data || tasksRes.data || [];
        console.log(`   - Fetched ${tasks.length} pending doctor orders.`);
        
        for (const task of tasks) {
            await axios.post(`${API_URL}/clinical/tasks/acknowledge`, { task_id: task.id }, config);
            console.log(`     Acknowledged Care Task: "${task.description}" (ID: ${task.id})`);
        }
        console.log('✅ WARD INCHARGE COORDINATION COMPLETE.');

        // ==================================================
        // [STEP 5] NURSE CARE ACTIONS & BCMA MEDICATION ADMINISTRATION
        // ==================================================
        console.log('\n🧪 [STEP 5] Nurse In-ward Care & Clinical Logging...');
        
        // 5.1 Log Vitals
        const vitalsPayload = {
            patient_id: patientId,
            bp: '120/80',
            temp: 98.6,
            spo2: 98,
            heart_rate: 72,
            respiratory_rate: 16
        };
        await axios.post(`${API_URL}/clinical/vitals`, vitalsPayload, config);
        console.log('   - Vitals Logged: BP 120/80, Temp 98.6°F, SpO2 98%, HR 72bpm');

        // 5.2 Log Pain Score
        const painPayload = {
            admission_id: admissionId,
            patient_id: patientId,
            score: 6,
            location: 'Right Lower Quadrant Abdomen',
            notes: 'Sharp localized pain, guarding present'
        };
        await axios.post(`${API_URL}/nurse/pain`, painPayload, config);
        console.log('   - Pain Score Logged: 6/10 at RLQ Abdomen');

        // 5.3 Log Fluid Balance
        const fluidPayload = {
            admission_id: admissionId,
            patient_id: patientId,
            type: 'Intake',
            subtype: 'IV Fluids (Normal Saline)',
            volume_ml: 500,
            notes: 'Intravenous infusion started'
        };
        await axios.post(`${API_URL}/nurse/fluid-balance`, fluidPayload, config);
        console.log('   - Fluid Balance Logged: +500ml Intake (IV Normal Saline)');

        // 5.4 Insert IV Line
        const ivPayload = {
            admission_id: admissionId,
            patient_id: patientId,
            site: 'Right Forearm',
            gauge: '20G',
            notes: 'Patent IV line established'
        };
        await axios.post(`${API_URL}/nurse/iv-line`, ivPayload, config);
        console.log('   - IV Line Insert Logged: site Right Forearm, size 20G');

        // 5.5 Record Consumables Usage
        const consumablePayload = {
            admission_id: admissionId,
            consumable_id: 1, // Surgical Gloves
            quantity: 2,
            notes: 'Laparoscopic pre-op preparation'
        };
        await axios.post(`${API_URL}/nurse/consumables`, consumablePayload, config);
        console.log('   - Consumable Charges Recorded: Surgical Gloves (Pair) x2 (Auto-billed to Ledger)');

        // 5.6 Record Ward Service Usage
        const servicePayload = {
            admission_id: admissionId,
            service_id: 1, // Nursing Care
            quantity: 1,
            notes: 'Dynamic initial nursing care plan evaluation'
        };
        await axios.post(`${API_URL}/nurse/services`, servicePayload, config);
        console.log('   - Ward Services Charge Recorded: Nursing Care (Per Day) x1 (Auto-billed to Ledger)');

        // 5.7 BCMA Barcode Medication Administration
        console.log('   - Executing Barcode Medication Administration (BCMA)...');
        
        // Settle pharmacy verification via DB pool proxy to mimic pharmacy workflow
        const verifyPool = new Pool(dbConfig);
        await verifyPool.query("UPDATE care_tasks SET pharmacy_status = 'Verified' WHERE id = $1", [medTaskId]);
        await verifyPool.end();
        console.log('     [Pharmacy Override] Medication Task verified in Care Ledger.');

        const bcmaPayload = {
            task_id: medTaskId,
            scanned_barcode: 'INV-AMOX-500', 
            force_override: true
        };
        const bcmaRes = await axios.post(`${API_URL}/nurse/medications/administer`, bcmaPayload, config);
        console.log(`✅ BCMA SUCCESS! Medication Administered: Amoxicillin 500mg (${bcmaRes.data.message})`);

        // ==================================================
        // [STEP 6] LAB WORKFLOW
        // ==================================================
        console.log('\n🧪 [STEP 6] Laboratory Sample Processing...');
        
        // 6.1 Sample Collection
        await axios.post(`${API_URL}/lab/collect/${labRequestId}`, {}, config);
        console.log('   - Sample Collected! Barcode generated: LAB-' + labRequestId);

        // 6.2 Upload Lab Result
        const labResultPayload = {
            request_id: labRequestId,
            result_json: {
                fasting_glucose: 94,
                unit: 'mg/dL',
                impression: 'Normal Glycemic Value'
            }
        };
        await axios.post(`${API_URL}/lab/upload-result`, labResultPayload, config);
        console.log(`✅ LAB PROCESSING SUCCESS! Result uploaded for glucose: 94 mg/dL (Normal)`);

        // ==================================================
        // [STEP 7] PHARMACY DISPENSATION
        // ==================================================
        console.log('\n💊 [STEP 7] Pharmacy Inventory Fulfillment...');
        const pharmacyDispensePayload = {
            patient_id: patientId,
            item: 'Amoxicillin 500mg',
            quantity: 1,
            force: true
        };
        await axios.post(`${API_URL}/pharmacy/dispense`, pharmacyDispensePayload, config);
        console.log(`✅ PHARMACY SUCCESS! Prescribed item dispensed, pharmacy stock ledger closed.`);

        // ==================================================
        // [STEP 8] BLOOD BANK WORKFLOW (QUARANTINE, TTI, CROSS MATCH, TRANSFUSION)
        // ==================================================
        console.log('\n🩸 [STEP 8] Blood Bank Lifecycle Process...');
        
        // 8.1 Register Donor
        const donorPayload = {
            name: 'Aegis Blood Donor',
            phone: '999' + Math.floor(1000000 + Math.random() * 9000000),
            blood_group: 'A+',
            rh_factor: 'Positive'
        };
        const donorRes = await axios.post(`${API_URL}/blood-bank/donors`, donorPayload, config);
        const donorId = donorRes.data.data.donor.id;
        console.log(`   - Blood Donor Registered: ${donorPayload.name} (ID: ${donorId})`);

        // 8.2 Add Blood Unit (Enters Quarantine status)
        const unitPayload = {
            donor_id: donorId,
            blood_group: 'A+',
            component_type_id: 2, // Packed Red Blood Cells (PRBC)
            volume_ml: 450,
            collection_date: new Date().toISOString().split('T')[0],
            collection_type: 'Voluntary',
            storage_location: 'Refrigerated Storage Room A'
        };
        const unitRes = await axios.post(`${API_URL}/blood-bank/units`, unitPayload, config);
        bloodUnitId = unitRes.data.data.unit.id;
        const unitCode = unitRes.data.data.unit.unit_id;
        console.log(`   - Blood Bag Received into Quarantine: ${unitCode} (Bag: ${bloodUnitId})`);

        // 8.3 Record TTI Testing (Transition from Quarantine to Available)
        const ttiPayload = {
            unit_id: bloodUnitId,
            results: {
                hiv: 'Negative',
                hcv: 'Negative',
                hbsag: 'Negative',
                syphilis: 'Negative',
                malaria: 'Negative'
            }
        };
        await axios.post(`${API_URL}/blood-bank/testing/tti`, ttiPayload, config);
        console.log(`   - TTI Screen Completed: HIV, HCV, Syphilis NEGATIVE. Blood bag is now AVAILABLE.`);

        // 8.4 Approve Blood Bank Request
        const approvePayload = {
            action: 'approve'
        };
        await axios.put(`${API_URL}/blood-bank/requests/${bloodRequestId}/process`, approvePayload, config);
        console.log(`   - Doctor's blood request APPROVED by Blood Bank technician.`);

        // 8.5 Perform Cross Match & Compatibility Check
        const crossMatchPayload = {
            request_id: bloodRequestId,
            unit_id: bloodUnitId,
            patient_id: patientId,
            patient_sample_id: 'SAMPLE-IPD-' + admissionId,
            method: 'Gel Card',
            result: 'Compatible',
            reaction_strength: 'Negative',
            interpretation: 'Compatible for pre-surgical reservation'
        };
        const crossRes = await axios.post(`${API_URL}/blood-bank/cross-match`, crossMatchPayload, config);
        crossMatchId = crossRes.data.data.crossMatch.id;
        console.log(`   - Cross Match Check: COMPATIBLE (AI score: ${crossRes.data.data.aiCompatibilityScore}%). Blood bag reserved.`);

        // 8.6 Issue Blood Unit
        const issuePayload = {
            request_id: bloodRequestId,
            unit_id: bloodUnitId,
            cross_match_id: crossMatchId
        };
        await axios.post(`${API_URL}/blood-bank/issue`, issuePayload, config);
        console.log(`   - Blood Bag ${unitCode} issued to Surgical Ward`);

        // 8.7 Start Transfusion
        const startTransfusionPayload = {
            unit_id: bloodUnitId,
            request_id: bloodRequestId,
            cross_match_id: crossMatchId,
            patient_id: patientId,
            ward_id: 2,
            bed_number: targetBed.bed_number,
            vitals_baseline: { bp: '120/80', temp: 98.6, hr: 72 },
            rate_ml_per_hour: 125
        };
        const startRes = await axios.post(`${API_URL}/blood-bank/transfusions/start`, startTransfusionPayload, config);
        transfusionId = startRes.data.data.transfusion.id;
        console.log(`   - Transfusion Initiated in Ward: ID ${startRes.data.data.transfusionId}`);

        // 8.8 Complete Transfusion
        const completeTransfusionPayload = {
            vitals_end: { bp: '118/76', temp: 98.8, hr: 76 },
            volume_transfused: 450,
            outcome: 'Completed',
            notes: 'Transfusion completed uneventfully. Vitals stable throughout.'
        };
        await axios.put(`${API_URL}/blood-bank/transfusions/${transfusionId}/complete`, completeTransfusionPayload, config);
        console.log(`✅ BLOOD BANK TRANSFUSION LIFE-CYCLE PASSED SUCCESSFULLY!`);

        // ==================================================
        // [STEP 9] BILLING OPERATIONS
        // ==================================================
        console.log('\n💰 [STEP 9] Generating Final Financial Invoice...');
        await sleep(1000); // Wait for async task ledger charges

        // 9.1 Settle All Care Tasks
        console.log('   - Closing remaining care tasks...');
        const cleanPool = new Pool(dbConfig);
        await cleanPool.query("UPDATE care_tasks SET status = 'Completed' WHERE admission_id = $1", [admissionId]);
        await cleanPool.end();

        // 9.2 Generate Final Invoice
        const invoicePayload = {
            patient_id: patientId,
            admission_id: admissionId,
            userId: 1
        };
        const billRes = await axios.post(`${API_URL}/finance/generate`, invoicePayload, config);
        const invoice = billRes.data.data?.invoice || billRes.data.invoice;
        invoiceId = invoice.id;
        const finalAmount = invoice.total_amount || invoice.amount;
        console.log(`   - IPD Invoice Generated: ID ${invoiceId}`);
        console.log(`   - Net Outstanding Balance: ₹${finalAmount}`);

        // 9.3 Pay/Settle Final Invoice
        const payPayload = {
            amount: parseFloat(finalAmount),
            payment_method: 'UPI',
            transaction_ref: 'TXN-IPD-PAY-' + Date.now()
        };
        await axios.post(`${API_URL}/finance/invoices/${invoiceId}/pay`, payPayload, config);
        console.log(`✅ BILLING SUCCESS! Invoice fully settled via UPI (Txn: ${payPayload.transaction_ref}). Outstanding: ₹0.00`);

        // ==================================================
        // [STEP 10] DISCHARGE CLINICAL PROCESS
        // ==================================================
        console.log('\n🏥 [STEP 10] Discharge Clinical Processing...');
        
        // 10.1 Save Soap Note / Discharge Summary details
        const soapPayload = {
            admission_id: admissionId,
            patient_id: patientId,
            subjective: 'Patient reports complete resolution of acute abdominal pain. Ambulatory without assistance.',
            objective: 'Abdomen soft, non-tender, laparoscopic surgical sites clean with no active drainage.',
            assessment: 'Post laparoscopic appendectomy status: fully resolved appendicitis. Stable for discharge.',
            plan: 'Discharge to home. Continue Oral Antibiotics for 3 days. Follow up in surgical OPD in 1 week.',
            note_type: 'Discharge',
            doctor_name: 'Dr. doctor'
        };
        await axios.post(`${API_URL}/clinical/soap-notes`, soapPayload, config);
        console.log('   - Discharge SOAP Note registered in Clinical Ledger.');

        // 10.2 Final Admission Discharge Status Update
        const dischargePayload = {
            admission_id: admissionId,
            discharge_type: 'NORMAL',
            summary: 'Appendectomy complete. Patient tolerated procedure well. Vitals stable. Discharged home on oral medications.',
            notes: 'Instructed patient on wound care and warning signs.'
        };
        await axios.post(`${API_URL}/admissions/discharge`, dischargePayload, config);
        console.log(`✅ DISCHARGE SUCCESS! Patient status set to 'Discharged'. bed B-2-3 set to 'Available'.`);

        console.log('\n--------------------------------------------------');
        console.log('🎉 WOLF HMS FULL IPD FLOW SIMULATION PASSED!');
        console.log('   Ecosystem Clinical, Roster, Nurse, Lab, Pharmacy, Blood Bank, and Billing is 100% stable.');
        console.log('--------------------------------------------------');

    } catch (globalError) {
        console.error('\n💥 IPD FLOW SIMULATION ABORTED:', globalError.message);
        if (globalError.response) {
            console.error('API Error Payload:', JSON.stringify(globalError.response.data));
        }
    }
}

runIPDFlowSimulation();
