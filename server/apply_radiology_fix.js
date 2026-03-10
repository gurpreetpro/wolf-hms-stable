const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '094_radiology_multitenant.sql'), 'utf8');
        console.log('Applying migration...');
        await pool.query(sql);
        console.log('Migration applied successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        pool.end();
    }
}
apply();
