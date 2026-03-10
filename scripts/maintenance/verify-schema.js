const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!';

const run = async () => {
    try {
        const sql = "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='hospital_id'";
        console.log('Querying schema...');
        const result = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, {
            sql: sql,
            setupKey: SETUP_KEY
        });
        console.log('[SCHEMA]', result.data);
    } catch (e) {
        console.error('[ERROR]', e.message);
        if (e.response) console.error(JSON.stringify(e.response.data));
    }
};
run();
