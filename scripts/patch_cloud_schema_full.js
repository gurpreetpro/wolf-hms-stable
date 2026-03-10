const axios = require('axios');

const SYNC_SECRET = 'WolfHMS_Migration_Secret_2026';
const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';

async function patchSchema() {
    const commands = [
        `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,
        `CREATE TABLE IF NOT EXISTS patients (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) NOT NULL,
            dob DATE,
            gender VARCHAR(10),
            phone VARCHAR(20),
            address TEXT,
            history_json JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS hospital_id INT;`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);`
    ];
    
    for (const sql of commands) {
        console.log('Executing SQL:', sql.substring(0, 50) + '...');
        try {
            const res = await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                secret: SYNC_SECRET,
                sql: sql
            });
            console.log('Success:', res.data.success);
        } catch (err) {
            console.error('Failed:', err.response ? err.response.data : err.message);
            // Don't stop on error, try to proceed
        }
    }
}

patchSchema();
