require('dotenv').config();
const axios = require('axios');
const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const API_URL = 'http://localhost:5001/api';
let doctorToken, nurseToken;
let patientId, admissionId, visitId;

const setup = async () => {
    // Reset passwords
    const hashedPassword = await bcrypt.hash('password123', 10);
    await pool.query("UPDATE users SET password = $1 WHERE username IN ('doctor_user', 'nurse_user')", [hashedPassword]);

    // Login
    const docRes = await axios.post(`${API_URL}/auth/login`, { username: 'doctor_user', password: 'password123' });
    doctorToken = docRes.data.token;

    const nurseRes = await axios.post(`${API_URL}/auth/login`, { username: 'nurse_user', password: 'password123' });
    nurseToken = nurseRes.data.token;

    // Create Patient
    const pRes = await pool.query("INSERT INTO patients (name, dob, gender, phone) VALUES ('Flow Test', '1990-01-01', 'Male', '555-FLOW') RETURNING id");
    patientId = pRes.rows[0].id;

    // Create Admission
    const admRes = await pool.query("INSERT INTO admissions (patient_id, ward, bed_number, status) VALUES ($1, 'Ward A', 'A-101', 'Admitted') RETURNING id", [patientId]);
    admissionId = admRes.rows[0].id;

    // Create OPD Visit (needed for consultation)
    const vRes = await pool.query("INSERT INTO opd_visits (patient_id, doctor_id, status) VALUES ($1, 2, 'Waiting') RETURNING id", [patientId]);
    visitId = vRes.rows[0].id;

    console.log('✅ Setup Complete');
};

const testDoctorPrescribe = async () => {
    try {
        await axios.post(`${API_URL}/clinical/consultation`, {
            visit_id: visitId,
            diagnosis: 'Test Diagnosis',
            prescriptions: [{ name: 'Test Med', dose: '500mg', freq: 'BD' }]
        }, { headers: { Authorization: `Bearer ${doctorToken}` } });
        console.log('✅ Doctor Prescribed Medication');
    } catch (err) {
        console.error('❌ Doctor Prescribe Failed:', err.response?.data || err.message);
    }
};

const testNurseView = async () => {
    try {
        const res = await axios.get(`${API_URL}/nurse/ward-overview`, { headers: { Authorization: `Bearer ${nurseToken}` } });
        const tasks = res.data.tasks;
        const myTask = tasks.find(t => t.description.includes('Test Med') && t.admission_id === admissionId);

        if (myTask) {
            console.log('✅ Nurse sees the task');
            return myTask.id;
        } else {
            console.error('❌ Nurse cannot see the task');
            return null;
        }
    } catch (err) {
        console.error('❌ Nurse View Failed:', err.message);
    }
};

const testNurseComplete = async (taskId) => {
    if (!taskId) return;
    try {
        await axios.post(`${API_URL}/clinical/tasks/complete`, { task_id: taskId }, { headers: { Authorization: `Bearer ${nurseToken}` } });
        console.log('✅ Nurse Completed Task');
    } catch (err) {
        console.error('❌ Nurse Complete Failed:', err.message);
    }
};

const run = async () => {
    await setup();
    await testDoctorPrescribe();
    const taskId = await testNurseView();
    await testNurseComplete(taskId);
    process.exit(0);
};

run();
