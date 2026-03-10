const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function applyMigration() {
    const client = await pool.connect();
    try {
        console.log('Applying Migration 114: Accounting Periods...');
        const migrationSql = fs.readFileSync(path.join(__dirname, 'migrations', '114_accounting_periods.sql'), 'utf8');
        await client.query(migrationSql);
        console.log('Migration applied successfully.');
    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

applyMigration();
