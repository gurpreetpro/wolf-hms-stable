const pool = require('../config/db');

async function inspectPatrols() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'security_patrols'
        `);
        console.log('security_patrols columns:');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

inspectPatrols();
