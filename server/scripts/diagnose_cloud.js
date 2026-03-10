const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';
const SECRET = 'WolfHMS_Migration_Secret_2026';

async function diagnoseCloud() {
    console.log('=== DIAGNOSING CLOUD SCHEMA ===\n');
    
    try {
        // 1. Check hospitals columns
        console.log('1. Checking hospitals columns...');
        let res = await axios.post(`${CLOUD_URL}/api/sync/sql`, {
            secret: SECRET,
            sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hospitals'`
        });
        const hospitalCols = res.data.rows.map(r => r.column_name);
        console.log('   Cloud Columns:', hospitalCols.join(', '));
        if (!hospitalCols.includes('logo_url')) console.log('   ❌ Missing: logo_url');

        // 2. Check beds table issues
        console.log('\n2. Checking beds table...');
        res = await axios.post(`${CLOUD_URL}/api/sync/sql`, {
            secret: SECRET,
            sql: `SELECT COUNT(*) FROM beds`
        });
        console.log(`   Bed Count: ${res.data.rows[0].count}`);
        
        // Check if beds table exists and columns
        res = await axios.post(`${CLOUD_URL}/api/sync/sql`, {
            secret: SECRET,
            sql: `SELECT column_name FROM information_schema.columns WHERE table_name = 'beds'`
        });
        console.log('   Beds Columns:', res.data.rows.map(r => r.column_name).join(', '));

    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) console.error('Response:', err.response.data);
    }
}

diagnoseCloud();
