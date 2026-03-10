const fs = require('fs');
const path = require('path');

// Manually load .env
const envPath = path.join(__dirname, 'server', '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.join('=').trim();
        }
    });
} else {
    console.error('❌ .env file not found');
    process.exit(1);
}

const { pool } = require('./server/db');

async function runMigration() {
    try {
        console.log('Running Migration 104...');
        const sqlPath = path.join(__dirname, 'server/migrations/104_patient_service_charges.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);
        console.log('✅ Migration 104 applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
