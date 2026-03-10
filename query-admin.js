const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!'; // Using setup key for debug access

const execSql = async (sql) => {
    try {
        console.log(`[QUERY] ${sql}`);
        const response = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, {
            sql: sql,
            setupKey: SETUP_KEY
        });
        console.log('[RESULT]', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('[ERROR]', error.message);
        if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
    }
};

const run = async () => {
    await execSql("SELECT id, username, email, hospital_id FROM users WHERE username = 'admin_user';");
    await execSql("SELECT id, name, code FROM hospitals;");
};

run();
