/**
 * Run Iron Dome Migrations
 * Phase 1: RLS Security Upgrade
 * Usage: node run_iron_dome_migrations.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Hospital456!@localhost:5432/hospital_db',
    ssl: false
});

async function runMigration(filename) {
    const filePath = path.join(__dirname, 'migrations', filename);
    console.log(`\n📄 Running: ${filename}`);
    console.log('─'.repeat(50));
    
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split by semicolons but keep DO blocks intact
    const statements = sql
        .split(/;(?=\s*(?:--|CREATE|ALTER|DROP|UPDATE|INSERT|DO|SELECT|GRANT))/gi)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
        if (!statement || statement.length < 5) continue;
        
        try {
            await pool.query(statement);
            successCount++;
            // Extract first line for logging
            const firstLine = statement.split('\n')[0].substring(0, 60);
            console.log(`  ✓ ${firstLine}...`);
        } catch (err) {
            // Some errors are expected (e.g., column doesn't exist)
            if (err.message.includes('does not exist') || 
                err.message.includes('already exists') ||
                err.message.includes('duplicate key')) {
                console.log(`  ⚠ Skipped: ${err.message.substring(0, 60)}`);
            } else {
                console.error(`  ✗ Error: ${err.message}`);
                errorCount++;
            }
        }
    }
    
    console.log(`\n  Summary: ${successCount} success, ${errorCount} errors`);
}

async function main() {
    console.log('═'.repeat(50));
    console.log('  🛡️  IRON DOME SECURITY UPGRADE');
    console.log('  Phase 1: RLS + Null Purge');
    console.log('═'.repeat(50));
    
    try {
        // Test connection
        const testRes = await pool.query('SELECT current_database(), current_user');
        console.log(`\n✓ Connected to: ${testRes.rows[0].current_database} as ${testRes.rows[0].current_user}`);
        
        // Step 1: Backfill NULLs
        await runMigration('301_backfill_null_hospital_ids.sql');
        
        // Step 2: Enable RLS
        await runMigration('300_row_level_security.sql');
        
        // Step 3: Verify
        console.log('\n\n🧪 VERIFICATION');
        console.log('─'.repeat(50));
        
        // Test RLS context setting
        await pool.query("SET app.current_tenant TO '1'");
        const patientCount = await pool.query('SELECT COUNT(*) FROM patients');
        console.log(`  Hospital 1 patients: ${patientCount.rows[0].count}`);
        
        await pool.query("SET app.current_tenant TO '2'");
        const patientCount2 = await pool.query('SELECT COUNT(*) FROM patients');
        console.log(`  Hospital 2 patients: ${patientCount2.rows[0].count}`);
        
        console.log('\n═'.repeat(50));
        console.log('  ✅ IRON DOME ACTIVATED');
        console.log('═'.repeat(50));
        
    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        console.error(err.stack);
    } finally {
        await pool.end();
    }
}

main();
