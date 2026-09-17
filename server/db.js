/**
 * Database Connection Layer for Wolf HMS
 * 
 * SCALE-UP: Now uses dbPools.js for read/write separation
 * - Primary pool: INSERT, UPDATE, DELETE operations
 * - Replica pool: SELECT queries (dashboards, reports)
 * 
 * This file provides backward compatibility for existing imports.
 * New code should use config/dbPools.js directly.
 * 
 * FIXED: Don't overwrite pool.query to avoid circular recursion
 */

const dbPools = require('./config/dbPools');

// [Phase 4 Hardening] Env-tunable connection pool limits & boot telemetry
const getPoolConfig = () => {
    return typeof dbPools.getPoolConfig === 'function' ? dbPools.getPoolConfig() : {
        max: parseInt(process.env.PG_POOL_MAX, 10) || parseInt(process.env.DB_POOL_SIZE, 10) || 10,
        idleTimeoutMillis: parseInt(process.env.PG_POOL_IDLE_TIMEOUT, 10) || 30000,
        connectionTimeoutMillis: parseInt(process.env.PG_POOL_CONN_TIMEOUT, 10) || 5000
    };
};

const effectiveConfig = getPoolConfig();
console.log(`[DB Pool] Effective configuration: max=${effectiveConfig.max}, idleTimeoutMillis=${effectiveConfig.idleTimeoutMillis}ms, connectionTimeoutMillis=${effectiveConfig.connectionTimeoutMillis}ms`);

// Create a wrapper object instead of modifying the pool directly
// This prevents the circular reference that caused stack overflow
const poolWrapper = {
    // Native pool methods - use bound functions to preserve 'this'
    query: dbPools.primaryPool.query.bind(dbPools.primaryPool),
    connect: dbPools.primaryPool.connect.bind(dbPools.primaryPool),
    end: dbPools.primaryPool.end.bind(dbPools.primaryPool),
    on: dbPools.primaryPool.on.bind(dbPools.primaryPool),
    
    // Extended properties
    pool: dbPools.primaryPool,
    primaryPool: dbPools.primaryPool,
    replicaPool: dbPools.replicaPool,
    
    // Smart query router (opt-in usage)
    smartQuery: dbPools.query,
    transaction: dbPools.transaction,
    healthCheck: dbPools.healthCheck,
    getPoolConfig,
    effectiveConfig
};

// Export the wrapper
module.exports = poolWrapper;
// Also allow destructuring: const { pool } = require('./db')
module.exports.pool = poolWrapper;
module.exports.getPoolConfig = getPoolConfig;
