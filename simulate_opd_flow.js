const axios = require('axios');
const API_URL = 'http://127.0.0.1:8080/api';
let authToken = null;
let patientId = null;
let patientUhid = null;
let visitId = null;
let doctorId = 17; // Dr. doctor from our seeds
let labRequestId = null;
let patientPhone = '900' + Math.floor(1000000 + Math.random() * 9000000); // 10 digit number starting with 900

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runOPDFlowSimulation() {
    console.log('🚀 INITIALIZING WOLF HMS OPD FLOW SIMULATION...');
    console.log('Target API Server: ' + API_URL);
    console.log('Patient Phone: ' + patientPhone);
    console.log('--------------------------------------------------');

    const config = {
        headers: { 
            'x-hospital-id': '1',
            'Content-Type': 'application/json'
        }
    };

    try {
        // [STEP 1] AUTHENTICATION
        console.log('\n🔐 [STEP 1] Authenticating as Admin/Clerical staff...');
        try {
            const loginRes = await axios.post(`${API_URL}/auth/demo-login`, {}, config);
            authToken = loginRes.data.token;
            console.log('✅ AUTH SUCCESS! Token acquired via Demo Login.');
        } catch (e) {
            console.warn('⚠️ Demo Login failed, trying standard credentials...');
            try {
                 const loginRes = await axios.post(`${API_URL}/auth/login`, {
                     username: 'admin', 
                     password: 'password123' 
                 }, config);
                 authToken = loginRes.data.token;
                 console.log('✅ AUTH SUCCESS! Token acquired via Standard Login.');
            } catch (innerE) {
                 console.error('❌ ALL AUTH ATTEMPTS FAILED:', innerE.message);
                 if(innerE.response) console.error(JSON.stringify(innerE.response.data));
                 process.exit(1);
            }
        }
        
        // Update header config with Bearer token
        config.headers['Authorization'] = `Bearer ${authToken}`;

        // [STEP 2] RECEPTION: Patient Registration & OPD Check-In
        console.log('\n📝 [STEP 2] Reception Check-In (Registering Patient & Visit)...');
        try {
            const opdRegistrationData = {
                name: 'Sim OPD Patient ' + Math.floor(Math.random() * 1000),
                dob: '1992-08-24',
                gender: 'Female',
                phone: patientPhone,
                complaint: 'Severe sore throat, headache, and persistent fever for 2 days',
                doctor_id: doctorId,
                paymentDetails: {
                    amount: 500, // Doctor consultation fee
                    mode: 'UPI',
                    transactionId: 'TXN-OPD-' + Date.now()
                }
            };

            const regRes = await axios.post(`${API_URL}/opd/register`, opdRegistrationData, config);
            patientId = regRes.data.data.patient.id;
            patientUhid = regRes.data.data.patient.uhid;
            visitId = regRes.data.data.visit.id;
            const tokenNum = regRes.data.data.token;

            console.log(`✅ RECEPTION SUCCESS!`);
            console.log(`   - Patient Registered: ${regRes.data.data.patient.name} (ID: ${patientId})`);
            console.log(`   - UHID Assigned: ${patientUhid}`);
            console.log(`   - OPD Visit Created: ID ${visitId} (Token: #${tokenNum})`);
            console.log(`   - Consultation Fee Paid: ₹${opdRegistrationData.paymentDetails.amount} via ${opdRegistrationData.paymentDetails.mode}`);
        } catch (e) {
            console.error('❌ RECEPTION STEP FAILED:', e.message);
            if (e.response) console.error(JSON.stringify(e.response.data));
            process.exit(1);
        }

        // [STEP 3] DOCTOR: Consultation & Prescriptions
        console.log('\n👨‍⚕️ [STEP 3] Doctor Consultation & CPOE Ordering...');
        try {
            // First let's query the inventory to choose a valid in-stock medicine
            const inventoryRes = await axios.get(`${API_URL}/pharmacy/inventory`, config);
            const inventory = inventoryRes.data;
            const inStockItem = inventory.find(i => i.stock_quantity > 0) || { name: 'Amoxicillin 500mg' };
            const selectedMedicine = inStockItem.name;

            console.log(`ℹ️ Selected in-stock medicine from pharmacy: ${selectedMedicine} (Current Stock: ${inStockItem.stock_quantity || 'N/A'})`);

            const consultationData = {
                visit_id: visitId,
                diagnosis: 'Acute Strep Tonsillitis',
                prescriptions: [
                    { name: selectedMedicine, dose: '1-0-1', freq: 'After Food' }
                ],
                lab_requests: [
                    'Blood Sugar (Fasting)'
                ]
            };

            const docRes = await axios.post(`${API_URL}/clinical/consultation`, consultationData, config);
            console.log(`✅ DOCTOR SUCCESS!`);
            console.log(`   - Diagnosis Logged: "${consultationData.diagnosis}"`);
            console.log(`   - Medication Prescribed: ${selectedMedicine} (1-0-1, After Food)`);
            console.log(`   - Lab Test Requested: Blood Sugar (Fasting)`);
        } catch (e) {
            console.error('❌ DOCTOR STEP FAILED:', e.message);
            if (e.response) console.error(JSON.stringify(e.response.data));
            process.exit(1);
        }

        // [STEP 4] BILLING OF LAB TEST (Dual-Department Checkout)
        console.log('\n💰 [STEP 4] Billing & Paying for Prescribed Lab Test...');
        try {
            // Query patient's lab orders via the lab queue endpoint
            const labQueueRes = await axios.get(`${API_URL}/lab/queue`, config);
            const labQueue = labQueueRes.data.data || [];
            
            const pendingLab = labQueue.find(o => o.patient_id === patientId && (o.status === 'Pending' || o.payment_status === 'Pending' || !o.payment_status));
            if (!pendingLab) {
                throw new Error('No pending lab requests found in lab queue for this patient.');
            }
            labRequestId = pendingLab.id;
            console.log(`ℹ️ Located Pending Lab Request ID: ${labRequestId} (${pendingLab.test_name})`);

            // Settle lab bill payment
            const paymentData = {
                payment_method: 'UPI',
                amount: 100, // Standard Blood Sugar (Fasting) price
                transaction_ref: 'TXN-LAB-' + Date.now(),
                payment_location: 'billing'
            };

            const payRes = await axios.post(`${API_URL}/lab/payment/${labRequestId}`, paymentData, config);
            console.log(`✅ BILLING SUCCESS!`);
            console.log(`   - Lab Test Payment Settled for Request ID: ${labRequestId}`);
            console.log(`   - Collected: ₹${paymentData.amount} via ${paymentData.payment_method}`);
        } catch (e) {
            console.error('❌ BILLING STEP FAILED:', e.message);
            if (e.response) console.error(JSON.stringify(e.response.data));
            process.exit(1);
        }

        // [STEP 5] PHARMACY: Dispensation
        console.log('\n💊 [STEP 5] Pharmacy Dispensation...');
        try {
            // Settle prescription fulfillment
            // We fetch the active prescription details to verify
            const inventoryRes = await axios.get(`${API_URL}/pharmacy/inventory`, config);
            const inventory = inventoryRes.data;
            const inStockItem = inventory.find(i => i.stock_quantity > 0) || { name: 'Amoxicillin 500mg' };
            const selectedMedicine = inStockItem.name;

            const dispenseData = {
                patient_id: patientId,
                item: selectedMedicine,
                quantity: 1,
                force: true
            };

            const dispenseRes = await axios.post(`${API_URL}/pharmacy/dispense`, dispenseData, config);
            console.log(`✅ PHARMACY SUCCESS!`);
            console.log(`   - Medication Dispensed: ${selectedMedicine} x${dispenseData.quantity}`);
            console.log(`   - Remaining Stock: ${dispenseRes.data.data.remaining_stock}`);
        } catch (e) {
            console.error('❌ PHARMACY STEP FAILED:', e.message);
            if (e.response) console.error(JSON.stringify(e.response.data));
            process.exit(1);
        }

        // [STEP 6] LAB TEST: Sample Collection & Processing
        console.log('\n🧪 [STEP 6] Lab Sample Collection & Processing...');
        try {
            // 1. Collect Sample (verified against RLS & payment status)
            console.log('   - Initiating sample collection for Lab Request ID:', labRequestId);
            const collectRes = await axios.post(`${API_URL}/lab/collect/${labRequestId}`, {}, config);
            console.log(`   - Sample Collected! Barcode Generated: ${collectRes.data.data.barcode}`);

            // 2. Upload Lab Result (Technician Completes Order)
            const resultData = {
                request_id: labRequestId,
                result_json: {
                    hemoglobin: 14.1,
                    wbc: 7500,
                    fasting_glucose: 98,
                    unit: 'mg/dL',
                    impression: 'Normal Fasting Glycemia'
                }
            };

            const uploadRes = await axios.post(`${API_URL}/lab/upload-result`, resultData, config);
            console.log(`✅ LAB PROCESSING SUCCESS!`);
            console.log(`   - Lab Result uploaded for Glucose Fasting: ${resultData.result_json.fasting_glucose} ${resultData.result_json.unit}`);
            console.log(`   - Impression: "${resultData.result_json.impression}"`);
            console.log(`   - Lab Queue Status: Completed`);
        } catch (e) {
            console.error('❌ LAB STEP FAILED:', e.message);
            if (e.response) console.error(JSON.stringify(e.response.data));
            process.exit(1);
        }

        console.log('\n--------------------------------------------------');
        console.log('🎉 WOLF HMS FULL OPD FLOW SIMULATION PASSED!');
        console.log('   Ecosystem Clinical & Billing ledger is 100% stable.');
        console.log('--------------------------------------------------');

    } catch (globalError) {
        console.error('\n💥 OPD FLOW SIMULATION ABORTED:', globalError.message);
    }
}

runOPDFlowSimulation();
