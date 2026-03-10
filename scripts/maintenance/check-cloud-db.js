const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!';

async function check() {
    console.log(`Checking connection to ${CLOUD_URL}...`);
    try {
        const response = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, {
            sql: "SELECT NOW();",
            setupKey: SETUP_KEY
        });
        console.log('✅ Success:', response.data);
    } catch (error) {
        console.error('❌ Failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

check();
