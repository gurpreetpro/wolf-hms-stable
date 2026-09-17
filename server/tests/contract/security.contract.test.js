/**
 * Contract test for Wolf Guard security endpoints
 * Verifies payload parsing and response status for:
 * - POST /api/security/location
 * - POST /api/security/sos
 * - POST /api/security/patrols/start
 * - PUT  /api/security/patrols/:patrolId/end
 */
const express = require('express');
const request = require('supertest');

// 1. Mock DB pool before requiring routes
const mockQuery = jest.fn();
jest.mock('../../config/db', () => ({
    query: (...args) => mockQuery(...args)
}));
jest.mock('../../db', () => ({
    pool: {
        query: (...args) => mockQuery(...args)
    }
}));

// 2. Mock authMiddleware
jest.mock('../../middleware/authMiddleware', () => ({
    authenticateToken: (req, res, next) => {
        req.user = req.user || { id: 14, username: 'guard_kumar', role: 'security_guard', hospital_id: 1 };
        req.hospital_id = 1;
        next();
    },
    protect: (req, res, next) => {
        req.user = req.user || { id: 14, username: 'guard_kumar', role: 'security_guard', hospital_id: 1 };
        req.hospital_id = 1;
        next();
    },
    authorize: () => (req, res, next) => next()
}));

const securityRoutes = require('../../routes/securityRoutes');

const app = express();
app.use(express.json());
app.use('/api/security', securityRoutes);

describe('CONTRACT: Wolf Guard Security Endpoints', () => {

    beforeEach(() => {
        mockQuery.mockReset();
    });

    describe('POST /api/security/location', () => {
        it('should accept telemetry and insert into guard_locations', async () => {
            mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

            const telemetry = {
                latitude: 30.8044,
                longitude: 75.4724,
                accuracy: 12.5,
                heading: 180.0,
                speed: 1.2,
                batteryLevel: 85,
                signalStrength: -70,
                floor_number: 1,
                altitude: 3.2
            };

            const res = await request(app)
                .post('/api/security/location')
                .send(telemetry);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockQuery).toHaveBeenCalled();
            const insertCall = mockQuery.mock.calls.find(call => 
                typeof call[0] === 'string' && call[0].includes('INSERT INTO guard_locations')
            );
            expect(insertCall).toBeDefined();
            expect(insertCall[1][0]).toBe(14); // guard_id
            expect(insertCall[1][1]).toBe(30.8044); // lat
            expect(insertCall[1][2]).toBe(75.4724); // lng
        });

        it('should reject location updates with missing lat/lng (400)', async () => {
            const res = await request(app)
                .post('/api/security/location')
                .send({ heading: 90 });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('latitude and longitude are required');
        });
    });

    describe('POST /api/security/sos', () => {
        it('should trigger emergency SOS and return incident record', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 501,
                    reporter_id: 14,
                    title: 'SOS ALERT',
                    type: 'SOS',
                    severity: 'Critical',
                    location: '30.8044,75.4724',
                    status: 'Open'
                }]
            });

            const res = await request(app)
                .post('/api/security/sos')
                .send({ latitude: 30.8044, longitude: 75.4724, heading: 45 });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.type).toBe('SOS');
            expect(res.body.data.severity).toBe('Critical');
        });
    });

    describe('POST /api/security/patrols/start & PUT /patrols/:id/end', () => {
        it('should start a new patrol shift', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 77,
                    guard_id: 14,
                    route_name: 'Perimeter West',
                    status: 'In Progress'
                }]
            });

            const res = await request(app)
                .post('/api/security/patrols/start')
                .send({ route_name: 'Perimeter West' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('In Progress');
        });

        it('should end an active patrol shift', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 77,
                    guard_id: 14,
                    status: 'Completed',
                    notes: 'Shift all clear'
                }]
            });

            const res = await request(app)
                .put('/api/security/patrols/77/end')
                .send({ notes: 'Shift all clear' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('Completed');
        });
    });
});
