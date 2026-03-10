const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const seedWards = async () => {
    try {
        // Get a patient ID (create one if not exists)
        let patientRes = await pool.query("SELECT id FROM patients LIMIT 1");
        let patientId;

        if (patientRes.rows.length === 0) {
            const newPatient = await pool.query("INSERT INTO patients (name, age, gender, contact) VALUES ('Test Patient', 30, 'Male', '1234567890') RETURNING id");
            patientId = newPatient.rows[0].id;
        } else {
            patientId = patientRes.rows[0].id;
        }

        // Insert Admission for Ward A
        await pool.query(`
            INSERT INTO admissions (patient_id, admission_date, status, ward, bed_number)
            VALUES ($1, NOW(), 'Admitted', 'Ward A', 'A-101')
        `, [patientId]);

        // Insert Admission for Ward B
        await pool.query(`
            INSERT INTO admissions (patient_id, admission_date, status, ward, bed_number)
            VALUES ($1, NOW(), 'Admitted', 'Ward B', 'B-202')
        `, [patientId]);

        console.log('✅ Seeded admissions for Ward A and Ward B');
    } catch (err) {
        console.error('Error seeding wards:', err);
    } finally {
        pool.end();
    }
};

seedWards();
