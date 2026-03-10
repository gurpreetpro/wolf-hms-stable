const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!';

const run = async () => {
    try {
        const hash = '$2b$10$yPlNZu3T59af87Z7jet4GeOYeO.EMddm6nOzhX8/cos3L9VETnku6m'; // admin123
        // Insert new user
        const sql = `
            INSERT INTO users (username, password, email, role, hospital_id, is_active)
            VALUES ('admin_test_sql', '${hash}', 'test_sql@wolfhms.com', 'admin', 1, true)
            RETURNING id;
        `;
        const result = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, {
            sql: sql,
            setupKey: SETUP_KEY
        });
        console.log('[INSERT]', result.data);

        // Try Login
        console.log('Logging in...');
        const log = await axios.post(`${CLOUD_URL}/api/users/login`, {
            username: 'admin_test_sql',
            password: 'admin123'
        });
        console.log('[LOGIN]', log.status, log.data.token ? 'Success' : 'Fail');

    } catch (e) {
        console.error('[ERROR]', e.message);
        if (e.response) console.error(JSON.stringify(e.response.data));
    }
};
run();
