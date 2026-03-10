const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    // Use Cloud SQL proxy or direct connection
    const pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        database: process.env.DB_NAME || 'hospital_db',
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432
    });

    try {
        console.log('🔧 Running migration 075_fix_opd_status_constraint.sql...');
        
        const migrationSQL = fs.readFileSync(
            path.join(__dirname, 'migrations', '075_fix_opd_status_constraint.sql'), 
            'utf8'
        );
        
        await pool.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        console.log('opd_visits status constraint now includes: Waiting, In-Consult, Completed, Cancelled, Rescheduled, No-Show');
        
        // Verify the change
        const result = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'opd_visits'::regclass AND contype = 'c'
        `);
        
        console.log('Current constraints:', result.rows);
        
    } catch (error) {
        console.error('❌ Migration error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

runMigration();
