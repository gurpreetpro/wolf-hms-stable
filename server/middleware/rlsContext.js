/**
 * rlsContext.js — Transaction-Scoped PostgreSQL Row-Level Security Context Helper
 * 
 * Part of Wolf HMS Phase 2 Hardening.
 * Guarantees that app.current_tenant is set locally within an isolated transaction,
 * preventing connection pool cross-talk across asynchronous requests.
 */

const pool = require('../config/db');

/**
 * Executes a callback within a dedicated database client transaction,
 * setting app.current_tenant locally with SET LOCAL (transaction-scoped).
 * 
 * @param {Object} dbPoolOrClient - pg Pool or Client instance
 * @param {number|string} hospitalId - Tenant hospital ID
 * @param {Function} callback - Async function receiving the scoped client: async (client) => { ... }
 * @returns {Promise<any>} Result of the callback
 */
const withTenantContext = async (dbPoolOrClient, hospitalId, callback) => {
    // If passed a pool, check out a client; if already a client, reuse it
    const isPool = typeof dbPoolOrClient.connect === 'function';
    const client = isPool ? await dbPoolOrClient.connect() : dbPoolOrClient;

    try {
        await client.query('BEGIN');
        if (hospitalId) {
            // is_local = true ensures the setting only persists for this transaction
            await client.query("SELECT set_config('app.current_tenant', $1, true)", [hospitalId.toString()]);
        }
        
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rbErr) {
            console.error('[RLS Context] Rollback failed:', rbErr.message);
        }
        throw err;
    } finally {
        if (isPool) {
            client.release();
        }
    }
};

/**
 * Express middleware that decorates req with withTenantContext
 */
const rlsMiddleware = (req, res, next) => {
    req.withTenantContext = (callback) => {
        const hospitalId = req.hospital_id || req.user?.hospital_id || 1;
        return withTenantContext(pool, hospitalId, callback);
    };
    next();
};

module.exports = {
    withTenantContext,
    rlsMiddleware
};
