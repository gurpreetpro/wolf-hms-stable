require('dotenv').config();
const axios = require('axios');
const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const API_URL = 'http://localhost:5001/api';
let receptionistToken, doctorToken;
let patientId;

const setupUsers = async () => {
    // Reset passwords
    const hashedPassword = await bcrypt.hash('password123', 10);
    await pool.query("UPDATE users SET password = $1 WHERE username IN ('receptionist_user', 'doctor_user')", [hashedPassword]);
    console.log('✅ Passwords reset');
};

const login = async () => {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, { username: 'receptionist_user', password: 'password123' });
        receptionistToken = res.data.token;
        console.log('✅ Receptionist Login successful');

        const docRes = await axios.post(`${API_URL}/auth/login`, { username: 'doctor_user', password: 'password123' });
        doctorToken = docRes.data.token;
    } catch (err) {
        console.error('❌ Login failed:', err.message);
        process.exit(1);
    }
};

const testStats = async () => {
    try {
        const res = await axios.get(`${API_URL}/reception/stats`, { headers: { Authorization: `Bearer ${receptionistToken}` } });
        if (res.data.beds_available !== undefined && res.data.todays_appointments !== undefined) {
            console.log('✅ Get Reception Stats passed');
        } else {
            console.error('❌ Get Reception Stats failed: Missing data');
        }
    } catch (err) {
        console.error('❌ Get Reception Stats failed:', err.message);
    }
};

const testPatientSearch = async () => {
    try {
        // Create a patient first
        const pRes = await pool.query("INSERT INTO patients (name, dob, gender, phone) VALUES ('Reception Test', '1998-01-01', 'Female', '555-9999') RETURNING id");
        patientId = pRes.rows[0].id;

        const res = await axios.get(`${API_URL}/patients/search?q=Reception`, { headers: { Authorization: `Bearer ${receptionistToken}` } });
        if (res.data.length > 0) {
            console.log('✅ Patient Search passed');
        } else {
            console.error('❌ Patient Search failed: No results');
        }
    } catch (err) {
        console.error('❌ Patient Search failed:', err.message);
    }
};

const testRegisterAndQueue = async () => {
    try {
        // Register new visit
        await axios.post(`${API_URL}/opd/register`, {
            patient_id: patientId,
            doctor_id: 1, // Assuming doctor with ID 1 exists
            complaint: 'Fever'
        }, { headers: { Authorization: `Bearer ${receptionistToken}` } });
        console.log('✅ Register Visit passed');

        // Check Queue
        const qRes = await axios.get(`${API_URL}/opd/queue`, { headers: { Authorization: `Bearer ${receptionistToken}` } });
        if (qRes.data.length > 0) {
            console.log('✅ Get Queue passed');
        } else {
            console.error('❌ Get Queue failed: Empty queue');
        }
    } catch (err) {
        console.error('❌ Register/Queue failed:', err.response?.data || err.message);
    }
};

const runTests = async () => {
    await setupUsers();
    await login();
    await testStats();
    await testPatientSearch();
    await testRegisterAndQueue();
    process.exit(0);
};

runTests();
