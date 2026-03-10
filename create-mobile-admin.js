const axios = require('axios');
const bcrypt = require('bcrypt'); // Need bcrypt locally to hash password for SQL insert
const CLOUD_URL = 'https://wolf-hms-1026194439642.asia-south1.run.app';

async function execSql(query, params) {
    try {
        // exec-sql typically takes raw SQL. 
        // If the backend exec-sql supports params, good. If not, we must interpolate.
        // Looking at backend logs, it likely runs pool.query(sql).
        // Safest is to Interpolate carefully for this admin script.
        const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { 
            sql: query,
            setupKey: 'WolfSetup2024!'
        });
        return res.data;
    } catch (e) {
        console.error(`[ERROR] ${e.message}`);
        if(e.response) console.error(JSON.stringify(e.response.data));
    }
}

async function createMobileAdmin() {
    console.log('🔍 Creating Mobile Admin User...');

    // 1. Get Hospital ID
    const hospRes = await execSql("SELECT id FROM hospitals WHERE code = 'mobile-test'");
    if (!hospRes || !hospRes.rows || hospRes.rows.length === 0) {
        console.error('❌ Hospital mobile-test not found!');
        return;
    }
    const hospId = hospRes.rows[0].id;
    console.log(`✅ Found Hospital ID: ${hospId}`);

    // 2. Hash Password (run locally)
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    console.log(`🔑 Generated Hash: ${hash.substring(0, 10)}...`);

    // 3. Check if user exists
    const checkUser = await execSql("SELECT id FROM users WHERE username = 'mobile_admin'");
    if (checkUser && checkUser.rows && checkUser.rows.length > 0) {
        console.log(`✅ User mobile_admin already exists. ID: ${checkUser.rows[0].id}`);
        // Ensure hospital_id is correct?
        // UPDATE users SET hospital_id = ...
        const update = `UPDATE users SET hospital_id = ${hospId}, role = 'admin', is_active = true WHERE username = 'mobile_admin' RETURNING id`;
        await execSql(update);
        console.log('✅ Updated existing user permissions.');
        return;
    }

    // 4. Create User (Simple Line) without hospital_id
    const sql = `INSERT INTO users (username, password, role, is_active, email, approval_status) VALUES ('mobile_admin', '${hash}', 'admin', true, 'mobile_admin@test.com', 'APPROVED') RETURNING id, username`;

    try {
        const userRes = await execSql(sql);
        if (userRes && userRes.rows && userRes.rows.length > 0) {
            console.log(`✅ Success! Created user: ${userRes.rows[0].username} (ID: ${userRes.rows[0].id})`);
        } else {
            console.log('⚠️ Insert returned no rows. Raw:', userRes);
        }
    } catch (e) {
        console.log('Insert Failed:', e.message);
    }
}

createMobileAdmin();
