#!/usr/bin/env node
/**
 * backup-dump.js — Deterministic, Safe PostgreSQL Backup Dump Utility
 * 
 * Part of Wolf HMS Phase 5 Hardening (W3).
 * Wraps pg_dump via child_process with automatic timestamped gzip compression.
 * 
 * SAFETY RULE:
 * Dry-run by default! You MUST explicitly provide `--commit` to execute.
 * 
 * Usage:
 *   node server/scripts/backup-dump.js                  # Dry-run plan preview
 *   node server/scripts/backup-dump.js --commit         # Executes actual backup
 *   node server/scripts/backup-dump.js --commit --output-dir /var/backups
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Parse CLI flags
const args = process.argv.slice(2);
const isCommit = args.includes('--commit');
const noGzip = args.includes('--no-gzip');

function getArgValue(flag, defaultValue) {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
        return args[idx + 1];
    }
    return defaultValue;
}

const dbName = getArgValue('--db', process.env.DB_NAME || 'wolf_hms_prod');
const dbHost = getArgValue('--host', process.env.DB_HOST || '127.0.0.1');
const dbPort = getArgValue('--port', process.env.DB_PORT || '5432');
const dbUser = getArgValue('--user', process.env.DB_USER || 'wolf_admin');
const outputDir = path.resolve(getArgValue('--output-dir', path.join(__dirname, '..', 'backups')));

// Timestamp formatting: YYYYMMDD_HHMMSS
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const timestampStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const baseFilename = `wolf_hms_backup_${timestampStr}.sql`;
const finalFilename = noGzip ? baseFilename : `${baseFilename}.gz`;
const targetFilePath = path.join(outputDir, finalFilename);

console.log('====================================================');
console.log('   WOLF HMS DATABASE BACKUP UTILITY (PHASE 5 W3)    ');
console.log('====================================================');
console.log(`Database:    ${dbName}`);
console.log(`Host:Port:   ${dbHost}:${dbPort}`);
console.log(`User:        ${dbUser}`);
console.log(`Output:      ${targetFilePath}`);
console.log(`Compression: ${noGzip ? 'None' : 'Gzip'}`);
console.log(`Execution:   ${isCommit ? '⚡ LIVE COMMIT MODE' : '🛡️ DRY-RUN MODE (Safe)'}`);
console.log('----------------------------------------------------');

if (!isCommit) {
    console.log('[DRY-RUN] Backup command that would be executed:');
    console.log(`  pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --clean --if-exists --no-owner --no-privileges`);
    console.log(`  Target destination: ${targetFilePath}`);
    console.log('');
    console.log('To execute this backup, re-run with:');
    console.log('  node server/scripts/backup-dump.js --commit');
    console.log('====================================================');
    process.exit(0);
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('[BACKUP] Spawning pg_dump process...');

const pgDumpArgs = [
    '-h', dbHost,
    '-p', String(dbPort),
    '-U', dbUser,
    '-d', dbName,
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges'
];

const env = { ...process.env };
if (process.env.DB_PASSWORD) {
    env.PGPASSWORD = process.env.DB_PASSWORD;
}

const pgDump = spawn('pg_dump', pgDumpArgs, { env, stdio: ['ignore', 'pipe', 'pipe'] });
const writeStream = fs.createWriteStream(targetFilePath);

let errorOutput = '';
pgDump.stderr.on('data', (data) => {
    errorOutput += data.toString();
});

if (noGzip) {
    pgDump.stdout.pipe(writeStream);
} else {
    const gzip = zlib.createGzip({ level: 6 });
    pgDump.stdout.pipe(gzip).pipe(writeStream);
}

writeStream.on('finish', () => {
    const stats = fs.statSync(targetFilePath);
    console.log(`[BACKUP] ✅ Backup completed successfully!`);
    console.log(`[BACKUP] File: ${targetFilePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
});

pgDump.on('close', (code) => {
    if (code !== 0) {
        console.error(`[BACKUP] ❌ pg_dump exited with error code ${code}`);
        if (errorOutput) {
            console.error(`[BACKUP] Error details: ${errorOutput.trim()}`);
        }
        process.exit(code);
    }
});
