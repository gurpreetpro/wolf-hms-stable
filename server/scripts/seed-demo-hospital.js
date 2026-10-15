#!/usr/bin/env node
/**
 * PRE-DEMO QA — Golden Hospital Seed Runner  (QA Phase 1.8)
 *
 * Executes server/scripts/seed-demo-hospital.sql against the LOCAL database,
 * injects bcrypt hashes for the demo staff logins, verifies row counts and
 * writes plans/seeded_ids.json for the 500-hunter + Playwright E2E helpers.
 *
 * Usage: npm run demo:seed      (from server/)
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const SQL_FILE = path.join(__dirname, 'seed-demo-hospital.sql');
const OUT_FILE = path.join(__dirname, '..', '..', 'plans', 'seeded_ids.json');
const DEMO_PASSWORD = process.env.DEMO_STAFF_PASSWORD || 'password123';

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    max: 4,
});

const PATIENT_UUIDS = [
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
];
const ADMISSION_IPD = 'IPD-DEMO-2026-0001';

async function main() {
    const started = Date.now();
    console.log('🏥  WOLF HMS — Golden Hospital Seed (hospital_id = 1)');
    console.log('='.repeat(66));

    if (!fs.existsSync(SQL_FILE)) throw new Error(`Seed SQL not found: ${SQL_FILE}`);
    let sql = fs.readFileSync(SQL_FILE, 'utf8');

    // Inject bcrypt hashes (database has no pgcrypto, so hashing happens here)
    const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
    sql = sql.split(':DOCTOR_PASSWORD_HASH').join(hash).split(':NURSE_PASSWORD_HASH').join(hash);

    console.log(`▶ Executing ${path.relative(process.cwd(), SQL_FILE)} ...`);
    await pool.query(sql);
    console.log('✔ Seed SQL committed');

    // ---- verification ----
    const checks = [
        ['patients (demo cohorts)', `SELECT count(*)::int c FROM patients WHERE id::text IN ('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000003')`, 15],
        ['OPD waiting visits', `SELECT count(*)::int c FROM opd_visits WHERE patient_id::text LIKE 'a0000000%' AND status = 'Waiting' AND visit_date = CURRENT_DATE`, 4],
        ['active Rx (Cohort B)', `SELECT count(*)::int c FROM prescriptions WHERE patient_id = 'b0000000-0000-4000-8000-000000000001' AND is_active`, 1],
        ['lab orders pending', `SELECT count(*)::int c FROM lab_orders WHERE status = 'Pending' AND patient_id::text LIKE 'c0000000%'`, 2],
        ['lab orders completed', `SELECT count(*)::int c FROM lab_orders WHERE status = 'Completed' AND patient_id::text LIKE 'c0000000%'`, 1],
        ['radiology pending', `SELECT count(*)::int c FROM radiology_orders WHERE modality = 'CR' AND accession_number = 'RAD-DEMO-2026-0001'`, 1],
        ['ICU admissions', `SELECT count(*)::int c FROM admissions WHERE ipd_number LIKE 'IPD-DEMO-%' AND status = 'Admitted'`, 3],
        ['ICU vitals rows (24h telemetry)', `SELECT count(*)::int c FROM vitals v JOIN admissions a ON a.id = v.admission_id WHERE a.ipd_number = 'IPD-DEMO-2026-0001' AND v.recorded_at > now() - INTERVAL '24 hours'`, 20, 'gte'],
        ['unbilled pharmacy orders', `SELECT count(*)::int c FROM pharmacy_orders WHERE order_number LIKE 'PHR-DEMO-%' AND payment_status = 'Unpaid'`, 3],
        ['resolved CODE_BLUE', `SELECT count(*)::int c FROM emergency_events WHERE event_code = 'CODE_BLUE-DEMO-0001' AND status = 'Resolved'`, 1],
        ['paid invoice', `SELECT count(*)::int c FROM invoices WHERE invoice_number = 'INV-DEMO-2026-0001' AND status = 'Paid'`, 1],
        ['pending invoice', `SELECT count(*)::int c FROM invoices WHERE invoice_number = 'INV-DEMO-2026-0002' AND status = 'Pending'`, 1],
        ['invoice items (pending)', `SELECT count(*)::int c FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id WHERE i.invoice_number = 'INV-DEMO-2026-0002'`, 6],
        ['pharmacy stock batches', `SELECT count(*)::int c FROM inventory_items WHERE hospital_id = 1 AND stock_quantity > 0 AND batch_number LIKE '___24%'`, 12],
        ['ICU beds wired to admissions', `SELECT count(*)::int c FROM beds WHERE bed_number IN ('ICU-01','ICU-02','ICU-03') AND status = 'Occupied' AND current_admission_id IS NOT NULL`, 3],
    ];

    console.log('\nRow-count verification:');
    let failures = 0;
    for (const [label, q, expected, mode] of checks) {
        const r = await pool.query(q);
        const got = r.rows[0].c;
        const ok = mode === 'gte' ? got >= expected : got === expected;
        if (!ok) failures++;
        const expectation = mode === 'gte' ? `>= ${expected}` : String(expected);
        console.log(`  ${ok ? '✔' : '✘'} ${label.padEnd(30)} ${got}${ok ? '' : ` (expected ${expectation})`}`);
    }
    if (failures > 0) throw new Error(`${failures} row-count check(s) failed`);

    // ---- resolve ids for downstream automation ----
    const ids = await pool.query(`
        SELECT
          (SELECT id::text FROM patients WHERE id::text = 'a0000000-0000-4000-8000-000000000001')       AS demo_patient_id,
          (SELECT id::text FROM patients WHERE id::text = 'b0000000-0000-4000-8000-000000000001')       AS ai_safety_patient_id,
          (SELECT id::text FROM patients WHERE id::text = 'd0000000-0000-4000-8000-000000000001')       AS icu_patient_id,
          (SELECT id::text FROM patients WHERE id::text = 'e0000000-0000-4000-8000-000000000002')       AS billing_patient_id,
          (SELECT id FROM admissions WHERE ipd_number = $1 AND hospital_id = 1)                          AS icu_admission_id,
          (SELECT id FROM invoices WHERE invoice_number = 'INV-DEMO-2026-0002' LIMIT 1)                  AS pending_invoice_id,
          (SELECT id FROM invoices WHERE invoice_number = 'INV-DEMO-2026-0001' LIMIT 1)                  AS paid_invoice_id,
          (SELECT id FROM lab_orders WHERE patient_id::text = 'c0000000-0000-4000-8000-000000000001'
             AND test_name = 'Complete Blood Count (CBC)' LIMIT 1)                                       AS lab_order_id,
          (SELECT id FROM radiology_orders WHERE accession_number = 'RAD-DEMO-2026-0001' LIMIT 1)        AS radiology_order_id,
          (SELECT id FROM users WHERE username = 'doctor_demo')                                          AS doctor_id,
          (SELECT id FROM users WHERE username = 'nurse_demo')                                           AS nurse_id,
          (SELECT id FROM wards  WHERE name = 'ICU' AND hospital_id = 1)                                 AS icu_ward_id
    `, [ADMISSION_IPD]);

    const row = ids.rows[0];
    const payload = {
        generatedAt: new Date().toISOString(),
        hospitalId: 1,
        database: process.env.DB_NAME || 'hospital_db',
        demoLogins: {
            admin: { username: 'admin', password: DEMO_PASSWORD, role: 'admin' },
            doctor: { username: 'doctor_demo', password: DEMO_PASSWORD, role: 'doctor' },
            nurse: { username: 'nurse_demo', password: DEMO_PASSWORD, role: 'nurse' },
        },
        patients: {
            opdTriage: PATIENT_UUIDS[0],
            aiSafety: PATIENT_UUIDS[1],
            icu: row.icu_patient_id,
            billing: row.billing_patient_id,
        },
        patientId: row.demo_patient_id,
        admissionId: row.icu_admission_id,
        invoiceId: row.pending_invoice_id,
        paidInvoiceId: row.paid_invoice_id,
        labOrderId: row.lab_order_id,
        radiologyOrderId: row.radiology_order_id,
        doctorId: row.doctor_id,
        nurseId: row.nurse_id,
        icuWardId: row.icu_ward_id,
    };

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf8');

    console.log('\nSeeded identifiers:');
    console.log(`  patientId (OPD)      : ${payload.patients.opdTriage}`);
    console.log(`  patientId (AI safety): ${payload.patients.aiSafety}`);
    console.log(`  patientId (ICU)      : ${payload.patients.icu}`);
    console.log(`  admissionId (ICU)    : ${payload.admissionId}`);
    console.log(`  invoiceId (pending)  : ${payload.invoiceId}`);
    console.log(`  labOrderId           : ${payload.labOrderId}`);
    console.log(`  hospitalId           : ${payload.hospitalId}`);
    console.log(`\n📄 Written: ${path.relative(process.cwd(), OUT_FILE)}`);
    console.log(`✅ Golden hospital seeded in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
}

main()
    .then(async () => { await pool.end(); process.exit(0); })
    .catch(async (e) => {
        console.error('\n❌ SEED FAILED:', e.message);
        if (e.position) console.error('   SQL position:', e.position);
        if (e.hint) console.error('   hint:', e.hint);
        try { await pool.end(); } catch (_) {}
        process.exit(1);
    });
