const pool = require('../config/db');

async function inspect() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'patients' AND column_name = 'id'
        `);
        console.log('Users ID Type:', res.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

inspect();
