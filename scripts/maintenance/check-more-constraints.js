const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!';

async function checkMoreConstraints() {
    const tableNames = ['lab_test_types', 'inventory_items'];
    
    for (const t of tableNames) {
        const q = `SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = '${t}'::regclass`;
        try {
            console.log(`--- Constraints for ${t} ---`);
            const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { sql: q, setupKey: SETUP_KEY });
            console.log(JSON.stringify(res.data.rows, null, 2));
        } catch (e) { console.error(e.message); }
    }
}
checkMoreConstraints();
