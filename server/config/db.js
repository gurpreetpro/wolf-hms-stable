/**
 * Database Connection - Wolf HMS
 * 
 * SCALE-UP: Now re-exports from dbPools.js for read/write separation
 * This file exists for backward compatibility with existing imports.
 * 
 * For new code, use: require('./dbPools')
 */

const dbPools = require('./dbPools');

// Export primary pool for backward compatibility
// Most existing code does: const pool = require('./config/db');
const pool = dbPools.primaryPool;

// Dual export pattern for different import styles
module.exports = pool;
module.exports.pool = pool;
module.exports.query = pool.query.bind(pool);
