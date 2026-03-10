const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');

async function listUsers() {
    try {
        const res = await pool.query('SELECT DISTINCT role FROM users');
        console.log('Valid Roles in DB:', res.rows.map(r => r.role));
        
        const res2 = await pool.query('SELECT id, email, role FROM users LIMIT 5');
        console.log('Sample Users:', res2.rows);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
listUsers();
