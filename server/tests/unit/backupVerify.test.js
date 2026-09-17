/**
 * backupVerify.test.js — Unit tests for Backup Dump Verification Utility
 * 
 * Part of Wolf HMS Phase 5 Hardening (W3).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { verifyBackupFile, REQUIRED_TABLES } = require('../../scripts/verify-backup');

describe('UNIT: Backup Dump Verification (Phase 5 W3)', () => {
    const tempDir = path.join(__dirname, '..', 'fixtures_backup_test');

    beforeAll(() => {
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
    });

    afterAll(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('1. Valid SQL dump fixture passes: all required tables & record_hash present', async () => {
        const validSql = `
            -- PostgreSQL Database Dump
            CREATE TABLE IF NOT EXISTS public.hospitals (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL
            );

            CREATE TABLE public.users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100),
                email VARCHAR(255)
            );

            CREATE TABLE public.patients (
                id UUID PRIMARY KEY,
                first_name VARCHAR(100)
            );

            CREATE TABLE public.admissions (
                id SERIAL PRIMARY KEY,
                patient_id UUID
            );

            CREATE TABLE public.refresh_tokens (
                id SERIAL PRIMARY KEY,
                token_hash VARCHAR(64),
                revoked BOOLEAN DEFAULT false
            );

            CREATE TABLE public.audit_logs (
                id UUID PRIMARY KEY,
                action VARCHAR(50),
                prev_hash VARCHAR(64),
                record_hash VARCHAR(64),
                created_at TIMESTAMP
            );
        `;

        const testFile = path.join(tempDir, 'valid_dump.sql');
        fs.writeFileSync(testFile, validSql, 'utf8');

        const result = await verifyBackupFile(testFile);
        expect(result.valid).toBe(true);
        expect(result.missingTables).toHaveLength(0);
        expect(result.hasRecordHash).toBe(true);
        expect(result.hasPrevHash).toBe(true);
        for (const tbl of REQUIRED_TABLES) {
            expect(result.tablesFound).toContain(tbl);
        }
    });

    test('2. Missing critical table fails: reports missing table and valid=false', async () => {
        // Missing 'refresh_tokens' and 'audit_logs'
        const incompleteSql = `
            CREATE TABLE public.hospitals (id SERIAL PRIMARY KEY);
            CREATE TABLE public.users (id SERIAL PRIMARY KEY);
            CREATE TABLE public.patients (id UUID PRIMARY KEY);
            CREATE TABLE public.admissions (id SERIAL PRIMARY KEY);
        `;

        const testFile = path.join(tempDir, 'incomplete_dump.sql');
        fs.writeFileSync(testFile, incompleteSql, 'utf8');

        const result = await verifyBackupFile(testFile);
        expect(result.valid).toBe(false);
        expect(result.missingTables).toContain('refresh_tokens');
        expect(result.missingTables).toContain('audit_logs');
        expect(result.hasRecordHash).toBe(false);
    });

    test('3. Gzipped SQL dump handling: decompresses and validates .sql.gz stream on the fly', async () => {
        const fullSql = `
            CREATE TABLE public.hospitals (id SERIAL PRIMARY KEY);
            CREATE TABLE public.users (id SERIAL PRIMARY KEY);
            CREATE TABLE public.patients (id UUID PRIMARY KEY);
            CREATE TABLE public.admissions (id SERIAL PRIMARY KEY);
            CREATE TABLE public.refresh_tokens (id SERIAL PRIMARY KEY);
            CREATE TABLE public.audit_logs (
                id UUID PRIMARY KEY,
                prev_hash VARCHAR(64),
                record_hash VARCHAR(64)
            );
        `;

        const gzippedBuffer = zlib.gzipSync(Buffer.from(fullSql, 'utf8'));
        const testFileGz = path.join(tempDir, 'compressed_dump.sql.gz');
        fs.writeFileSync(testFileGz, gzippedBuffer);

        const result = await verifyBackupFile(testFileGz);
        expect(result.valid).toBe(true);
        expect(result.missingTables).toHaveLength(0);
        expect(result.hasRecordHash).toBe(true);
        expect(result.hasPrevHash).toBe(true);
    });

    test('4. Missing cryptographic hash column in audit_logs fails verification', async () => {
        const legacyAuditSql = `
            CREATE TABLE public.hospitals (id SERIAL PRIMARY KEY);
            CREATE TABLE public.users (id SERIAL PRIMARY KEY);
            CREATE TABLE public.patients (id UUID PRIMARY KEY);
            CREATE TABLE public.admissions (id SERIAL PRIMARY KEY);
            CREATE TABLE public.refresh_tokens (id SERIAL PRIMARY KEY);
            CREATE TABLE public.audit_logs (
                id SERIAL PRIMARY KEY,
                action VARCHAR(50),
                entity_type VARCHAR(50)
            );
        `;

        const testFile = path.join(tempDir, 'legacy_audit_dump.sql');
        fs.writeFileSync(testFile, legacyAuditSql, 'utf8');

        const result = await verifyBackupFile(testFile);
        expect(result.valid).toBe(false);
        expect(result.hasRecordHash).toBe(false);
    });
});
