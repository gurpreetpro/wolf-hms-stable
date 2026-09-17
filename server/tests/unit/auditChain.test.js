/**
 * auditChain.test.js — Unit tests for Cryptographic Audit Hash Chaining & Tamper Detection
 * 
 * Part of Wolf HMS Phase 5 Hardening (W2).
 */

const { computeRecordHash, verifyChain, GENESIS_HASH } = require('../../utils/auditChain');

describe('UNIT: Audit Hash Chaining & Verification (Phase 5 W2)', () => {
    const fixedTime = '2026-09-16T12:00:00.000Z';

    test('1. computeRecordHash produces deterministic SHA-256 hash', () => {
        const hash1 = computeRecordHash({
            prevHash: GENESIS_HASH,
            userId: 1,
            action: 'CREATE',
            resourceType: 'patients',
            resourceId: 101,
            timestamp: fixedTime
        });

        const hash2 = computeRecordHash({
            prevHash: GENESIS_HASH,
            userId: 1,
            action: 'CREATE',
            resourceType: 'patients',
            resourceId: 101,
            timestamp: fixedTime
        });

        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64);
        expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    test('2. computeRecordHash produces different hashes for different actions or payloads', () => {
        const hashCreate = computeRecordHash({
            prevHash: GENESIS_HASH,
            userId: 1,
            action: 'CREATE',
            resourceType: 'patients',
            resourceId: 101,
            timestamp: fixedTime
        });

        const hashDelete = computeRecordHash({
            prevHash: GENESIS_HASH,
            userId: 1,
            action: 'DELETE',
            resourceType: 'patients',
            resourceId: 101,
            timestamp: fixedTime
        });

        expect(hashCreate).not.toBe(hashDelete);
    });

    test('3. Sequential chain verification: verifyChain returns valid=true for unbroken sequence', () => {
        const row1Time = '2026-09-16T12:00:00.000Z';
        const row1Hash = computeRecordHash({
            prevHash: GENESIS_HASH,
            userId: 5,
            action: 'CREATE',
            resourceType: 'patients',
            resourceId: 'uuid-1',
            timestamp: row1Time
        });

        const row2Time = '2026-09-16T12:05:00.000Z';
        const row2Hash = computeRecordHash({
            prevHash: row1Hash,
            userId: 5,
            action: 'READ',
            resourceType: 'prescriptions',
            resourceId: 'rx-2',
            timestamp: row2Time
        });

        const row3Time = '2026-09-16T12:10:00.000Z';
        const row3Hash = computeRecordHash({
            prevHash: row2Hash,
            userId: 8,
            action: 'UPDATE',
            resourceType: 'invoices',
            resourceId: 'inv-3',
            timestamp: row3Time
        });

        const chain = [
            { id: 1, prev_hash: GENESIS_HASH, record_hash: row1Hash, user_id: 5, action: 'CREATE', resource_type: 'patients', resource_id: 'uuid-1', created_at: row1Time },
            { id: 2, prev_hash: row1Hash, record_hash: row2Hash, user_id: 5, action: 'READ', resource_type: 'prescriptions', resource_id: 'rx-2', created_at: row2Time },
            { id: 3, prev_hash: row2Hash, record_hash: row3Hash, user_id: 8, action: 'UPDATE', resource_type: 'invoices', resource_id: 'inv-3', created_at: row3Time }
        ];

        const verification = verifyChain(chain);
        expect(verification.valid).toBe(true);
        expect(verification.count).toBe(3);
    });

    test('4. Tampering detection: detects when payload is modified after hash calculation', () => {
        const row1Time = '2026-09-16T12:00:00.000Z';
        const row1Hash = computeRecordHash({
            prevHash: GENESIS_HASH,
            userId: 5,
            action: 'READ',
            resourceType: 'patients',
            resourceId: 'p-1',
            timestamp: row1Time
        });

        // Row has tampered action (e.g. rogue actor changed DELETE to READ)
        const tamperedChain = [
            {
                id: 1,
                prev_hash: GENESIS_HASH,
                record_hash: row1Hash,
                user_id: 5,
                action: 'DELETE', // Tampered! Originally was READ
                resource_type: 'patients',
                resource_id: 'p-1',
                created_at: row1Time
            }
        ];

        const result = verifyChain(tamperedChain);
        expect(result.valid).toBe(false);
        expect(result.brokenAtId).toBe(1);
        expect(result.reason).toMatch(/Tampering detected/i);
    });

    test('5. Chain break detection: detects when a record is deleted or replaced', () => {
        const row1Time = '2026-09-16T12:00:00.000Z';
        const row1Hash = computeRecordHash({
            prevHash: GENESIS_HASH,
            userId: 5,
            action: 'CREATE',
            resourceType: 'patients',
            resourceId: 'p-1',
            timestamp: row1Time
        });

        const row2Time = '2026-09-16T12:05:00.000Z';
        const row2Hash = computeRecordHash({
            prevHash: row1Hash,
            userId: 5,
            action: 'CREATE',
            resourceType: 'admissions',
            resourceId: 'adm-1',
            timestamp: row2Time
        });

        const row3Time = '2026-09-16T12:10:00.000Z';
        const row3Hash = computeRecordHash({
            prevHash: row2Hash,
            userId: 5,
            action: 'UPDATE',
            resourceType: 'admissions',
            resourceId: 'adm-1',
            timestamp: row3Time
        });

        // Row 2 is omitted/dropped from chain (gap in chain)
        const brokenChain = [
            { id: 1, prev_hash: GENESIS_HASH, record_hash: row1Hash, user_id: 5, action: 'CREATE', resource_type: 'patients', resource_id: 'p-1', created_at: row1Time },
            { id: 3, prev_hash: row2Hash, record_hash: row3Hash, user_id: 5, action: 'UPDATE', resource_type: 'admissions', resource_id: 'adm-1', created_at: row3Time }
        ];

        const result = verifyChain(brokenChain);
        expect(result.valid).toBe(false);
        expect(result.brokenAtId).toBe(3);
        expect(result.reason).toMatch(/Chain linkage mismatch/i);
    });
});
