/**
 * auditChain.js — Cryptographic Hash Chaining for HIPAA & DPDP Compliance
 * 
 * Part of Wolf HMS Phase 5 Hardening (W2).
 * Implements tamper-evident SHA-256 hash chaining over audit records.
 */

const crypto = require('crypto');

const GENESIS_HASH = 'GENESIS';

/**
 * Computes SHA-256 hash for an audit record linked to the previous record's hash.
 * 
 * @param {Object} params
 * @param {string} [params.prevHash] - Hash of previous audit record or 'GENESIS'
 * @param {number|string} [params.userId] - User ID initiating the action
 * @param {string} params.action - Action performed (e.g. READ, CREATE, UPDATE, DELETE)
 * @param {string} params.resourceType - Resource / Entity type (e.g. patients, admissions)
 * @param {number|string} [params.resourceId] - Target resource ID
 * @param {string|Date} [params.timestamp] - Timestamp of the record
 * @returns {string} SHA-256 hexadecimal hash
 */
function computeRecordHash({
    prevHash = GENESIS_HASH,
    userId = '',
    action = '',
    resourceType = '',
    resourceId = '',
    timestamp = ''
}) {
    const prev = prevHash || GENESIS_HASH;
    const uid = userId !== null && userId !== undefined ? String(userId) : '';
    const act = action ? String(action).toUpperCase() : '';
    const resType = resourceType ? String(resourceType).toLowerCase() : '';
    const resId = resourceId !== null && resourceId !== undefined ? String(resourceId) : '';
    const ts = timestamp instanceof Date ? timestamp.toISOString() : (timestamp ? String(timestamp) : '');

    const payload = [prev, uid, act, resType, resId, ts].join('|');
    return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Fetches the latest record_hash from audit_logs to link the new record.
 * 
 * @param {Object} poolOrClient - pg Pool or Client
 * @returns {Promise<string>} Latest record_hash or 'GENESIS'
 */
async function getLatestHash(poolOrClient) {
    try {
        const res = await poolOrClient.query(
            `SELECT record_hash FROM audit_logs WHERE record_hash IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 1`
        );
        if (res.rows.length > 0 && res.rows[0].record_hash) {
            return res.rows[0].record_hash;
        }
    } catch (err) {
        console.warn('[AuditChain] Error querying latest record_hash:', err.message);
    }
    return GENESIS_HASH;
}

/**
 * Validates a sequence of audit log rows for cryptographic chain integrity.
 * 
 * @param {Array<Object>} rows - Array of audit log records in chronological order
 * @returns {Object} { valid: boolean, brokenAtId?: any, reason?: string, count: number }
 */
function verifyChain(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return { valid: true, count: 0 };
    }

    let expectedPrev = rows[0].prev_hash || GENESIS_HASH;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Skip unhashed legacy rows if they exist before Phase 5
        if (!row.record_hash) {
            continue;
        }

        const actualPrev = row.prev_hash || GENESIS_HASH;
        if (actualPrev !== expectedPrev) {
            return {
                valid: false,
                brokenAtId: row.id,
                reason: `Chain linkage mismatch at record ${row.id}: expected prev_hash ${expectedPrev}, found ${actualPrev}`,
                count: i
            };
        }

        const calculated = computeRecordHash({
            prevHash: actualPrev,
            userId: row.user_id,
            action: row.action,
            resourceType: row.resource_type || row.entity_type,
            resourceId: row.resource_id || row.entity_id,
            timestamp: row.created_at || row.timestamp
        });

        if (calculated !== row.record_hash) {
            return {
                valid: false,
                brokenAtId: row.id,
                reason: `Tampering detected at record ${row.id}: stored hash ${row.record_hash} does not match computed hash ${calculated}`,
                count: i
            };
        }

        expectedPrev = row.record_hash;
    }

    return { valid: true, count: rows.length };
}

module.exports = {
    GENESIS_HASH,
    computeRecordHash,
    getLatestHash,
    verifyChain
};
