const axios = require('axios');

const URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app/api/health/exec-sql';
const KEY = 'WolfSetup2024!';

async function runQuery(label, sql) {
    try {
        console.log(`\n--- ${label} ---`);
        const res = await axios.post(URL, {
            setupKey: KEY,
            sql: sql
        });
        if (res.data.success && res.data.rows.length > 0) {
             res.data.rows.forEach(r => console.log(JSON.stringify(r)));
        } else {
            console.log('No rows or failed', res.data);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function diagnose() {
    await runQuery('Last Migration', 'SELECT name, applied_at FROM _migrations ORDER BY id DESC LIMIT 1');
}

diagnose();
