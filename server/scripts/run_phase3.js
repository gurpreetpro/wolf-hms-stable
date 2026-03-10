const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'phase3_documents.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Applying Phase 3 Schema...');
        await pool.query(sql);
        console.log('✅ Phase 3 Schema Applied Successfully.');
    } catch (err) {
        console.error('❌ Migration Failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
