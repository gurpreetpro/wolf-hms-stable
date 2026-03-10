// Detailed hospital query with JSON output
const pool = require('./config/db');

async function main() {
    try {
        const res = await pool.query('SELECT id, name, code, subdomain, status FROM hospitals ORDER BY id');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}
main();
