/**
 * Database Pool Manager for Wolf HMS Scale-Up
 * 
 * Provides read/write pool separation for high-scale operation:
 * - Primary pool: INSERT, UPDATE, DELETE operations
 * - Replica pool: SELECT queries (dashboards, reports)
 * 
 * At 1,000 beds scale (2,000+ users), this prevents:
 * - Read contention blocking writes in ER/OT
 * - Dashboard queries slowing down clinical operations
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Cloud SQL Unix Socket Detection
const dbHost = process.env.DB_HOST || 'localhost';
console.log('[dbPools] DEBUG: process.env.DB_HOST =', process.env.DB_HOST);
console.log('[dbPools] DEBUG: dbHost resolved to:', dbHost);

const isCloudSQL = dbHost.startsWith('/cloudsql/');
console.log('[dbPools] DEBUG: isCloudSQL =', isCloudSQL);

// Base pool configuration
const baseConfig = {
    user: process.env.DB_USER || 'postgres',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    // Connection pool settings for scale
    max: parseInt(process.env.DB_POOL_SIZE) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

/**
 * Create a pool with specific host configuration
 */
const createPool = (host, name) => {
    const config = { ...baseConfig };
    
    if (isCloudSQL || host.startsWith('/cloudsql/')) {
        // Cloud Run + Cloud SQL: Use Unix socket
        console.log(`[dbPools] Connecting to Cloud SQL Socket: ${host}`);
        config.host = host;
        // config.socketPath = host; // REMOVED: pg uses config.host for socket path
    } else {
        // Local/TCP connection
        config.host = host;
        config.port = process.env.DB_PORT || 5432;
        config.ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;
    }
    
    const pool = new Pool(config);
    
    // Error handling
    pool.on('error', (err) => {
        console.error(`[${name}] Unexpected database pool error:`, err.message);
    });
    
    pool.on('connect', () => {
        console.log(`[${name}] New connection established`);
    });
    
    return pool;
};

// Primary pool for writes (INSERT, UPDATE, DELETE)
const primaryPool = createPool(dbHost, 'PRIMARY');

// Replica pool for reads (SELECT) - falls back to primary if not configured
const replicaHost = process.env.DB_REPLICA_HOST || process.env.DB_HOST || 'localhost';
const replicaPool = replicaHost !== dbHost 
    ? createPool(replicaHost, 'REPLICA')
    : primaryPool; // Use primary if no replica configured

/**
 * Smart query router that uses replica for SELECTs, primary for writes
 */
const query = async (text, params) => {
    const isReadQuery = text.trim().toUpperCase().startsWith('SELECT');
    const pool = isReadQuery ? replicaPool : primaryPool;
    return pool.query(text, params);
};

/**
 * Get appropriate pool for manual operations
 */
const getPool = (operation = 'read') => {
    return operation === 'write' ? primaryPool : replicaPool;
};

/**
 * Transaction helper - always uses primary pool
 */
const transaction = async (callback) => {
    const client = await primaryPool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Health check for both pools
 */
const healthCheck = async () => {
    const results = {
        primary: false,
        replica: false,
        timestamp: new Date().toISOString()
    };
    
    try {
        await primaryPool.query('SELECT 1');
        results.primary = true;
    } catch (err) {
        results.primaryError = err.message;
    }
    
    if (replicaPool !== primaryPool) {
        try {
            await replicaPool.query('SELECT 1');
            results.replica = true;
        } catch (err) {
            results.replicaError = err.message;
        }
    } else {
        results.replica = results.primary;
        results.replicaNote = 'Using primary (no replica configured)';
    }
    
    return results;
};

/**
 * Graceful shutdown
 */
const shutdown = async () => {
    console.log('[DB] Closing database pools...');
    await primaryPool.end();
    if (replicaPool !== primaryPool) {
        await replicaPool.end();
    }
    console.log('[DB] Database pools closed');
};

// Export for use across application
module.exports = {
    // Pool access
    primaryPool,
    replicaPool,
    pool: primaryPool, // Backward compatibility
    
    // Smart routing
    query,
    getPool,
    transaction,
    
    // Utilities
    healthCheck,
    shutdown,
    
    // Configuration info
    config: {
        isCloudSQL,
        hasReplica: replicaPool !== primaryPool,
        primaryHost: dbHost,
        replicaHost
    }
};
