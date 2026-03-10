const axios = require('axios');
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
    console.log('🚀 Starting Mock Drill...');

    try {
        // 1. Login as Receptionist (to register patient)
        console.log('\n🔑 Logging in as Receptionist...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'receptionist_user', // Updated to match controller expectation
            password: 'password123'
        });
        token = loginRes.data.token;
        console.log('✅ Logged in.');

        // 2. Register Patient
        console.log('\n👤 Registering Patient...');
        const patientData = {
            name: "Test Patient JS",
            dob: "1990-01-01",
            gender: "Male",
            phone: "1234567890",
            address: "Test Address"
        };
        console.log('Sending Patient Data:', patientData);
        // Note: Adjust endpoint if different
        console.log('Token:', token);
        console.log('Headers:', { Authorization: `Bearer ${token}` });
        const patientRes = await axios.post(`${API_URL}/patients`, patientData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        patientId = patientRes.data.id;
        console.log(`✅ Patient Registered: ${patientData.name} (ID: ${patientId})`);

        // 3. Create OPD Visit
        console.log('\n🏥 Creating OPD Visit...');
        const visitRes = await axios.post(`${API_URL}/opd/register`, {
            patient_id: patientId,
            consultation_fee: 500,
            payment_mode: 'Cash'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        visitId = visitRes.data.visit_id; // Adjust if response structure differs
        console.log(`✅ OPD Visit Created (ID: ${visitId})`);

        // 4. Login as Doctor
        console.log('\n👨‍⚕️ Logging in as Doctor...');
        const docLoginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'doctor_user',
            password: 'password123'
        });
        doctorToken = docLoginRes.data.token;
        console.log('✅ Doctor Logged in.');

        // 5. Doctor Consultation (The critical part)
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

        const consultRes = await axios.post(`${API_URL}/clinical/consultation`, consultationData, {
            headers: { Authorization: `Bearer ${doctorToken}` }
        });
        console.log('✅ Consultation Submitted:', consultRes.data.message);

        // 6. Verify Database
        console.log('\n🔍 Verifying Database Records...');

        // Check Diagnosis
        const patRes = await pool.query('SELECT history_json FROM patients WHERE id = $1', [patientId]);
        const history = patRes.rows[0].history_json;
        console.log(`   - Diagnosis in History: ${history.last_diagnosis === 'Viral Fever' ? '✅' : '❌'}`);

        // Check Prescriptions (care_tasks)
        const tasksRes = await pool.query("SELECT * FROM care_tasks WHERE patient_id = $1::uuid AND type = 'Medication'", [patientId]);
        console.log(`   - Prescriptions Saved: ${tasksRes.rows.length === 2 ? '✅' : '❌'} (${tasksRes.rows.length} found)`);

        // Check Lab Requests
        const labsRes = await pool.query("SELECT * FROM lab_requests WHERE patient_id = $1::uuid", [patientId]);
        console.log(`   - Lab Requests Saved: ${labsRes.rows.length === 2 ? '✅' : '❌'} (${labsRes.rows.length} found)`);

        console.log('\n🎉 Mock Drill Completed Successfully!');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ Mock Drill Failed:', err.message);
        if (err.response) {
            console.error('Response Data:', err.response.data);
        }
        process.exit(1);
    }
}

runDrill();
