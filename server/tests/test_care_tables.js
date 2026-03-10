const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function check() {
    try {
        console.log('Checking care_plan_templates...');
        const res1 = await pool.query('SELECT count(*) FROM care_plan_templates');
        console.log(`care_plan_templates count: ${res1.rows[0].count}`);

        console.log('Checking order_sets...');
        const res2 = await pool.query('SELECT count(*) FROM order_sets');
        console.log(`order_sets count: ${res2.rows[0].count}`);

        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err.message);
        process.exit(1);
    }
}

check();
