const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkHealth() {
  try {
    const users = await pool.query('SELECT count(*) FROM users');
    const patients = await pool.query('SELECT count(*) FROM patients');
    const admissions = await pool.query('SELECT count(*) FROM admissions');
    const doctors = await pool.query("SELECT count(*) FROM users WHERE role = 'doctor'");
    
    console.log('--- Database Health Check ---');
    console.log(`Users: ${users.rows[0].count}`);
    console.log(`Doctors: ${doctors.rows[0].count}`);
    console.log(`Patients: ${patients.rows[0].count}`);
    console.log(`Admissions: ${admissions.rows[0].count}`);
    
    // Check for recent specific users
    const rohit = await pool.query("SELECT id, username, role FROM users WHERE username = 'dr_rohit'");
    if (rohit.rows.length > 0) {
        console.log(`User 'dr_rohit' found: YES (ID: ${rohit.rows[0].id})`);
    } else {
        console.log(`User 'dr_rohit' found: NO`);
    }

  } catch (err) {
    console.error('DB Check Failed:', err);
  } finally {
    await pool.end();
  }
}

checkHealth();
