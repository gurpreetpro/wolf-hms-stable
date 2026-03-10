const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: process.env.DB_PASSWORD || 'Hospital456!',
    port: 5434, // Cloud SQL Proxy Port
};

const pool = new Pool(poolConfig);

async function seedAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        // Check if user exists
        const res = await pool.query("SELECT * FROM users WHERE username = 'admin_user'");
        
        if (res.rows.length === 0) {
            await pool.query(`
                INSERT INTO users (username, password, role, is_active)
                VALUES ($1, $2, 'Admin', true)
            `, ['admin_user', hashedPassword]);
            console.log('✅ Cloud: Admin user seeded.');
        } else {
            // Update password to be sure
            await pool.query(`
                UPDATE users SET password = $1 WHERE username = 'admin_user'
            `, [hashedPassword]);
            console.log('✅ Cloud: Admin user updated.');
        }
    } catch (err) {
        console.error('❌ Cloud Seed failed:', err);
    } finally {
        await pool.end();
    }
}

seedAdmin();
