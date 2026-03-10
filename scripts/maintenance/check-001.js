const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!';

async function check001() {
    const filePath = path.join(__dirname, 'server/migrations/001_initial_schema.sql');
    console.log(`Reading ${filePath}...`);
    const q = fs.readFileSync(filePath, 'utf8');
    
    try {
        console.log('--- Testing Full 001 SQL ---');
        // console.log(q.substring(0, 500)); 
        const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { sql: q, setupKey: SETUP_KEY });
        console.log('Success:', JSON.stringify(res.data));
    } catch (e) { 
        console.error('Failed:', e.message); 
        if(e.response) {
            console.error(JSON.stringify(e.response.data, null, 2));
        }
    }
}
check001();
