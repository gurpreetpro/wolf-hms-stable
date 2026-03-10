const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432,
});

async function fixData() {
    try {
        console.log('--- 🔧 FIXING LOCAL DATA ---');

        // 1. Fix admin_taneja
        const fixTaneja = await pool.query(
            "UPDATE users SET hospital_id = 2 WHERE username = 'admin_taneja' RETURNING id, username, hospital_id"
        );
        if (fixTaneja.rows.length > 0) {
            console.log(`✅ Fixed: ${fixTaneja.rows[0].username} is now in Hospital ID ${fixTaneja.rows[0].hospital_id}`);
        } else {
            console.log('⚠️ Could not find admin_taneja');
        }

        // 2. Reset gurpreetpro password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password123', salt);
        
        const resetPw = await pool.query(
            "UPDATE users SET password = $1 WHERE username = 'gurpreetpro' RETURNING id, username",
            [hash]
        );
        
        if (resetPw.rows.length > 0) {
            console.log(`✅ Password Reset: ${resetPw.rows[0].username} password set to 'password123'`);
        } else {
            console.log('⚠️ Could not find gurpreetpro');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

fixData();
