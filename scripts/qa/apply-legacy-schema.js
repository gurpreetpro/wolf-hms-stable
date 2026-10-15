#!/usr/bin/env node
/**
 * PRE-DEMO QA — Local schema healer (support utility for Phase 2.6)
 *
 * The local dev database was seeded from a reduced dump, so many subsystem
 * tables that the application SQL expects are absent. This applies the repo's
 * own schema definition files (migrations_legacy, db/migrations, phase_*.sql)
 * which were never applied locally.
 *
 * Every file runs in its own transaction; failures are logged and skipped so a
 * single bad file cannot abort the heal. Nothing destructive is executed by
 * design (files are CREATE/ALTER/INSERT only).
 *
 * Usage: node scripts/qa/apply-legacy-schema.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'server', '.env'), quiet: true });

const SERVER = path.join(__dirname, '..', '..', 'server');
const LOG = path.join(__dirname, '..', '..', 'plans', 'schema_heal.log');

function collect() {
    const groups = [
        path.join(SERVER, 'db', 'migrations'),
        path.join(SERVER, 'migrations_legacy'),
        path.join(SERVER, 'scripts'),
    ];
    const files = [];
    for (const g of groups) {
        if (!fs.existsSync(g)) continue;
        for (const f of fs.readdirSync(g)) {
            if (!f.endsWith('.sql')) continue;
            if (g.endsWith('scripts') && !/^phase_/.test(f)) continue; // only phase_*.sql from scripts/
            files.push(path.join(g, f));
        }
    }
    for (const extra of ['phase_telemedicine.sql', 'fix_missing_beds_tables.sql']) {
        const p = path.join(SERVER, extra);
        if (fs.existsSync(p)) files.push(p);
    }
    return files;
}

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

(async () => {
    const files = collect();
    const log = [`# Local schema heal — ${new Date().toISOString()}`, `Files attempted: ${files.length}`, ''];
    let ok = 0, failed = 0;

    console.log(`Applying ${files.length} schema files to ${process.env.DB_NAME} ...\n`);
    for (const f of files) {
        const rel = path.relative(SERVER, f);
        const sql = fs.readFileSync(f, 'utf8');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('COMMIT');
            ok++;
            log.push(`OK    ${rel}`);
            console.log(`  ✔ ${rel}`);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            failed++;
            log.push(`FAIL  ${rel} :: ${e.message}`);
            console.log(`  ✘ ${rel}  (${e.message.split('\n')[0]})`);
        } finally {
            client.release();
        }
    }

    log.push('', `OK: ${ok}  FAILED: ${failed}`);
    fs.writeFileSync(LOG, log.join('\n'), 'utf8');
    console.log(`\nApplied OK: ${ok}  Failed: ${failed}`);
    console.log(`📄 ${path.relative(path.join(__dirname, '..', '..'), LOG)}`);
    await pool.end();
})().catch(async (e) => { console.error('HEAL FAILED:', e.message); try { await pool.end(); } catch (_) {} process.exit(1); });
