/**
 * socketCluster.js — Real-time Horizontal Clustering via Redis Adapter
 * 
 * Part of Wolf HMS Phase 4 Hardening.
 * Attaches @socket.io/redis-adapter to Socket.IO when REDIS_URL is provided,
 * allowing sticky-free cross-worker and cross-node broadcast fan-out.
 * Local development and single-node instances without REDIS_URL remain unaffected.
 */

const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');
const logger = require('../utils/logger');

/**
 * Attaches the Redis adapter to an existing Socket.IO server instance.
 * If redisUrl is omitted or empty, this is a no-op and returns null (single-node mode).
 * 
 * @param {import('socket.io').Server} io - Socket.IO server instance
 * @param {string} [redisUrl] - Redis connection URL (e.g. redis://... or rediss://...)
 * @param {Object} [options] - Overrides for testing
 * @returns {{ pubClient: Redis, subClient: Redis } | null}
 */
const attachAdapter = (io, redisUrl, options = {}) => {
    if (!redisUrl) {
        return null;
    }

    if (!io || typeof io.adapter !== 'function') {
        throw new Error('[SocketCluster] A valid Socket.IO server instance is required');
    }

    const RedisClientClass = options.RedisClient || Redis;
    const createAdapterFn = options.createAdapter || createAdapter;

    const retryStrategy = (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
    };

    const redisOptions = {
        retryStrategy,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        ...(options.redisOptions || {})
    };

    const pubClient = new RedisClientClass(redisUrl, redisOptions);
    const subClient = typeof pubClient.duplicate === 'function' 
        ? pubClient.duplicate() 
        : new RedisClientClass(redisUrl, redisOptions);

    if (typeof pubClient.on === 'function') {
        pubClient.on('error', (err) => {
            logger.error('[SocketCluster] Redis Pub Client Error:', { error: err && err.message ? err.message : err });
        });
    }

    if (typeof subClient.on === 'function') {
        subClient.on('error', (err) => {
            logger.error('[SocketCluster] Redis Sub Client Error:', { error: err && err.message ? err.message : err });
        });
    }

    const adapter = createAdapterFn(pubClient, subClient);
    io.adapter(adapter);

    logger.info('[SocketCluster] adapter attached');

    return { pubClient, subClient };
};

module.exports = {
    attachAdapter
};
