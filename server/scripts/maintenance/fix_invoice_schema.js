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
        console.log('Checking invoice_items schema...');

        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'invoice_items'
        `);
        const columns = res.rows.map(r => r.column_name);
        console.log('Current invoice_items columns:', columns);

        if (!columns.includes('amount')) {
            console.log('Adding amount column...');
            await pool.query('ALTER TABLE invoice_items ADD COLUMN amount NUMERIC(10,2)');
        }

        console.log('✅ Schema fixed.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

fixSchema();
