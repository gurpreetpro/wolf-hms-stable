const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!';

const run = async () => {
    try {
        const sql = "SELECT * FROM information_schema.tables WHERE table_name='hospitals'";
        const result = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, {
            sql: sql,
            setupKey: SETUP_KEY
        });
        console.log('[HOSPITALS]', result.data.rowCount > 0 ? 'Exists' : 'Missing');

        if (result.data.rowCount > 0) {
             // Check if default hospital exists
             const def = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, {
                sql: "SELECT * FROM hospitals WHERE id=1",
                setupKey: SETUP_KEY
            });
            console.log('[DEFAULT_HOSPITAL]', def.data.rowCount > 0 ? 'Exists' : 'Missing');
        }

    } catch (e) {
        console.error('[ERROR]', e.message);
    }
};
run();
