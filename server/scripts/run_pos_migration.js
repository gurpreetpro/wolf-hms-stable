/**
 * Run POS Integration Schema Migration
 * WOLF HMS
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    console.log('Running POS Integration Schema Migration...');

    try {
        const sqlFile = path.join(__dirname, 'pos_integration.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Execute entire SQL file as one transaction
        await pool.query(sql);
        console.log('✓ SQL file executed successfully');

        // Verify tables created
        const tables = await pool.query(`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' AND tablename LIKE 'pos_%'
        `);

        console.log('\n=== POS Tables Created ===');
        tables.rows.forEach(t => console.log('  ✓', t.tablename));

        // Check providers seeded
        const providers = await pool.query('SELECT code, name FROM pos_providers');
        console.log('\n=== POS Providers Seeded ===');
        providers.rows.forEach(p => console.log('  ✓', p.code, '-', p.name));

        // Check devices
        const devices = await pool.query('SELECT device_id, device_name FROM pos_devices');
        console.log('\n=== Demo Devices ===');
        devices.rows.forEach(d => console.log('  ✓', d.device_id, '-', d.device_name));

        console.log('\n✅ POS Integration Schema Migration Complete!');

    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await pool.end();
    }
}

runMigration();
