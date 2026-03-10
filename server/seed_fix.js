const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function seedData() {
  try {
    console.log('--- Starting Data Seeding ---');

    // 1. Create dr_rohit
    const userResult = await pool.query("SELECT * FROM users WHERE username = 'dr_rohit'");
    if (userResult.rows.length === 0) {
        const hashedPassword = await bcrypt.hash('password', 10);
        await pool.query(
            "INSERT INTO users (username, password, role, full_name, email, is_active) VALUES ($1, $2, 'doctor', 'Dr. Rohit', 'dr_rohit@wolf.com', true)",
            ['dr_rohit', hashedPassword]
        );
        console.log("Created user 'dr_rohit'");
    } else {
        console.log("User 'dr_rohit' already exists.");
    }

    // 2. Admit a patient
    const patientRes = await pool.query('SELECT id, name FROM patients LIMIT 1');
    if (patientRes.rows.length === 0) {
        console.error("No patients found! Cannot admit.");
        return;
    }
    const patient = patientRes.rows[0];
    
    // Check if admitted
    const admissionRes = await pool.query("SELECT * FROM admissions WHERE patient_id = $1 AND status = 'Admitted'", [patient.id]);
    if (admissionRes.rows.length === 0) {
        await pool.query(
            "INSERT INTO admissions (patient_id, ward, bed_number, status) VALUES ($1, $2, $3, $4)",
            [patient.id, 'Ward A', '101', 'Admitted']
        );
        console.log(`Admitted patient ${patient.name} (ID: ${patient.id})`);
    } else {
        console.log(`Patient ${patient.name} is already admitted.`);
    }

    console.log('--- Seeding Complete ---');

  } catch (err) {
    console.error('Seeding Failed:', err);
  } finally {
    await pool.end();
  }
}

seedData();
