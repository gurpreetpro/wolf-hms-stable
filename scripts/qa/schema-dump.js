/**
 * Local schema inspector (QA Phase 0.4 evidence).
 * Dumps columns for the demo-relevant tables so seed SQL / migration 306
 * can be written against ACTUAL local schema (contract-first rule).
 *
 * Usage: node scripts/qa/schema-dump.js [outFile]
 */
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'server', '.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

const TABLES = (process.env.QA_TABLES || [
    // core
    'hospitals', 'users', 'patients', 'admissions', 'beds', 'wards', 'rooms',
    // clinical
    'vitals', 'opd_visits', 'prescriptions', 'prescription_items', 'patient_medications',
    'drug_interactions', 'drugs', 'clinical_notes', 'soap_notes', 'care_tasks',
    // diagnostics
    'lab_orders', 'lab_order_items', 'lab_tests', 'lab_parameters', 'lab_results',
    'radiology_orders', 'radiology_reports',
    // pharmacy / billing
    'pharmacy_inventory', 'pharmacy_batches', 'invoices', 'invoice_items', 'payments',
    'pending_charges', 'stock_batches', 'inventory_items',
    // emergency
    'emergency_events', 'emergency_logs',
    // OT / anaesthesia bucket B
    'anaesthesia', 'anaesthesia_records', 'preauth', 'insurance_preauth', 'pac', 'pacu_beds', 'pacu_records',
].join(',').split(',').map(s => s.trim()).filter(Boolean));

(async () => {
    const out = [];
    out.push('# Local Schema Dump (hospital_db)');
    out.push(`Generated: ${new Date().toISOString()}`);
    out.push('');

    const all = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
    out.push(`## All public tables (${all.rows.length})`);
    out.push(all.rows.map(r => r.table_name).join(', '));
    out.push('');

    for (const t of TABLES) {
        const exists = all.rows.some(r => r.table_name === t);
        if (!exists) {
            out.push(`## ${t}  ==> MISSING TABLE`);
            out.push('');
            continue;
        }
        const cols = await pool.query(
            `SELECT column_name, data_type, is_nullable, column_default
             FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t]);
        out.push(`## ${t} (${cols.rows.length} columns)`);
        for (const c of cols.rows) {
            out.push(`  ${c.column_name} | ${c.data_type} | null=${c.is_nullable} | default=${c.column_default || '-'}`);
        }
        out.push('');
    }

    const target = process.argv[2] || path.join(__dirname, '..', '..', 'plans', 'local_schema_dump.txt');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, out.join('\n'), 'utf8');
    console.log(`Schema dump written: ${target} (${out.length} lines)`);
    await pool.end();
})().catch(async (e) => { console.error('SCHEMA DUMP FAILED:', e.message); try { await pool.end(); } catch (_) {} process.exit(1); });
