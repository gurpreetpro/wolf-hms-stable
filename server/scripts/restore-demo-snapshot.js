#!/usr/bin/env node
/**
 * PRE-DEMO QA — Golden Snapshot Restore (QA Phase 1.10)
 *
 * Runs: pg_restore --clean --if-exists --no-owner -d <db> backups/demo_golden.dump
 * then verifies all 15 demo patients exist in under 10 seconds.
 *
 * Usage: npm run demo:restore      (from server/)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const DB = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: String(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
};

const { resolvePostgresBin } = require('./lib/pgBin');

const DEMO_PATIENTS = [
    'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004',
    'b0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000004',
    'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002',
    'd0000000-0000-4000-8000-000000000003',
    'e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002',
    'e0000000-0000-4000-8000-000000000003',
];

async function main() {
    const started = Date.now();
    const snapshot = process.env.SNAPSHOT_PATH || path.join(__dirname, '..', '..', 'backups', 'demo_golden.dump');
    if (!fs.existsSync(snapshot)) throw new Error(`Snapshot not found: ${snapshot} — run "npm run demo:backup" first`);

    const pgRestore = resolvePostgresBin(process.platform === 'win32' ? 'pg_restore.exe' : 'pg_restore');
    console.log('♻  Restoring golden snapshot');
    console.log('='.repeat(66));
    console.log(`  pg_restore: ${pgRestore}`);
    console.log(`  snapshot  : ${snapshot} (${(fs.statSync(snapshot).size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`  database  : ${DB.name} @ ${DB.host}:${DB.port}`);

    execFileSync(pgRestore, [
        '--clean', '--if-exists', '--no-owner', '--no-privileges',
        '--single-transaction',      // atomic: any failure rolls back, DB never left half-restored
        '-h', DB.host, '-p', DB.port, '-U', DB.user,
        '-d', DB.name,
        snapshot,
    ], {
        env: { ...process.env, PGPASSWORD: DB.password },
        stdio: ['ignore', 'inherit', 'inherit'],
    });

    const pool = new Pool({
        user: DB.user,
        host: DB.host,
        port: parseInt(DB.port, 10),
        database: DB.name,        // NOTE: pg option is `database`, not `name`
        password: DB.password,
        max: 2,
    });
    try {
        const r = await pool.query('SELECT count(*)::int c FROM patients WHERE id::text = ANY($1)', [DEMO_PATIENTS]);
        const elapsed = (Date.now() - started) / 1000;
        const ok = r.rows[0].c === DEMO_PATIENTS.length && elapsed < 10;
        console.log(`\n${ok ? '✅' : '❌'} Restored demo patients: ${r.rows[0].c}/${DEMO_PATIENTS.length} in ${elapsed.toFixed(2)}s (budget 10s)`);
        if (!ok) process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main().catch((e) => {
    console.error('\n❌ RESTORE FAILED:', e.message);
    if (process.env.QA_DEBUG) console.error(e.stack);
    process.exit(1);
});
