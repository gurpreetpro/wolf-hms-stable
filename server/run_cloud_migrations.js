// Run this ON the VPS: node /opt/wolf-hms/server/run_cloud_migrations.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'wolfhms',
    password: process.env.DB_PASSWORD || 'W0lfDB_2026!!Secure',
    database: process.env.DB_NAME || 'hospital_db',
});

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const files = [
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

(async () => {
    console.log('Running cloud migrations...');
    let passed = 0, failed = 0;
    for (const f of files) {
        const fp = path.join(MIGRATIONS_DIR, f);
        if (!fs.existsSync(fp)) { console.log(`SKIP: ${f}`); continue; }
        const sql = fs.readFileSync(fp, 'utf8').trim();
        if (!sql) { console.log(`SKIP: ${f} (empty)`); continue; }
        try {
            await pool.query(sql);
            console.log(`OK: ${f}`);
            passed++;
        } catch (e) {
            if (e.message.includes('already exists') || e.message.includes('duplicate')) {
                console.log(`OK (skip): ${f}`);
                passed++;
            } else {
                console.log(`FAIL: ${f} - ${e.message}`);
                failed++;
            }
        }
    }
    console.log(`\nDone: ${passed} ok, ${failed} failed`);
    await pool.end();
})();
