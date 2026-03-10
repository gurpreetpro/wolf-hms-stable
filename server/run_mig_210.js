const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '210_add_is_active_to_wards.sql'), 'utf8');
        await pool.query(sql);
        console.log('Migration 210 applied successfully.');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
