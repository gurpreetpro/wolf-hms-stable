/**
 * Phase 3: Apply Pending Migrations (084-302)
 * Applies all migrations after 083 in proper order
 * 
 * Run: node apply_phase3_migrations.js
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

// Migrations to apply (084 onwards, in order)
// Excludes .skipped files and data exports
const PENDING_MIGRATIONS = [
    '084_ensure_registration_columns.sql',
    '085_create_nurse_assignments.sql',
    '090_audit_logs.sql',
    '091_force_equipment_schema_fix.sql',
    '092_visitor_management.sql',
    '093_mortuary_schema.sql',
    '094_radiology_multitenant.sql',
    '095_parking_schema.sql',
    '097_reset_admin_password.sql',
    '098_fix_users_role_check.sql',
    '099_add_platform_owner_role.sql',
    '100_fix_finance_schema.sql',
    '101_fix_lab_reagents.sql',
    '101_payment_settings.sql',
    '102_hospital_settings.sql',
    '102_reset_lab_reagents.sql',
    '103_add_hospital_id_nursing.sql',
    '104_patient_service_charges.sql',
    '105_add_uhid.sql',
    '106_add_ipd_number.sql',
    '106_seed_wolfsecurity_hospitals.sql',
    '107_ledger_phase1.sql',
    '108_alert_notes.sql',
    '109_clma_schema.sql',
    '110_care_tasks_audit.sql',
    '111_bed_management.sql',
    '112_ledger_phase2.sql',
    '113_fix_payments_schema.sql',
    '114_accounting_periods.sql',
    '115_digital_sbar.sql',
    '120_admin_recovery_console.sql',
    '200_doctor_reviews.sql',
    '200_fix_opd_payments.sql',
    '201_family_profiles.sql',
    '201_seed_lab_pharmacy.sql',
    '202_chat_system.sql',
    '202_seed_indian_medicines.sql',
    '203_fix_inventory_schema.sql',
    '203_health_articles.sql',
    '204_fix_lab_schema.sql',
    '204_home_lab_expansion.sql',
    '204_optimize_opd_indexes.sql',
    '205_seed_ultrasound_tests.sql',
    '206_add_capacity_to_wards.sql',
    '207_seed_ward_catalog.sql',
    '208_clinical_ward_tables.sql',
    '209_add_billing_cycle.sql',
    '210_add_is_active_to_wards.sql',
    '211_seed_order_sets.sql',
    '212_ipd_missing_tables.sql',
    '213_fix_lab_orders.sql',
    '215_treatment_packages.sql',
    '216_fix_users_sequence.sql',
    '217_force_seed_lab_and_pharmacy.sql',
    '218_force_repair_equipment_schema.sql',
    '220_billing_settings.sql',
    '250_specialist_categories.sql',
    '261_drparveen_config.sql',
    '300_row_level_security.sql',
    '301_backfill_null_hospital_ids.sql',
    '302_feature_flags.sql'
];

async function applyMigration(filename) {
    const filePath = path.join(__dirname, 'migrations', filename);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⏭️  SKIP: ${filename} (not found)`);
        return { status: 'skipped', reason: 'not found' };
    }
    
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
        await pool.query(sql);
        console.log(`✅ ${filename}`);
        return { status: 'success' };
    } catch (error) {
        // Check if it's a "already exists" type error (safe to ignore)
        const msg = error.message.toLowerCase();
        if (msg.includes('already exists') || 
            msg.includes('duplicate') ||
            msg.includes('does not exist') && msg.includes('drop')) {
            console.log(`⚠️  ${filename} (idempotent - already applied)`);
            return { status: 'idempotent' };
        }
        console.log(`❌ ${filename}: ${error.message.substring(0, 80)}`);
        return { status: 'failed', error: error.message };
    }
}

async function main() {
    console.log('═'.repeat(60));
    console.log('🔧 WOLF HMS - Phase 3: Apply Pending Migrations');
    console.log('═'.repeat(60));
    console.log(`Database: ${process.env.DB_NAME || 'hospital_db'}`);
    console.log(`Migrations to apply: ${PENDING_MIGRATIONS.length}`);
    console.log('─'.repeat(60));
    
    const results = { success: 0, idempotent: 0, failed: 0, skipped: 0 };
    const failures = [];
    
    for (const migration of PENDING_MIGRATIONS) {
        const result = await applyMigration(migration);
        results[result.status]++;
        if (result.status === 'failed') {
            failures.push({ migration, error: result.error });
        }
    }
    
    console.log('─'.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('─'.repeat(60));
    console.log(`✅ New Applied:    ${results.success}`);
    console.log(`⚠️  Already Done:   ${results.idempotent}`);
    console.log(`❌ Failed:         ${results.failed}`);
    console.log(`⏭️  Skipped:        ${results.skipped}`);
    
    if (failures.length > 0) {
        console.log('\n❌ FAILURES:');
        failures.forEach(f => {
            console.log(`   ${f.migration}: ${f.error.substring(0, 100)}`);
        });
    }
    
    console.log('═'.repeat(60));
    if (results.failed === 0) {
        console.log('🎉 PHASE 3 COMPLETE - All migrations applied successfully!');
    } else {
        console.log('⚠️  PHASE 3 PARTIAL - Some migrations failed (check above)');
    }
    console.log('═'.repeat(60));
    
    await pool.end();
    return results;
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
