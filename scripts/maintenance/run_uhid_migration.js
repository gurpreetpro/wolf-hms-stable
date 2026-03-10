const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Manually parse .env
try {
    const envFile = fs.readFileSync(path.join(__dirname, 'server', '.env'), 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.log('No .env file found or error reading it, assuming env vars are set.');
}

// Fallback defaults or error if missing
if (!process.env.DB_PASSWORD) console.warn("Warning: DB_PASSWORD not set");

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'wolf_hms',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'server/migrations/105_add_uhid.sql'), 'utf8');
        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration successful!');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}

run();
