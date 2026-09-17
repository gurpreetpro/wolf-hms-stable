/**
 * dbPoolConfig.test.js
 * 
 * Unit tests for Database Pool Configuration (W3).
 * Verifies that db.js and dbPools.js honor environment variable overrides
 * (PG_POOL_MAX, PG_POOL_IDLE_TIMEOUT, PG_POOL_CONN_TIMEOUT)
 * while falling back safely to stable defaults when envs are absent.
 */

describe('Database Pool Configuration (W3 — Pool Hardening)', () => {
    const originalEnv = {
        PG_POOL_MAX: process.env.PG_POOL_MAX,
        PG_POOL_IDLE_TIMEOUT: process.env.PG_POOL_IDLE_TIMEOUT,
        PG_POOL_CONN_TIMEOUT: process.env.PG_POOL_CONN_TIMEOUT,
        DB_POOL_SIZE: process.env.DB_POOL_SIZE
    };

    afterEach(() => {
        Object.keys(originalEnv).forEach(key => {
            if (originalEnv[key] !== undefined) {
                process.env[key] = originalEnv[key];
            } else {
                delete process.env[key];
            }
        });
        jest.resetModules();
    });

    test('should apply default connection pool limits when envs are absent', () => {
        delete process.env.PG_POOL_MAX;
        delete process.env.PG_POOL_IDLE_TIMEOUT;
        delete process.env.PG_POOL_CONN_TIMEOUT;
        delete process.env.DB_POOL_SIZE;

        let db;
        jest.isolateModules(() => {
            db = require('../../db');
        });

        expect(typeof db.getPoolConfig).toBe('function');
        const config = db.getPoolConfig();
        expect(config.max).toBe(10);
        expect(config.idleTimeoutMillis).toBe(30000);
        expect(config.connectionTimeoutMillis).toBe(5000);
    });

    test('should honor PG_POOL_MAX, PG_POOL_IDLE_TIMEOUT, and PG_POOL_CONN_TIMEOUT overrides', () => {
        process.env.PG_POOL_MAX = '35';
        process.env.PG_POOL_IDLE_TIMEOUT = '15000';
        process.env.PG_POOL_CONN_TIMEOUT = '8000';

        let db;
        jest.isolateModules(() => {
            db = require('../../db');
        });

        const config = db.getPoolConfig();
        expect(config.max).toBe(35);
        expect(config.idleTimeoutMillis).toBe(15000);
        expect(config.connectionTimeoutMillis).toBe(8000);
    });

    test('should honor legacy DB_POOL_SIZE fallback when PG_POOL_MAX is not explicitly set', () => {
        delete process.env.PG_POOL_MAX;
        process.env.DB_POOL_SIZE = '42';

        let dbPools;
        jest.isolateModules(() => {
            dbPools = require('../../config/dbPools');
        });

        const config = dbPools.getPoolConfig();
        expect(config.max).toBe(42);
    });
});
