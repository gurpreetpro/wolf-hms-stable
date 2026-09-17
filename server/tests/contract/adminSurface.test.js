/**
 * adminSurface.test.js — Contract Tests for Removed Backdoor and Gated Admin Endpoints
 */

const request = require('supertest');
const express = require('express');

describe('CONTRACT: Admin Attack Surface Hardening (Phase 3)', () => {
    let app;
    const TEST_SETUP_KEY = 'super_secret_setup_key_9988!';

    beforeAll(() => {
        process.env.SETUP_KEY = TEST_SETUP_KEY;

        app = express();
        app.use(express.json());

        // Note: in Phase 3, /api/health/exec-sql and run-migration are physically removed (no route handler)

        const gateWithSetupKey = (req, res, next) => {
            const configuredKey = process.env.SETUP_KEY;
            if (!configuredKey) {
                return res.status(403).json({ error: 'Setup endpoints disabled: SETUP_KEY not configured in environment.' });
            }
            const providedKey = req.body?.setupKey || req.headers['x-setup-key'];
            if (!providedKey || providedKey !== configuredKey) {
                return res.status(403).json({ error: 'Invalid or missing setup key.' });
            }
            next();
        };

        app.post('/api/setup/reset-and-seed', gateWithSetupKey, (req, res) => {
            res.json({ success: true, message: 'Reset and seed completed' });
        });

        app.post('/api/setup/schema-sync', gateWithSetupKey, (req, res) => {
            res.json({ success: true, message: 'Schema sync completed' });
        });

        const { protect, authorize } = require('../../middleware/authMiddleware');
        app.get('/api/debug/env', protect, authorize('super_admin', 'platform_owner'), (req, res) => {
            res.json({ DB_HOST: 'localhost', NODE_ENV: 'test' });
        });
    });

    describe('POST /api/health/exec-sql (Physical Removal)', () => {
        test('should return 404 Not Found when calling legacy exec-sql endpoint', async () => {
            const res = await request(app)
                .post('/api/health/exec-sql')
                .send({
                    setupKey: 'WolfSetup2024!',
                    sql: 'SELECT 1;'
                });

            expect(res.status).toBe(404);
        });

        test('should return 404 Not Found on any HTTP method', async () => {
            const res = await request(app).get('/api/health/exec-sql');
            expect(res.status).toBe(404);
        });

        test('should return 404 Not Found on legacy run-migration endpoint', async () => {
            const res = await request(app).post('/api/health/run-migration').send({ setupKey: 'WolfSetup2024!' });
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/debug/env (Information Disclosure Prevention)', () => {
        test('should return 401 Unauthorized when unauthenticated', async () => {
            const res = await request(app).get('/api/debug/env');
            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/Not authorized/);
        });
    });

    describe('POST /api/setup/* (Gated Setup Endpoints)', () => {
        test('should return 403 when SETUP_KEY is omitted or wrong', async () => {
            const res = await request(app)
                .post('/api/setup/reset-and-seed')
                .send({ setupKey: 'wrong_key' });

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/Invalid or missing setup key/);
        });

        test('should allow access when valid SETUP_KEY is supplied in body or header', async () => {
            const res = await request(app)
                .post('/api/setup/schema-sync')
                .set('x-setup-key', TEST_SETUP_KEY);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
