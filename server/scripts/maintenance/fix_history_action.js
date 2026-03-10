const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function fixSchema() {
    try {
        console.log('Checking bed_history action column...');

        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'bed_history'
        `);
        const columns = res.rows.map(r => r.column_name);
        console.log('Current bed_history columns:', columns);

        if (!columns.includes('action')) {
            console.log('Adding action column...');
            await pool.query('ALTER TABLE bed_history ADD COLUMN action VARCHAR(50)');
        }

        console.log('✅ Schema fixed.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

fixSchema();
