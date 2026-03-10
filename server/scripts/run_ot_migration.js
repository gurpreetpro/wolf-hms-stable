const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function runMigration() {
    try {
        console.log('🏥 Starting OT Management Schema Migration...');

        const sqlPath = path.join(__dirname, 'phase_ot_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running Full SQL Script...');
        await pool.query(sql);

        console.log('✅ OT Tables Created Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error.message);
        fs.writeFileSync('migration_error.log', JSON.stringify(error, null, 2));
        process.exit(1);
    }
}

runMigration();
