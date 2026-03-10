/**
 * Simple test of exec-sql endpoint
 */
const axios = require('axios');
const CLOUD_URL = 'https://wolf-hms-server-1026194439642.asia-south1.run.app';

async function test() {
    try {
        console.log('Testing exec-sql endpoint...');
        const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { 
            sql: "SELECT 1+1 as result",
            setupKey: 'WolfSetup2024!'
        });
        console.log('Response:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Data:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

test();
