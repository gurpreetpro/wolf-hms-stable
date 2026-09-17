/**
 * ecosystemConfig.test.js
 * 
 * Unit tests for PM2 Cluster Ecosystem Configuration (W2).
 * Verifies that deploy/ecosystem.config.cjs parses cleanly, exports
 * a valid PM2 configuration, specifies cluster mode with instances='max',
 * and defines safe memory limits and log files.
 */

const path = require('path');

describe('PM2 Ecosystem Configuration (W2 — Cluster Mode)', () => {
    const configPath = path.resolve(__dirname, '../../../deploy/ecosystem.config.cjs');

    test('should load and parse ecosystem.config.cjs without syntax errors', () => {
        let config;
        expect(() => {
            config = require(configPath);
        }).not.toThrow();
        expect(config).toBeDefined();
        expect(Array.isArray(config.apps)).toBe(true);
        expect(config.apps.length).toBeGreaterThanOrEqual(1);
    });

    test('should configure wolf-hms-api in cluster mode with max instances', () => {
        const config = require(configPath);
        const app = config.apps.find(a => a.name === 'wolf-hms-api');
        
        expect(app).toBeDefined();
        expect(app.script).toBe('./server-cloud.js');
        expect(app.exec_mode).toBe('cluster');
        expect(app.instances).toBe('max');
        expect(app.max_memory_restart).toBe('1G');
    });

    test('should define appropriate environment and log locations', () => {
        const config = require(configPath);
        const app = config.apps.find(a => a.name === 'wolf-hms-api');

        expect(app.env).toBeDefined();
        expect(app.env.NODE_ENV).toBe('production');
        expect(app.env.PORT).toBe(5002);
        expect(app.out_file).toMatch(/wolf-hms-api-out\.log/);
        expect(app.error_file).toMatch(/wolf-hms-api-error\.log/);
    });
});
