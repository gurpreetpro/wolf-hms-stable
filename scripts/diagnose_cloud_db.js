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
        if (res.data.success) {
            console.log(`Rows: ${res.data.rowCount}`);
            if (res.data.rows.length > 0) {
                 // console.table(res.data.rows); // console.table can be messy in raw output
                 res.data.rows.forEach(r => console.log(JSON.stringify(r)));
            } else {
                console.log('(No rows returned)');
            }
        } else {
            console.error('Failed:', res.data);
        }
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}

async function diagnose() {
    await runQuery('Wards Columns', "SELECT column_name FROM information_schema.columns WHERE table_name = 'wards'");
    await runQuery('Latest Migrations', 'SELECT name, applied_at FROM _migrations ORDER BY id DESC LIMIT 5');
}

diagnose();
