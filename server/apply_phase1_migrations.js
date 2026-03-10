/**
 * Phase 1: Apply Database Schema Fix Migrations
 * Applies migrations 320-323 to fix critical schema issues
 * 
 * Run: node apply_phase1_migrations.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'Hospital456!',
    port: process.env.DB_PORT || 5432,
});

const MIGRATIONS = [
    '320_fix_pharmacy_is_controlled.sql',
    '321_fix_wards_occupied_beds.sql',
    '322_fix_hospital_id_fk.sql',
    '323_fix_users_role_extended.sql'
];

async function applyMigration(filename) {
    const filePath = path.join(__dirname, 'migrations', filename);
    
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Migration file not found: ${filename}`);
        return false;
    }
    
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`\n📄 Applying: ${filename}`);
    console.log('─'.repeat(50));
    
    try {
        await pool.query(sql);
        console.log(`✅ SUCCESS: ${filename}`);
        return true;
    } catch (error) {
        console.error(`❌ FAILED: ${filename}`);
        console.error(`   Error: ${error.message}`);
        // Continue with other migrations even if one fails
        return false;
    }
}

async function verifySchema() {
    console.log('\n🔍 Verifying Schema Changes...');
    console.log('─'.repeat(50));
    
    const checks = [
        {
            name: 'inventory_items.is_controlled',
            query: `SELECT column_name, data_type FROM information_schema.columns 
                    WHERE table_name = 'inventory_items' AND column_name = 'is_controlled'`
        },
        {
            name: 'wards.occupied_beds',
            query: `SELECT column_name, data_type FROM information_schema.columns 
                    WHERE table_name = 'wards' AND column_name = 'occupied_beds'`
        },
        {
            name: 'user_sessions.hospital_id type',
            query: `SELECT column_name, data_type FROM information_schema.columns 
                    WHERE table_name = 'user_sessions' AND column_name = 'hospital_id'`
        },
        {
            name: 'users_role_check constraint',
            query: `SELECT constraint_name FROM information_schema.check_constraints 
                    WHERE constraint_name = 'users_role_check'`
        }
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
        try {
            const result = await pool.query(check.query);
            if (result.rows.length > 0) {
                console.log(`✅ ${check.name}: EXISTS`);
                if (result.rows[0].data_type) {
                    console.log(`   Type: ${result.rows[0].data_type}`);
                }
            } else {
                console.log(`⚠️  ${check.name}: NOT FOUND`);
                allPassed = false;
            }
        } catch (error) {
            console.log(`❌ ${check.name}: ERROR - ${error.message}`);
            allPassed = false;
        }
    }
    
    return allPassed;
}

async function main() {
    console.log('═'.repeat(50));
    console.log('🔧 WOLF HMS - Phase 1: Database Schema Fixes');
    console.log('═'.repeat(50));
    console.log(`Database: ${process.env.DB_NAME || 'hospital_db'}`);
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const migration of MIGRATIONS) {
        const success = await applyMigration(migration);
        if (success) successCount++;
        else failCount++;
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('═'.repeat(50));
    console.log(`✅ Succeeded: ${successCount}/${MIGRATIONS.length}`);
    console.log(`❌ Failed: ${failCount}/${MIGRATIONS.length}`);
    
    // Verify the changes
    const verified = await verifySchema();
    
    console.log('\n' + '═'.repeat(50));
    if (verified && failCount === 0) {
        console.log('🎉 PHASE 1 COMPLETE - All schema fixes applied successfully!');
    } else if (verified) {
        console.log('⚠️  PHASE 1 PARTIAL - Some migrations failed but schema looks correct');
    } else {
        console.log('❌ PHASE 1 INCOMPLETE - Manual review required');
    }
    console.log('═'.repeat(50));
    
    await pool.end();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
