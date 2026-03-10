const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '095_parking_schema.sql'), 'utf8');
        console.log('Applying Parking Migration...');
        await pool.query(sql);
        console.log('Parking Schema Applied Successfully.');
    } catch (e) {
        console.error('Parking Migration Failed:', e);
    } finally {
        pool.end();
    }
}
apply();
