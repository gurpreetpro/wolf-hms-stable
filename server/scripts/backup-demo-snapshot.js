#!/usr/bin/env node
/**
 * PRE-DEMO QA — Golden Snapshot Backup (QA Phase 1.9)
 *
 * Creates a PostgreSQL CUSTOM-FORMAT archive (pg_dump -Fc) of the demo database
 * so it can be restored with binary pg_restore.
 *
 * Usage: npm run demo:backup      (from server/)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
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

function main() {
    const started = Date.now();
    const outDir = path.join(__dirname, '..', '..', 'backups');
    fs.mkdirSync(outDir, { recursive: true });
    const target = process.env.SNAPSHOT_PATH || path.join(outDir, 'demo_golden.dump');

    const pgDump = resolvePostgresBin(process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump');
    console.log('🗄  Golden snapshot (custom format)');
    console.log('='.repeat(66));
    console.log(`  pg_dump : ${pgDump}`);
    console.log(`  database: ${DB.name} @ ${DB.host}:${DB.port}`);
    console.log(`  target  : ${target}`);

    execFileSync(pgDump, [
        '-Fc',                       // custom archive format (pg_restore compatible)
        '--no-owner',
        '--no-privileges',
        '-h', DB.host,
        '-p', DB.port,
        '-U', DB.user,
        '-f', target,
        DB.name,
    ], {
        env: { ...process.env, PGPASSWORD: DB.password },
        stdio: ['ignore', 'inherit', 'inherit'],
    });

    const size = fs.statSync(target).size;
    if (size < 1024) throw new Error(`Snapshot suspiciously small (${size} bytes)`);
    console.log(`\n✅ Snapshot written: ${(size / 1024 / 1024).toFixed(2)} MB in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

try {
    main();
} catch (e) {
    console.error('\n❌ BACKUP FAILED:', e.message);
    process.exit(1);
}
