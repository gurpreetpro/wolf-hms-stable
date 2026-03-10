const pool = require('./config/db');

(async () => {
    try {
        const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%emerg%'");
        console.log('Emergency tables:', r.rows);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
