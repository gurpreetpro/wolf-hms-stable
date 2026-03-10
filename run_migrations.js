const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://217.216.78.81:8080/api/debug/sql';
const MIGRATIONS_DIR = path.join(__dirname, 'server', 'migrations');

const migrationFiles = [
    '210_add_is_active_to_wards.sql',
    '211_physio_schema.sql',
    '211_seed_order_sets.sql',
    '212_him_schema.sql',
    '212_ipd_missing_tables.sql',
    '213_fix_lab_orders.sql',
    '213_tier2_3_expansion.sql',
    '214_abha_patient_upgrade.sql',
    '215_abdm_cross_hospital.sql',
    '215_treatment_packages.sql',
    '216_fix_users_sequence.sql',
    '216_govt_scheme_rates.sql',
    '217_force_seed_lab_and_pharmacy.sql',
    '218_force_repair_equipment_schema.sql',
];

async function runMigrations() {
    console.log('🚀 Running Cloud Migrations...\n');
    let passed = 0, failed = 0;

    for (const file of migrationFiles) {
        const filePath = path.join(MIGRATIONS_DIR, file);
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  SKIP: ${file} (not found)`);
            continue;
        }

        const sql = fs.readFileSync(filePath, 'utf8').trim();
        if (!sql) {
            console.log(`⚠️  SKIP: ${file} (empty)`);
            continue;
        }

        // Split by semicolons for multi-statement files, but send as one query
        try {
            await axios.post(API_URL, { query: sql }, { timeout: 30000 });
            console.log(`✅ PASS: ${file}`);
            passed++;
        } catch (e) {
            const msg = e.response?.data?.error || e.message;
            // "already exists" errors are fine — idempotent migrations
            if (msg.includes('already exists') || msg.includes('duplicate')) {
                console.log(`✅ SKIP: ${file} (already applied)`);
                passed++;
            } else {
                console.log(`❌ FAIL: ${file} — ${msg}`);
                failed++;
            }
        }
    }

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${migrationFiles.length}`);
}

runMigrations();
