/**
 * sentryGate.test.js — Unit & Gate Tests for Sentry Error Pipeline
 * 
 * Part of Wolf HMS Phase 6 Hardening (W3).
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test_jwt_secret_phase6_sentry';
process.env.JWT_ISSUER = 'wolf-hms';
process.env.JWT_AUDIENCE = 'wolf-hms-api';

const setupRoutes = require('../../routes/setupRoutes');

const app = express();
app.use(express.json());
app.use('/api', setupRoutes.router || setupRoutes);

// Error handler for Express test harness
app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
});

describe('UNIT: Sentry Error Pipeline & Gate Protection (Phase 6 W3)', () => {
    const originalEnv = { ...process.env };

    const superAdminToken = jwt.sign(
        { id: 1, role: 'super_admin', username: 'superadmin_test', hospital_id: null },
        process.env.JWT_SECRET,
        { expiresIn: '1h', issuer: 'wolf-hms', audience: 'wolf-hms-api' }
    );

    const doctorToken = jwt.sign(
        { id: 2, role: 'doctor', username: 'doctor_test', hospital_id: 1 },
        process.env.JWT_SECRET,
        { expiresIn: '1h', issuer: 'wolf-hms', audience: 'wolf-hms-api' }
    );

    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        delete process.env.SENTRY_DSN;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('1. Unauthenticated request: returns 401 Unauthorized', async () => {
        const res = await request(app).get('/api/debug/sentry-trigger');
        expect(res.status).toBe(401);
    });

    test('2. Unauthorized role: returns 403 Forbidden for non-super_admin users', async () => {
        const res = await request(app)
            .get('/api/debug/sentry-trigger')
            .set('Authorization', `Bearer ${doctorToken}`);

        expect(res.status).toBe(403);
    });

    test('3. Production safety gate: returns 403 Forbidden when NODE_ENV is production', async () => {
        process.env.NODE_ENV = 'production';

        const res = await request(app)
            .get('/api/debug/sentry-trigger')
            .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/disabled in production/i);
    });

    test('4. No-DSN execution path: executes safely and propagates error without crashing process', async () => {
        delete process.env.SENTRY_DSN;
        process.env.NODE_ENV = 'test';

        const res = await request(app)
            .get('/api/debug/sentry-trigger')
            .set('Authorization', `Bearer ${superAdminToken}`);

        // Error handler catches thrown test error and returns 500
        expect(res.status).toBe(500);
        expect(res.body.error).toContain('Wolf HMS Test Sentry Error');
    });
});
