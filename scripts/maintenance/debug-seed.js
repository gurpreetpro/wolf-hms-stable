const axios = require('axios');
const bcrypt = require('bcrypt');
const CLOUD_URL = 'https://wolf-hms-1026194439642.asia-south1.run.app';

async function execSql(query) {
    try {
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

async function debugCreate() {
    console.log('🔍 Debugging Lab User Creation...');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);

    // Try 'lab' role
    const sql = `
        INSERT INTO users (username, password, role, is_active, email, approval_status, department) 
        VALUES ('mobile_lab_debug', '${hash}', 'lab', true, 'mobile_lab_debug@test.com', 'APPROVED', 'Pathology') 
        RETURNING id, username
    `;

    const res = await execSql(sql);
    if (res && res.rows) console.log('Success:', res.rows[0]);
}

debugCreate();
