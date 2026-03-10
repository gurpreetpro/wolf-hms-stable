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
    healthCheck: dbPools.healthCheck
};

// Export the wrapper
module.exports = poolWrapper;
// Also allow destructuring: const { pool } = require('./db')
module.exports.pool = poolWrapper;
