const { pool } = require('../db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Running migration 410...');
        const sqlPath = path.join(__dirname, '../migrations/410_medicine_orders.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await pool.query(sql);
        console.log('✅ Migration 410 applied successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        pool.end();
    }
}

runMigration();
