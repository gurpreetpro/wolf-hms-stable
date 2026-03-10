require('dotenv').config();
const axios = require('axios');
const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const API_URL = 'http://localhost:5001/api';
let doctorToken, labToken;
let patientId, admissionId, testId, requestId;

const setupUsers = async () => {
    // Reset passwords for doctor and lab_tech
    const hashedPassword = await bcrypt.hash('password123', 10);
    await pool.query("UPDATE users SET password = $1 WHERE username IN ('doctor_user', 'lab_tech_user')", [hashedPassword]);
    console.log('✅ Passwords reset');
};

const login = async () => {
    try {
        const docRes = await axios.post(`${API_URL}/auth/login`, { username: 'doctor_user', password: 'password123' });
        doctorToken = docRes.data.token;
        console.log('✅ Doctor Login successful');

        const labRes = await axios.post(`${API_URL}/auth/login`, { username: 'lab_tech_user', password: 'password123' });
        labToken = labRes.data.token;
        console.log('✅ Lab Tech Login successful');
    } catch (err) {
        console.error('❌ Login failed:', err.message);
        process.exit(1);
    }
};

const setupPatientAndAdmission = async () => {
    try {
        // Create Patient
        const pRes = await pool.query("INSERT INTO patients (name, age, gender, contact) VALUES ('Lab Test Patient', 30, 'Male', '555-0101') RETURNING id");
        patientId = pRes.rows[0].id;

        // Create Admission
        const aRes = await pool.query("INSERT INTO admissions (patient_id, doctor_id, admission_date, status) VALUES ($1, 1, CURRENT_DATE, 'Admitted') RETURNING id", [patientId]);
        admissionId = aRes.rows[0].id;
        console.log('✅ Patient & Admission created');
    } catch (err) {
        console.error('❌ Setup failed:', err.message);
    }
};

const testOrder = async () => {
    try {
        // Ensure test type exists
        const tRes = await pool.query("INSERT INTO lab_test_types (name, price, category) VALUES ('CBC', 500, 'Hematology') ON CONFLICT DO NOTHING RETURNING id");
        // If it existed, we need to fetch it
        if (tRes.rows.length === 0) {
            const fetchT = await pool.query("SELECT id FROM lab_test_types WHERE name = 'CBC'");
            testId = fetchT.rows[0].id;
        } else {
            testId = tRes.rows[0].id;
        }

        const res = await axios.post(`${API_URL}/lab/order`, {
            admission_id: admissionId,
            patient_id: patientId,
            test_type: 'CBC'
        }, { headers: { Authorization: `Bearer ${doctorToken}` } });
        requestId = res.data.id;
        console.log('✅ Order Test passed');
    } catch (err) {
        console.error('❌ Order Test failed:', err.response?.data || err.message);
    }
};

const testCollectSample = async () => {
    try {
        await axios.post(`${API_URL}/lab/collect-sample`, {
            request_id: requestId
        }, { headers: { Authorization: `Bearer ${labToken}` } });
        console.log('✅ Collect Sample passed');

        // Verify Billing
        const invRes = await pool.query("SELECT * FROM invoices WHERE admission_id = $1", [admissionId]);
        if (invRes.rows.length > 0 && invRes.rows[0].total_amount >= 500) {
            console.log('✅ Billing Verification passed');
        } else {
            console.error('❌ Billing Verification failed');
        }
    } catch (err) {
        console.error('❌ Collect Sample failed:', err.response?.data || err.message);
    }
};

const testUploadResult = async () => {
    try {
        await axios.post(`${API_URL}/lab/upload-result`, {
            request_id: requestId,
            result_json: { hemoglobin: 14.5, wbc: 6000 }
        }, { headers: { Authorization: `Bearer ${labToken}` } });
        console.log('✅ Upload Result passed');
    } catch (err) {
        console.error('❌ Upload Result failed:', err.response?.data || err.message);
    }
};

const testReportAndHistory = async () => {
    try {
        // Get Report
        const repRes = await axios.get(`${API_URL}/lab/report/${requestId}`, { headers: { Authorization: `Bearer ${labToken}` } });
        if (repRes.data.result_json.hemoglobin === 14.5) console.log('✅ Get Report passed');
        else console.error('❌ Get Report failed: Data mismatch');

        // Get History
        const histRes = await axios.get(`${API_URL}/lab/history`, { headers: { Authorization: `Bearer ${labToken}` } });
        const found = histRes.data.find(r => r.id === requestId);
        if (found) console.log('✅ Get History passed');
        else console.error('❌ Get History failed');
    } catch (err) {
        console.error('❌ Report/History tests failed:', err.response?.data || err.message);
    }
};

const runTests = async () => {
    await setupUsers();
    await login();
    await setupPatientAndAdmission();
    await testOrder();
    await testCollectSample();
    await testUploadResult();
    await testReportAndHistory();
    process.exit(0);
};

runTests();
