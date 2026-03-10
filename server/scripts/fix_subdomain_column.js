const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';
const SECRET = 'WolfHMS_Migration_Secret_2026';

async function fixSubdomain() {
    console.log('=== TARGETED FIX FOR SUBDOMAIN ===\n');
    
    try {
        // 1. Inspect Column
        console.log('1. Inspecting subdomain column...');
        let res = await axios.post(`${CLOUD_URL}/api/sync/sql`, {
            secret: SECRET,
            sql: `
                SELECT column_name, is_generated, generation_expression 
                FROM information_schema.columns 
                WHERE table_name = 'hospitals' AND column_name = 'subdomain'
            `
        });
        if (res.data.rows.length > 0) {
            console.log('   Current state:', JSON.stringify(res.data.rows[0]));
        } else {
            console.log('   Column does not exist.');
        }

        // 2. Drop Column
        console.log('\n2. Dropping subdomain column...');
        try {
            await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                secret: SECRET,
                sql: `ALTER TABLE hospitals DROP COLUMN IF EXISTS subdomain CASCADE;`
            });
            console.log('   ✅ Dropped subdomain');
        } catch (e) {
            console.log('   ❌ Failed to drop:', e.message);
        }

        // 3. Re-Add Column
        console.log('\n3. Re-adding subdomain column...');
        try {
            await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                secret: SECRET,
                sql: `ALTER TABLE hospitals ADD COLUMN subdomain VARCHAR(100);`
            });
            console.log('   ✅ Added subdomain');
        } catch (e) {
             console.log('   ❌ Failed to add:', e.message);
        }
        
        // 4. Verify
         console.log('\n4. Verifying...');
        res = await axios.post(`${CLOUD_URL}/api/sync/sql`, {
            secret: SECRET,
            sql: `
                SELECT column_name, is_generated 
                FROM information_schema.columns 
                WHERE table_name = 'hospitals' AND column_name = 'subdomain'
            `
        });
        console.log('   New state:', JSON.stringify(res.data.rows[0]));

    } catch (err) {
        console.error('Error:', err.message);
    }
}

fixSubdomain();
