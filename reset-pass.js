const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!';

const run = async () => {
    try {
        const hash = '$2b$10$yPlNZu3T59af87Z7jet4GeOYeO.EMddm6nOzhX8/cos3L9VETnku6m'; // admin123
        const result = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, {
            sql: `UPDATE users SET password = '${hash}' WHERE username = 'admin_user'`,
            setupKey: SETUP_KEY
        });
        console.log('[RESET]', result.data);
    } catch (e) {
        console.error(e.message);
    }
};
run();
