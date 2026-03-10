/**
 * Cloud SQL Migration Runner
 * 
 * This script applies all pending migrations to the Cloud SQL database.
 * It connects via the Cloud SQL public IP (requires IP whitelisting in GCP console).
 * 
 * Usage: node scripts/run_cloud_migrations.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Cloud SQL connection config (public IP)
const cloudPool = new Pool({
    host: '34.100.220.203', // Cloud SQL public IP
    port: 5432,
    database: 'hospital_db',
    user: 'postgres',
    password: 'Hospital456!',
    ssl: {
        rejectUnauthorized: false
    }
});

// Migrations to apply (in order)
const migrations = [
    '040_100_percent_fix.sql',
    '041_last_mile_fixes.sql',
    '042_nurse_tables.sql',
    '043_final_polish.sql',
    '044_gold_standard_columns.sql',
    '045_user_profile_upgrade.sql',
    '046_housekeeping_schema.sql',
    '047_dietary_schema.sql',
    '048_ipd_enhancements.sql',
    '049_create_clinical_vitals.sql'
];

async function runMigrations() {
    console.log('🚀 Starting Cloud SQL Migration Runner...\n');

    try {
        // Test connection
        const testRes = await cloudPool.query('SELECT NOW()');
        console.log('✅ Connected to Cloud SQL at:', testRes.rows[0].now);

        for (const file of migrations) {
            const filePath = path.join(__dirname, '..', 'migrations', file);
            
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️ Skipping ${file} (not found)`);
                continue;
            }

            const sql = fs.readFileSync(filePath, 'utf8');
            console.log(`📄 Applying ${file}...`);

            try {
                await cloudPool.query(sql);
                console.log(`   ✅ ${file} applied successfully.`);
            } catch (err) {
                // Check if it's a "already exists" type error (idempotent migrations)
                if (err.message.includes('already exists') || err.message.includes('duplicate')) {
                    console.log(`   ⚠️ ${file} skipped (already applied).`);
                } else {
                    console.error(`   ❌ ${file} FAILED:`, err.message);
                    // Continue with next migration instead of stopping
                }
            }
        }

        console.log('\n🎉 Migration run complete!');
    } catch (err) {
        console.error('❌ Connection to Cloud SQL failed:', err.message);
        console.log('\n📋 Troubleshooting:');
        console.log('1. Ensure your IP is whitelisted in Cloud SQL > Connections > Add Network.');
        console.log('2. Verify the Cloud SQL public IP is correct (check GCP Console).');
        console.log('3. Or use Cloud SQL Proxy: gcloud sql connect wolf-hms-db --user=postgres');
    } finally {
        await cloudPool.end();
    }
}

runMigrations();
