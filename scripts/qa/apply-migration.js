#!/usr/bin/env node
/**
 * PRE-DEMO QA — Local migration applier (Phase 2.2)
 *
 * Applies ONE .sql migration file to the LOCAL database inside a transaction and
 * records it in `_migrations` (id, name, applied_at). Re-running is safe.
 *
 * Usage: node scripts/qa/apply-migration.js server/migrations/306_bucket_b_schema_fixes.sql
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'server', '.env'), quiet: true });

const file = process.argv[2];
if (!file) {
    console.error('Usage: node scripts/qa/apply-migration.js <path-to-sql>');
    process.exit(2);
}
const abs = path.resolve(process.cwd(), file);
if (!fs.existsSync(abs)) {
    console.error(`Migration file not found: ${abs}`);
    process.exit(2);
}
const name = path.basename(abs);
const sql = fs.readFileSync(abs, 'utf8');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

(async () => {
    const started = Date.now();
    console.log(`▶ Applying ${name} to ${process.env.DB_NAME || 'hospital_db'} ...`);
    await pool.query('CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name VARCHAR(255), applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');

    const already = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [name]);
    const client = await pool.connect();
    try {
        await client.query(sql);   // file carries its own BEGIN/COMMIT
        if (already.rowCount === 0) {
            await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
        }
        console.log(`✅ Applied ${name} in ${Date.now() - started}ms ${already.rowCount ? '(re-applied; already recorded)' : '(recorded in _migrations)'}`);
    } finally {
        client.release();
        await pool.end();
    }
})().catch(async (e) => {
    console.error(`❌ Migration failed: ${e.message}`);
    if (e.hint) console.error(`   hint: ${e.hint}`);
    try { await pool.end(); } catch (_) {}
    process.exit(1);
});
