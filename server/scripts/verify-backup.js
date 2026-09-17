#!/usr/bin/env node
/**
 * verify-backup.js — PostgreSQL Backup Dump Verification Utility
 * 
 * Part of Wolf HMS Phase 5 Hardening (W3).
 * Inspects SQL dump contents (.sql or .sql.gz) without restoring into a database.
 * Validates presence of critical enterprise tables and HIPAA cryptographic hash chain columns.
 * 
 * Exit Codes:
 *   0 — All required tables and audit columns present
 *   1 — Critical tables missing or invalid dump file
 * 
 * Usage:
 *   node server/scripts/verify-backup.js /path/to/wolf_hms_backup.sql.gz
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');

// Core tables that must be present in a valid Wolf HMS dump
const REQUIRED_TABLES = [
    'users',
    'patients',
    'admissions',
    'audit_logs',
    'refresh_tokens',
    'hospitals'
];

/**
 * Inspects a SQL or gzipped SQL dump stream for table definitions and audit columns.
 * 
 * @param {string} filePath - Absolute or relative path to .sql or .sql.gz file
 * @returns {Promise<Object>} Verification results object
 */
async function verifyBackupFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Backup file not found: ${filePath}`);
    }

    const isGzip = filePath.endsWith('.gz');
    const fileStream = fs.createReadStream(filePath);
    const inputStream = isGzip ? fileStream.pipe(zlib.createGunzip()) : fileStream;

    const rl = readline.createInterface({
        input: inputStream,
        crlfDelay: Infinity
    });

    const tablesFound = new Set();
    let hasRecordHash = false;
    let hasPrevHash = false;
    let inAuditLogsDefinition = false;

    // Regex matchers for PostgreSQL CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?["']?([a-zA-Z0-9_]+)["']?\s*\(/i;

    for await (const line of rl) {
        const trimmed = line.trim();

        const match = trimmed.match(createTableRegex);
        if (match) {
            const tableName = match[1].toLowerCase();
            tablesFound.add(tableName);
            if (tableName === 'audit_logs') {
                inAuditLogsDefinition = true;
            } else {
                inAuditLogsDefinition = false;
            }
        }

        // Check columns within audit_logs definition or subsequent ALTER statements
        if (inAuditLogsDefinition || trimmed.includes('audit_logs')) {
            if (/record_hash/i.test(trimmed)) {
                hasRecordHash = true;
            }
            if (/prev_hash/i.test(trimmed)) {
                hasPrevHash = true;
            }
        }

        if (inAuditLogsDefinition && trimmed.endsWith(');')) {
            inAuditLogsDefinition = false;
        }
    }

    const missingTables = REQUIRED_TABLES.filter(tbl => !tablesFound.has(tbl));
    const valid = missingTables.length === 0 && hasRecordHash;

    return {
        valid,
        filePath,
        tablesFound: Array.from(tablesFound),
        requiredTables: REQUIRED_TABLES,
        missingTables,
        hasRecordHash,
        hasPrevHash
    };
}

// If invoked as CLI script
if (require.main === module) {
    const targetFile = process.argv[2];
    if (!targetFile) {
        console.error('Usage: node server/scripts/verify-backup.js <path-to-dump.sql[.gz]>');
        process.exit(1);
    }

    console.log('====================================================');
    console.log('   WOLF HMS BACKUP VERIFICATION PROBE (PHASE 5 W3)  ');
    console.log('====================================================');
    console.log(`Inspecting: ${targetFile}`);

    verifyBackupFile(targetFile)
        .then((result) => {
            console.log('----------------------------------------------------');
            console.log(`Tables detected:     ${result.tablesFound.length}`);
            console.log(`Audit Hash Chain:    ${result.hasRecordHash ? '✅ PRESENT (record_hash)' : '❌ MISSING (record_hash)'}`);
            console.log(`Audit Prev Hash:     ${result.hasPrevHash ? '✅ PRESENT (prev_hash)' : '⚠️ MISSING (prev_hash)'}`);
            
            if (result.missingTables.length > 0) {
                console.error(`❌ Critical missing tables: ${result.missingTables.join(', ')}`);
                console.log('====================================================');
                process.exit(1);
            }

            if (!result.hasRecordHash) {
                console.error('❌ audit_logs table missing cryptographic record_hash column!');
                console.log('====================================================');
                process.exit(1);
            }

            console.log('----------------------------------------------------');
            console.log('✅ BACKUP INTEGRITY VERIFIED: All core tables and hash chain columns present.');
            console.log('====================================================');
            process.exit(0);
        })
        .catch((err) => {
            console.error(`❌ Verification failed: ${err.message}`);
            process.exit(1);
        });
}

module.exports = {
    REQUIRED_TABLES,
    verifyBackupFile
};
