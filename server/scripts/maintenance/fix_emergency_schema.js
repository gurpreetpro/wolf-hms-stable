const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function checkSchema() {
    try {
        console.log('Checking emergency_logs schema...');

        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'emergency_logs'
        `);
        const columns = res.rows.map(r => r.column_name);
        console.log('Current emergency_logs columns:', columns);

        if (!columns.includes('created_at')) {
            console.log('Adding created_at column...');
            await pool.query('ALTER TABLE emergency_logs ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        }

        console.log('✅ Schema check done.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkSchema();
