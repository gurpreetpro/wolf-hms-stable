const axios = require('axios');

const SYNC_SECRET = 'WolfHMS_Migration_Secret_2026';
const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';

async function patchSchema() {
    const sql = "ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'STANDARD';";
    
    console.log('Executing SQL:', sql);
    try {
        const res = await axios.post(`${CLOUD_URL}/api/sync/sql`, {
            secret: SYNC_SECRET,
            sql: sql
        });
        console.log('Success:', res.data);
    } catch (err) {
        console.error('Failed:', err.response ? err.response.data : err.message);
    }
}

patchSchema();
