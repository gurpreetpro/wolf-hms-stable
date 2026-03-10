const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hms_db',
    password: process.env.DB_PASSWORD || 'Hospital456!',
    port: process.env.DB_PORT || 5432,
});

async function runForceMigration() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', 'force_uuid.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🚀 Running Force UUID Migration...');
        await pool.query(sql);
        console.log('✅ Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

runForceMigration();
