const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '047_dietary_schema.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Migration 047 applied successfully');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
