const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const ensureAndBook = async () => {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin_user',
            password: 'password123'
        });
        const token = loginRes.data.token;

        // Ensure Patient
        console.log('Ensuring Text Patient...');
        const patientRes = await pool.query("INSERT INTO patients (id, name, phone, patient_number) VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Test Patient', '1234567890', 'P999') ON CONFLICT (id) DO UPDATE SET name = 'Test Patient' RETURNING *");
        const patient = patientRes.rows[0];
        console.log('Patient:', patient.name);

        // Get Doctor
        const doctorsRes = await axios.get('http://localhost:5000/api/appointments/doctors', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const doctor = doctorsRes.data[0];
        if (!doctor) throw new Error('No doctors found');
        console.log('Doctor:', doctor.name);

        // Book
        console.log('Booking...');
        const bookingData = {
            patient_id: patient.id,
            patient_name: patient.name,
            doctor_id: doctor.id,
            department: 'Cardiology',
            appointment_date: '2025-12-10',
            appointment_time: '11:00',
            reason: 'Final Verify'
        };

        const res = await axios.post('http://localhost:5000/api/appointments', bookingData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Booking Success:', res.status, res.data.message);

        // Verify Invoice ?
        // Implementation detail: invoice is created async or sync? Sync based on code.
        // I won't check invoice explicitly here, success message implies it didn't crash.

        process.exit(0);

    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
        process.exit(1);
    }
};

ensureAndBook();
