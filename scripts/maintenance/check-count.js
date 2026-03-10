const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!';

async function checkCount() {
    console.log(`Checking table count...`);
    try {
        const response = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, {
            sql: "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';",
            setupKey: SETUP_KEY
        });
        console.log('✅ Count:', response.data.rows[0].count);
    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

checkCount();
