/**
 * metrics.test.js — Contract tests for Prometheus Metrics Scraping Endpoint
 * 
 * Part of Wolf HMS Phase 6 Hardening (W1).
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test_jwt_secret_phase6_metrics';
process.env.JWT_ISSUER = 'wolf-hms';
process.env.JWT_AUDIENCE = 'wolf-hms-api';

const MetricsCollector = require('../../services/MetricsCollector');
const { metricsMiddleware } = require('../../middleware/metricsMiddleware');
const systemRoutes = require('../../routes/systemRoutes');

const app = express();
app.use(express.json());
// Mount metrics middleware to capture request telemetry
app.use(metricsMiddleware);

// Mount sample test routes
app.get('/api/test/sample-endpoint', (req, res) => {
    res.json({ message: 'sample success' });
});
app.get('/api/test/sample-error', (req, res) => {
    res.status(500).json({ error: 'sample failure' });
});

// Mount system routes
app.use('/api', systemRoutes);

describe('CONTRACT: Prometheus Metrics Scraping (Phase 6 W1)', () => {
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
        const res = await request(app).get('/api/metrics');
        expect(res.status).toBe(401);
    });

    test('2. Unauthorized role: returns 403 Forbidden for non-admin roles', async () => {
        const res = await request(app)
            .get('/api/metrics')
            .set('Authorization', `Bearer ${doctorToken}`);
        expect(res.status).toBe(403);
    });

    test('3. Authorized request: returns 200 with Prometheus text/plain content type', async () => {
        const res = await request(app)
            .get('/api/metrics')
            .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/plain/);
        expect(res.text).toContain('# HELP');
        expect(res.text).toContain('# TYPE');
    });

    test('4. Request instrumentation: captures request and emits http_requests_total in metrics text', async () => {
        // Execute an instrumented request
        const sampleRes = await request(app).get('/api/test/sample-endpoint');
        expect(sampleRes.status).toBe(200);

        // Fetch metrics output
        const metricsRes = await request(app)
            .get('/api/metrics')
            .set('Authorization', `Bearer ${superAdminToken}`);

        expect(metricsRes.status).toBe(200);
        expect(metricsRes.text).toContain('http_requests_total');
        expect(metricsRes.text).toMatch(/http_requests_total\{.*method="GET".*route="\/api\/test\/sample-endpoint".*status="200"\} 1/);
        expect(metricsRes.text).toContain('http_request_duration_ms_bucket');
    });

    test('5. Error request instrumentation: captures failure status codes', async () => {
        // Execute an error request
        const errRes = await request(app).get('/api/test/sample-error');
        expect(errRes.status).toBe(500);

        const metricsRes = await request(app)
            .get('/api/metrics')
            .set('Authorization', `Bearer ${superAdminToken}`);

        expect(metricsRes.status).toBe(200);
        expect(metricsRes.text).toMatch(/http_requests_total\{.*method="GET".*route="\/api\/test\/sample-error".*status="500"\} 1/);
    });
});
