// Run migration 044_gold_standard_columns.sql
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432
});

async function runMigration() {
    console.log('🚀 Running Migration 044: Gold Standard Columns...');
    
    try {
        // Read migration file
        const migrationPath = path.join(__dirname, 'migrations', '044_gold_standard_columns.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute migration
        await pool.query(sql);
        console.log('✅ Migration 044 completed successfully!');
        
        // Verify columns exist
        console.log('\n📋 Verifying columns...');
        
        const checks = [
            { table: 'opd_visits', column: 'consultation_type' },
            { table: 'patients', column: 'visit_count' },
            { table: 'patients', column: 'last_visit_date' },
            { table: 'patients', column: 'is_registered' },
            { table: 'users', column: 'consultation_fee' }
        ];
        
        for (const check of checks) {
            const result = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = $2
            `, [check.table, check.column]);
            
            const status = result.rows.length > 0 ? '✅' : '❌';
            console.log(`${status} ${check.table}.${check.column}`);
        }
        
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

runMigration();
