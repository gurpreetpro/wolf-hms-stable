const { Pool } = require('pg');
const axios = require('axios');
const https = require('https');

// Config
const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app/api/sync/restore';
const SYNC_SECRET = 'WolfHMS_Migration_Secret_2026';

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432,
});

async function runSync() {
    try {
        console.log('🚀 Starting "The Great Sync" (Local -> Cloud)...');
        console.log(`Target: ${CLOUD_URL}`);
        
        // 1. Fetch Hospitals
        console.log('📦 Fetching Hospitals...');
        const hospitals = await pool.query('SELECT * FROM hospitals');
        
        // 2. Fetch Users
        console.log('📦 Fetching Users...');
        const users = await pool.query('SELECT * FROM users');

        // 3. Fetch Patients
        console.log('📦 Fetching Patients...');
        const patients = await pool.query('SELECT * FROM patients');

        // Prepare Payload
        const payload = {
            secret: SYNC_SECRET,
            hospitals: hospitals.rows,
            users: users.rows,
            patients: patients.rows
        };

        console.log(`\nReady to upload:`);
        console.log(`- ${hospitals.rows.length} Hospitals`);
        console.log(`- ${users.rows.length} Users`);
        console.log(`- ${patients.rows.length} Patients`);

        // Send to Cloud
        console.log('\n📤 Uploading to Cloud...');
        // Ignore SSL errors if any (Cloud Run uses valid certs, but good for safety)
        const agent = new https.Agent({ rejectUnauthorized: false });
        
        try {
            const response = await axios.post(CLOUD_URL, payload, { 
                httpsAgent: agent,
                headers: { 'Content-Type': 'application/json' },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            console.log('✅ SYNC SUCCESS:', response.data);
        } catch (postErr) {
            console.error('❌ Upload Failed:', postErr.response ? postErr.response.data : postErr.message);
        }

    } catch (err) {
        console.error('❌ Sync Logic Error:', err);
    } finally {
        await pool.end();
    }
}

runSync();
