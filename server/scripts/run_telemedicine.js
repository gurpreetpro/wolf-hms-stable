/**
 * Run Telemedicine Schema Migration
 * Adds consultation_type column to opd_visits table
 */

const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Running telemedicine schema migration...');

        const sql = fs.readFileSync(
            path.join(__dirname, 'phase_telemedicine.sql'),
            'utf8'
        );

        await pool.query(sql);

        console.log('✅ Migration complete: consultation_type column added to opd_visits');

        // Verify the column exists
        const verifyRes = await pool.query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'opd_visits' 
            AND column_name = 'consultation_type'
        `);

        if (verifyRes.rows.length > 0) {
            console.log('Column verified:', verifyRes.rows[0]);
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
