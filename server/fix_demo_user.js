const { pool } = require('./config/db');

async function fixUser() {
    try {
        console.log('🔧 Fixing demo_admin hospital_id...');
        const res = await pool.query("UPDATE users SET hospital_id = 1 WHERE username = 'demo_admin'");
        console.log(`✅ Updated ${res.rowCount} users.`);
    } catch (err) {
        console.error('❌ Failed:', err);
    } finally {
        pool.end();
    }
}

fixUser();
