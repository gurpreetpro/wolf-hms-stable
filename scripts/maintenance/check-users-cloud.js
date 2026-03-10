const axios = require('axios');
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

async function check() {
    console.log('🔍 Checking Users Table...');
    // Check if table exists in information_schema
    const schema = await execSql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    if (schema && schema.rows) {
        console.log('Tables found:', schema.rows.map(r => r.table_name));
    }

    // Try selecting
    const res = await execSql('SELECT count(*) FROM users');
    if (res && res.rows) {
        console.log('Users count:', res.rows[0]);
    } else {
        console.log('SELECT failed.');
    }
}

check();
