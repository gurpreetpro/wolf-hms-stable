/**
 * Cloud Migration Runner
 * Runs a specific SQL migration against the cloud database
 * 
 * Usage: node run-migration.js 410_medicine_orders.sql
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Cloud Database Config
const pool = new Pool({
    host: '34.47.187.11',
    port: 5432,
    database: 'wolfhms',
    user: 'wolfadmin',
    password: 'wolfhms2024',
    ssl: false
});

async function runMigration(filename) {
    console.log(`\n🚀 Running migration: ${filename}\n`);
    
    const migrationPath = path.join(__dirname, 'migrations', filename);
    
    if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        process.exit(1);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Split and run each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('RAISE'));
        
        console.log(`📋 Found ${statements.length} statements to execute\n`);
        
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i] + ';';
            const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
            
            try {
                await client.query(stmt);
                console.log(`  ✅ [${i + 1}/${statements.length}] ${preview}...`);
            } catch (err) {
                if (err.message.includes('already exists') || err.message.includes('duplicate')) {
                    console.log(`  ⏭️ [${i + 1}/${statements.length}] Skipped (already exists): ${preview}...`);
                } else {
                    throw err;
                }
            }
        }
        
        await client.query('COMMIT');
        console.log(`\n✅ Migration ${filename} completed successfully!\n`);
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`\n❌ Migration failed:`, err.message);
        console.error('\nRolled back all changes.\n');
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Get filename from command line or default
const filename = process.argv[2] || '410_medicine_orders.sql';
runMigration(filename);
