const { pool } = require('../db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '../migrations/051_ai_billing_tables.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ AI Tables Created');
    } catch (err) {
        console.error('❌ Migration Failed:', err);
    } finally {
        pool.end();
    }
}

run();
