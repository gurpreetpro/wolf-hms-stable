const TABLE_NAME = 'users';
const pool = require('../config/db');

const inspect = async () => {
    try {
        const res = await pool.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${TABLE_NAME}'`);
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
};

inspect();
