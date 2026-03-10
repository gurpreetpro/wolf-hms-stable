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

async function fixSchema() {
    console.log('🔧 Fixing Cloud Schema (Adding hospital_id to users)...');
    
    // Add hospital_id
    const addCol = await execSql(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE, 
        ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'APPROVED';
    `);
    
    if (addCol && (addCol.command === 'ALTER' || addCol.rows)) {
        console.log('✅ Schema Updated: Added hospital_id, is_active, approval_status');
    } else {
        console.log('⚠️ Migration returned:', addCol);
    }
}

fixSchema();
