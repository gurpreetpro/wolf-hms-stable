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
        console.log('Checking bed_history schema...');

        // Check columns
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'bed_history'
        `);
        const columns = res.rows.map(r => r.column_name);
        console.log('Current columns:', columns);

        if (!columns.includes('ward')) {
            console.log('Adding ward column...');
            await pool.query('ALTER TABLE bed_history ADD COLUMN ward VARCHAR(50)');
        }

        if (!columns.includes('bed_number')) {
            console.log('Adding bed_number column...');
            await pool.query('ALTER TABLE bed_history ADD COLUMN bed_number VARCHAR(20)');
        }

        if (!columns.includes('end_time')) {
            console.log('Adding end_time column...');
            await pool.query('ALTER TABLE bed_history ADD COLUMN end_time TIMESTAMP');
        }

        console.log('✅ Schema fixed.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

fixSchema();
