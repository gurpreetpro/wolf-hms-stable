const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432,
});

async function run() {
    try {
        const res = await pool.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'nurse_assignments'"
        );
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
