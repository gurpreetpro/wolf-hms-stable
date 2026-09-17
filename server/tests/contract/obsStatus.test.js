/**
 * obsStatus.test.js — Contract tests for Aggregate Observability Status Endpoint (/api/health/obs)
 * 
 * Part of Wolf HMS Phase 6 Hardening (W4).
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test_jwt_secret_phase6_obs';
process.env.JWT_ISSUER = 'wolf-hms';
process.env.JWT_AUDIENCE = 'wolf-hms-api';

const MetricsCollector = require('../../services/MetricsCollector');
const { metricsMiddleware } = require('../../middleware/metricsMiddleware');
const systemRoutes = require('../../routes/systemRoutes');

const app = express();
app.use(express.json());

// Mock Socket.IO instance on request
app.use((req, res, next) => {
    req.io = {
        engine: { clientsCount: 12 },
        sockets: { sockets: { size: 12 } }
    };
    next();
});

// Mount metrics middleware to track test requests
app.use(metricsMiddleware);

// Mount dummy route to exercise metrics
app.get('/api/test/obs-exercise', (req, res) => {
    res.json({ ok: true });
});
app.get('/api/test/obs-error', (req, res) => {
    res.status(500).json({ error: 'fail' });
});

app.use('/api', systemRoutes);

describe('CONTRACT: Aggregate Observability Status Endpoint (Phase 6 W4)', () => {
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
        MetricsCollector.reset();
    });

    test('1. Unauthenticated request: returns 401 Unauthorized', async () => {
        const res = await request(app).get('/api/health/obs');
        expect(res.status).toBe(401);
    });

    test('2. Unauthorized role: returns 403 Forbidden for non-admin roles', async () => {
        const res = await request(app)
            .get('/api/health/obs')
            .set('Authorization', `Bearer ${doctorToken}`);

        expect(res.status).toBe(403);
    });

    test('3. Authorized request: returns 200 with required observability keys', async () => {
        const res = await request(app)
            .get('/api/health/obs')
            .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        expect(typeof res.body.uptimeSeconds).toBe('number');
        expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);

        expect(res.body.requests).toBeDefined();
        expect(typeof res.body.requests.total).toBe('number');
        expect(typeof res.body.requests.success).toBe('number');
        expect(typeof res.body.requests.error).toBe('number');

        expect(typeof res.body.errorRateWindow).toBe('number');
        expect(typeof res.body.activeSockets).toBe('number');
        expect(res.body.activeSockets).toBe(12);

        expect(res.body.dbPool).toBeDefined();
        expect(typeof res.body.dbPool.totalCount).toBe('number');
        expect(typeof res.body.dbPool.idleCount).toBe('number');
        expect(typeof res.body.dbPool.waitingCount).toBe('number');
    });

    test('4. Accuracy check: reflects executed requests and calculated error rates', async () => {
        // Run 3 successful requests and 1 error request
        await request(app).get('/api/test/obs-exercise');
        await request(app).get('/api/test/obs-exercise');
        await request(app).get('/api/test/obs-exercise');
        await request(app).get('/api/test/obs-error');

        const res = await request(app)
            .get('/api/health/obs')
            .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        // At least 4 test requests recorded (+ the GET /api/health/obs request itself)
        expect(res.body.requests.total).toBeGreaterThanOrEqual(4);
        expect(res.body.requests.error).toBe(1);
        expect(res.body.errorRateWindow).toBeGreaterThan(0);
    });
});
