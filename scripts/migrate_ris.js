const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { pool } = require('../server/config/db');
const fs = require('fs');

async function migrate() {
    try {
        console.log('🔌 Connecting to DB...');
        const sql = fs.readFileSync(path.join(__dirname, '../server/migrations/095_radiology_ris_schema.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ RIS Migration Applied Successfully');
    } catch (e) {
        console.error('❌ Migration Failed:', e);
    } finally {
        await pool.end();
    }
}

migrate();
