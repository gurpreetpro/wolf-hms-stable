const axios = require('axios');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const API_URL = 'http://localhost:8080/api';
let token = '';
let patientId;
let admissionId;
let hospitalId = 1; // Default
let wardId;
let bedNumber = `TEST-TR-${Math.floor(Math.random() * 10000)}`;
let targetBedNumber = `TEST-TR-${Math.floor(Math.random() * 10000)}`;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runTest() {
    try {
        console.log('🚀 Starting Transfer API Test...');

        // 1. Login as Admin
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@kokila.com',
            password: 'password123' 
        }, { headers: { 'x-hospital-id': '1' } });
        token = loginRes.data.token;
        console.log('✅ Login Successful');

        // 2. Setup Data (Direct DB)
        // Get Ward
        const wRes = await pool.query("SELECT id, name FROM wards WHERE name LIKE '%General%' LIMIT 1");
        const wardParams = wRes.rows[0];
        wardId = wardParams.id;
        const wardName = wardParams.name;

        // Create Patient
        const pRes = await pool.query("INSERT INTO patients (name, phone, gender, dob) VALUES ('Transfer Test Patient', '9999999999', 'Male', '1990-01-01') RETURNING id");
        patientId = pRes.rows[0].id;

        // Create 2 Beds
        // Fix Sequence first
        await pool.query("SELECT setval('beds_id_seq', (SELECT MAX(id) FROM beds))");
        
        await pool.query("DELETE FROM beds WHERE bed_number IN ($1, $2)", [bedNumber, targetBedNumber]);
        await pool.query(
            "INSERT INTO beds (ward_id, bed_number, status, hospital_id, bed_type, daily_rate) VALUES ($1, $2, 'Available', $3, 'Standard', 1000), ($1, $4, 'Available', $3, 'Standard', 1000)",
            [wardId, bedNumber, hospitalId, targetBedNumber]
        );

        // Admit Patient to Bed 1
        const admRes = await axios.post(`${API_URL}/admissions/admit`, {
            patient_id: patientId,
            ward: wardName,
            bed_number: bedNumber
        }, { headers: { Authorization: `Bearer ${token}`, 'x-hospital-id': '1' } });
        admissionId = admRes.data.data.admission_id;
        console.log(`✅ Admitted Patient (ID: ${admissionId}) to ${bedNumber}`);

        // 3. Attempt Transfer API
        console.log(`🔄 Attempting Transfer to ${targetBedNumber}...`);
        const transferRes = await axios.post(`${API_URL}/admissions/transfer`, {
            admission_id: admissionId,
            to_ward: wardName,
            to_bed: targetBedNumber
        }, { headers: { Authorization: `Bearer ${token}`, 'x-hospital-id': '1' } });

        console.log('✅ Transfer Response:', transferRes.data);

        // 4. Verify DB
        const check = await pool.query("SELECT bed_number, status FROM admissions WHERE id = $1", [admissionId]);
        console.log('📝 Admission Status after Transfer:', check.rows[0]);
        
        if (check.rows[0].bed_number === targetBedNumber) {
            console.log('🎉 Transfer Logic Works!');
        } else {
            console.error('❌ DB does not reflect transfer!');
        }

    } catch (err) {
        console.error('❌ Test Failed:', err.response ? err.response.data : err.message);
    } finally {
        // Cleanup
        if (admissionId) {
            await pool.query("DELETE FROM bed_history WHERE admission_id = $1", [admissionId]);
            await pool.query("DELETE FROM admissions WHERE id = $1", [admissionId]);
        }
        if (patientId) await pool.query("DELETE FROM patients WHERE id = $1", [patientId]);
        await pool.query("DELETE FROM beds WHERE bed_number IN ($1, $2)", [bedNumber, targetBedNumber]);
        await pool.end();
    }
}

runTest();
