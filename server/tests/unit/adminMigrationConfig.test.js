/**
 * adminMigrationConfig.test.js
 * 
 * Verifies that adminMigrationRoutes.js fails fast at boot time if
 * ADMIN_MIGRATE_SECRET is missing, closing P3-F1 carry-over debt.
 */

describe('Admin Migration Route Configuration (W0 / P3-F1)', () => {
    const originalEnv = process.env.ADMIN_MIGRATE_SECRET;

    afterEach(() => {
        if (originalEnv !== undefined) {
            process.env.ADMIN_MIGRATE_SECRET = originalEnv;
        } else {
            delete process.env.ADMIN_MIGRATE_SECRET;
        }
        jest.resetModules();
    });

    test('should throw an error at boot when ADMIN_MIGRATE_SECRET is unset', () => {
        delete process.env.ADMIN_MIGRATE_SECRET;
        expect(() => {
            jest.isolateModules(() => {
                require('../../routes/adminMigrationRoutes');
            });
        }).toThrow(/Missing required environment secret: ADMIN_MIGRATE_SECRET/);
    });

    test('should load router successfully when ADMIN_MIGRATE_SECRET is set', () => {
        process.env.ADMIN_MIGRATE_SECRET = 'test-secret-wolf-2026';
        let router;
        expect(() => {
            jest.isolateModules(() => {
                router = require('../../routes/adminMigrationRoutes');
            });
        }).not.toThrow();
        expect(router).toBeDefined();
    });
});
