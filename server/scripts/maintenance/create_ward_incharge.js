const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function setupWardIncharge() {
    try {
        console.log('🔧 Updating database for ward_incharge role...');

        // Drop existing constraint
        await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
        console.log('  Dropped old constraint');

        // Add new constraint with ward_incharge
        await pool.query(`
            ALTER TABLE users ADD CONSTRAINT users_role_check 
            CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist', 'anaesthetist', 'ward_incharge', 'billing'))
        `);
        console.log('  Added new constraint with ward_incharge');

        // Create demo user
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password123', salt);

        await pool.query(
            `INSERT INTO users (username, password, email, role, name) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (username) DO UPDATE SET password = $2, role = $4`,
            ['ward_incharge_user', hash, 'ward_incharge@hms.com', 'ward_incharge', 'Ward In-Charge']
        );

        console.log('✅ Created: ward_incharge_user / password123');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        pool.end();
    }
}

setupWardIncharge();
