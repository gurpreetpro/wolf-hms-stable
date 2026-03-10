require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'wolf_hms_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '108_alert_notes.sql'), 'utf8');
        console.log('Applying migration...');
        await pool.query(sql);
        console.log('Migration applied successfully.');
    } catch (err) {
        if (err.code === '42701') {
             console.log('Column already exists, skipping.');
        } else {
             console.error('Migration failed:', err);
             process.exit(1);
        }
    } finally {
        await pool.end();
    }
}

runMigration();
