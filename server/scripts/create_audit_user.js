const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

async function createAuditUser() {
    try {
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log('Creating audit user...');
        const res = await pool.query(`
            INSERT INTO users (username, name, email, password, role, hospital_id, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, email, role
        `, ['audit_admin', 'Audit Admin', 'audit@wolfhms.com', hashedPassword, 'admin', 1, true]);
        
        console.log('✅ Audit User Created:', res.rows[0]);

    } catch (err) {
        if (err.code === '23505') { // Unique violation
            console.log('User already exists, updating password...');
            const hashedPassword = await bcrypt.hash('password123', 10);
            await pool.query("UPDATE users SET password = $1 WHERE email = 'audit@wolfhms.com'", [hashedPassword]);
            console.log('✅ Password Reset for audit@wolfhms.com');
        } else {
            console.error('❌ Error:', err);
        }
    } finally {
        pool.end();
    }
}

createAuditUser();
