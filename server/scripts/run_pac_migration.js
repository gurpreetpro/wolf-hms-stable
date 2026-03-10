const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function runMigration() {
    try {
        console.log('🩺 Starting PAC Management Schema Migration...');

        const sqlPath = path.join(__dirname, 'phase_pac_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running SQL...');
        await pool.query(sql);

        console.log('✅ PAC Tables Created Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error.message);
        process.exit(1);
    }
}

runMigration();
