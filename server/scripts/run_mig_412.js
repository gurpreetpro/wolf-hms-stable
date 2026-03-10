const { pool } = require('../db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Running migration 412...');
        const sqlPath = path.join(__dirname, '../migrations/412_medicine_orders_multitenant.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await pool.query(sql);
        console.log('✅ Migration 412 applied successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        pool.end();
    }
}

runMigration();
