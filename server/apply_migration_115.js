const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function applyMigration() {
    try {
        const migrationFile = path.join(__dirname, 'migrations', '115_digital_sbar.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');
        
        console.log('Applying Migration 115: Digital SBAR...');
        await pool.query(sql);
        console.log('✅ Migration applied successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

applyMigration();
