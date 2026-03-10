const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const forceFix = async () => {
    try {
        console.log('Force applying users schema fix...');
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100)");

        console.log('Updating user data...');
        await pool.query("UPDATE users SET name = 'Dr. Smith', department = 'Cardiology' WHERE username = 'doctor_user'");
        await pool.query("UPDATE users SET name = 'Admin User' WHERE username = 'admin_user'");
        await pool.query("UPDATE users SET name = 'Nurse Joy', department = 'General Ward' WHERE username = 'nurse_user'");

        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

forceFix();
