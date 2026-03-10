// Apply lab_orders fix
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '213_fix_lab_orders.sql'), 'utf8');
        console.log('Applying lab_orders migration...');
        await pool.query(sql);
        console.log('✅ Migration applied successfully');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

apply();
