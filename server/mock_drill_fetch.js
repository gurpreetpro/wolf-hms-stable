const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432
});

const API_URL = 'http://localhost:5000/api';
let token = '';
let doctorToken = '';
let patientId = '';
let visitId = '';

async function runDrill() {
    console.log('🚀 Starting Mock Drill (Fetch Version)...');

    try {
        // 1. Login as Receptionist
        console.log('\n🔑 Logging in as Receptionist...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'receptionist_user',
                password: 'password123'
            })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        token = loginData.token;
        console.log('✅ Logged in.');

        // 2. Register Patient
        console.log('\n👤 Registering Patient...');
        const patientData = {
            name: "Test Patient Fetch",
            dob: "1990-01-01",
            gender: "Male",
            phone: "1234567890",
            address: "Test Address"
        };

        const patientRes = await fetch(`${API_URL}/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(patientData)
        });

        if (!patientRes.ok) {
            const errText = await patientRes.text();
            throw new Error(`Register Patient failed: ${patientRes.status} ${errText}`);
        }

        const patientResData = await patientRes.json();
        patientId = patientResData.id;
        console.log(`✅ Patient Registered: ${patientData.name} (ID: ${patientId})`);

        // 3. Create OPD Visit
        console.log('\n🏥 Creating OPD Visit...');
        const visitRes = await fetch(`${API_URL}/opd/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                patient_id: patientId,
                consultation_fee: 500,
                payment_mode: 'Cash'
            })
        });

        if (!visitRes.ok) throw new Error(`OPD Visit failed: ${visitRes.statusText}`);
        const visitResData = await visitRes.json();
        visitId = visitResData.visit_id;
        console.log(`✅ OPD Visit Created (ID: ${visitId})`);

        // 4. Login as Doctor
        console.log('\n👨‍⚕️ Logging in as Doctor...');
        const docLoginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'doctor_user',
                password: 'password123'
            })
        });

        if (!docLoginRes.ok) throw new Error(`Doctor Login failed: ${docLoginRes.statusText}`);
        const docLoginData = await docLoginRes.json();
        doctorToken = docLoginData.token;
        console.log('✅ Doctor Logged in.');

        // 5. Doctor Consultation
        console.log('\n📝 Submitting Consultation...');
        const consultationData = {
            visit_id: visitId,
            diagnosis: 'Viral Fever',
            prescriptions: [
                { name: 'Paracetamol', dose: '500mg', freq: 'TDS', duration: '5 days' },
                { name: 'Cetirizine', dose: '10mg', freq: 'OD', duration: '5 days' }
            ],
            lab_requests: ['Complete Blood Count', 'Malaria Parasite']
        };

        const consultRes = await fetch(`${API_URL}/clinical/consultation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${doctorToken}`
            },
            body: JSON.stringify(consultationData)
        });

        if (!consultRes.ok) throw new Error(`Consultation failed: ${consultRes.statusText}`);
        const consultResData = await consultRes.json();
        console.log('✅ Consultation Submitted:', consultResData.message);

        // 6. Verify Database
        console.log('\n🔍 Verifying Database Records...');
        const patRes = await pool.query('SELECT history_json FROM patients WHERE id = $1', [patientId]);
        const history = patRes.rows[0].history_json;
        console.log(`   - Diagnosis in History: ${history.last_diagnosis === 'Viral Fever' ? '✅' : '❌'}`);

        const tasksRes = await pool.query("SELECT * FROM care_tasks WHERE patient_id = $1::uuid AND type = 'Medication'", [patientId]);
        console.log(`   - Prescriptions Saved: ${tasksRes.rows.length === 2 ? '✅' : '❌'} (${tasksRes.rows.length} found)`);

        const labsRes = await pool.query("SELECT * FROM lab_requests WHERE patient_id = $1::uuid", [patientId]);
        console.log(`   - Lab Requests Saved: ${labsRes.rows.length === 2 ? '✅' : '❌'} (${labsRes.rows.length} found)`);

        console.log('\n🎉 Mock Drill Completed Successfully!');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ Mock Drill Failed:', err.message);
        process.exit(1);
    }
}

runDrill();
