const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '../migrations/050_create_procedures_table.sql'), 'utf8');
        console.log(' Applying Migration: 050_create_procedures_table.sql');
        await pool.query(sql);
        console.log('✅ Migration Applied Successfully.');
    } catch (e) {
        console.error('❌ Migration Failed:', e);
    } finally {
        pool.end();
    }
};

runMigration();
