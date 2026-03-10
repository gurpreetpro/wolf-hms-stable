/**
 * Wolf HMS Cache Layer
 * 
 * Provides caching for high-scale operation (1,000+ beds):
 * - Redis for production (Cloud Memorystore)
 * - In-memory LRU fallback for development
 * 
 * Usage:
 *   const cache = require('./config/cache');
 *   await cache.set('key', data, cache.TTL.SESSION);
 *   const data = await cache.get('key');
 */

const Redis = require('ioredis');

// Cache TTL configurations (in seconds)
const TTL = {
    SESSION: 3600,       // 1 hour - user sessions
    MASTER_DATA: 86400,  // 24 hours - drugs, tests, wards
    BED_STATUS: 30,      // 30 seconds - ward bed dashboard
    USER_PROFILE: 300,   // 5 minutes - user details
    PATIENT_LIST: 60,    // 1 minute - active patients
    DASHBOARD: 15,       // 15 seconds - dashboard stats
    LONG: 604800,        // 1 week - rarely changing data
};

// Key prefixes for organization
const PREFIX = {
    SESSION: 'sess:',
    USER: 'user:',
    PATIENT: 'patient:',
    BED: 'bed:',
    WARD: 'ward:',
    DRUGS: 'drugs:',
    TESTS: 'tests:',
    HOSPITAL: 'hosp:',
};

// In-memory cache fallback (LRU with max 1000 entries)
class MemoryCache {
    constructor(maxSize = 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    async get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (item.expires && item.expires < Date.now()) {
            this.cache.delete(key);
            return null;
        }
        // Move to end for LRU
        this.cache.delete(key);
        this.cache.set(key, item);
        return item.value;
    }

    async set(key, value, ttl = 300) {
        // Evict oldest if at max size
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, {
            value,
            expires: Date.now() + (ttl * 1000)
        });
        return true;
    }

    async del(key) {
        return this.cache.delete(key);
    }

    async delPattern(pattern) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        let count = 0;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }

    async flush() {
        this.cache.clear();
        return true;
    }

    async keys(pattern) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return Array.from(this.cache.keys()).filter(k => regex.test(k));
    }

    get stats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            type: 'memory'
        };
    }
}

// Redis wrapper with memory fallback
class CacheClient {
    constructor() {
        this.redisUrl = process.env.REDIS_URL;
        this.client = null;
        this.fallback = new MemoryCache();
        this.isRedis = false;
        this._init();
    }

    _init() {
        if (this.redisUrl) {
            try {
                this.client = new Redis(this.redisUrl, {
                    maxRetriesPerRequest: 3,
                    retryDelayOnFailover: 100,
                    enableReadyCheck: true,
                    lazyConnect: true
                });

                this.client.on('connect', () => {
                    console.log('[CACHE] Redis connected');
                    this.isRedis = true;
                });

                this.client.on('error', (err) => {
                    console.error('[CACHE] Redis error, using memory fallback:', err.message);
                    this.isRedis = false;
                });

                // Try to connect
                this.client.connect().catch(() => {
                    console.log('[CACHE] Redis unavailable, using memory cache');
                    this.isRedis = false;
                });
            } catch (err) {
                console.log('[CACHE] Redis init failed, using memory cache');
                this.isRedis = false;
            }
        } else {
            console.log('[CACHE] No REDIS_URL, using in-memory cache');
        }
    }

    async get(key) {
        try {
            if (this.isRedis && this.client) {
                const data = await this.client.get(key);
                return data ? JSON.parse(data) : null;
            }
        } catch (err) {
            console.error('[CACHE] Redis get error:', err.message);
        }
        return this.fallback.get(key);
    }

    async set(key, value, ttl = TTL.SESSION) {
        try {
            if (this.isRedis && this.client) {
                await this.client.setex(key, ttl, JSON.stringify(value));
                return true;
            }
        } catch (err) {
            console.error('[CACHE] Redis set error:', err.message);
        }
        return this.fallback.set(key, value, ttl);
    }

    async del(key) {
        try {
            if (this.isRedis && this.client) {
                await this.client.del(key);
            }
        } catch (err) {
            console.error('[CACHE] Redis del error:', err.message);
        }
        return this.fallback.del(key);
    }

    async delPattern(pattern) {
        try {
            if (this.isRedis && this.client) {
                const keys = await this.client.keys(pattern);
                if (keys.length > 0) {
                    await this.client.del(...keys);
                }
                return keys.length;
            }
        } catch (err) {
            console.error('[CACHE] Redis delPattern error:', err.message);
        }
        return this.fallback.delPattern(pattern);
    }

    async getOrSet(key, fetchFn, ttl = TTL.SESSION) {
        let value = await this.get(key);
        if (value !== null) {
            return value;
        }
        value = await fetchFn();
        if (value !== null && value !== undefined) {
            await this.set(key, value, ttl);
        }
        return value;
    }

    // Convenience: Cache hospital-scoped data
    hospitalKey(hospitalId, type, id = '') {
        return `${PREFIX.HOSPITAL}${hospitalId}:${type}${id ? ':' + id : ''}`;
    }

    get stats() {
        return {
            isRedis: this.isRedis,
            memory: this.fallback.stats
        };
    }
}

// Singleton instance
const cache = new CacheClient();

// Export cache instance and utilities
module.exports = cache;
module.exports.TTL = TTL;
module.exports.PREFIX = PREFIX;
module.exports.CacheClient = CacheClient;
