/**
 * Wolf HMS Shared Utilities
 * 
 * Common code shared across all microservices:
 * - Database connections (dbPools)
 * - Cache layer (cache.js)
 * - Message queue (messageQueue.js)
 * - Authentication middleware
 */

// Re-export from main server config
const dbPools = require('../../server/config/dbPools');
const cache = require('../../server/config/cache');
const messageQueue = require('../../server/config/messageQueue');

// Common middleware
const authMiddleware = require('../../server/middleware/auth');

// Export all shared utilities
module.exports = {
    // Database
    db: dbPools,
    primaryPool: dbPools.primaryPool,
    replicaPool: dbPools.replicaPool,
    query: dbPools.query,
    transaction: dbPools.transaction,
    
    // Cache
    cache,
    TTL: cache.TTL,
    PREFIX: cache.PREFIX,
    
    // Message Queue
    queue: messageQueue,
    TOPICS: messageQueue.TOPICS,
    
    // Middleware
    auth: authMiddleware,
    
    // Utilities
    logger: {
        info: (service, msg) => console.log(`[${service}] ${msg}`),
        error: (service, msg, err) => console.error(`[${service}] ${msg}`, err?.message || ''),
        warn: (service, msg) => console.warn(`[${service}] ${msg}`)
    }
};
