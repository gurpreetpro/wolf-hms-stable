const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!';

async function checkTypes() {
    const queries = [
        "SELECT data_type FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'id'",
        "SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id'"
    ];

    for (const q of queries) {
        try {
            console.log(`[EXEC] ${q}`);
            const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { sql: q, setupKey: SETUP_KEY });
            console.log(`[RESULT] ${JSON.stringify(res.data.rows)}`);
        } catch (e) {
            console.error(`[ERROR] ${e.message}`);
        }
    }
}

checkTypes();
