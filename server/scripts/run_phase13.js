const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'phase13_scheduling.sql'), 'utf8');
        console.log('Running Phase 13 (Scheduling) migration...');
        await pool.query(sql);
        console.log('✅ Phase 13 migration completed successfully.');
    } catch (err) {
        console.error('❌ Error running migration:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
