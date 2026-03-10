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
    }
}

async function checks() {
    console.log('🔍 Checking Constraints...');
    /*
    const sql = `
        SELECT conname as constraint_name, consrc as check_clause
        FROM pg_constraint
        WHERE conrelid = 'users'::regclass
    `;
    */
    // pg_constraint might be restricted. Try information_schema.
    const sql = `SELECT * FROM information_schema.check_constraints`;
    
    const res = await execSql(sql);
    if(res && res.rows) {
        console.log(JSON.stringify(res.rows, null, 2));
    } else {
        console.log('No constraints found or query failed.');
    }
}

checks();
