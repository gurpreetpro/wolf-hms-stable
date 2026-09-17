/**
 * Contract test for POST /api/emergency/trigger
 * Verifies payload parsing priority: code > type > emergencyType > default 'Blue'
 * Regression lock for historical payload mismatch bug.
 */
const express = require('express');
const request = require('supertest');

// 1. Mock DB pool before requiring routes
const mockQuery = jest.fn();
jest.mock('../../db', () => ({
    pool: {
        query: (...args) => mockQuery(...args)
    }
}));

// Mock BillingInterceptor to avoid side-effects
jest.mock('../../services/BillingInterceptor', () => ({
    captureCharge: jest.fn().mockResolvedValue(true),
    SOURCE_MODULES: { EMERGENCY: 'EMERGENCY' }
}));

// Mock authMiddleware to allow contract testing without JWT verification
jest.mock('../../middleware/authMiddleware', () => ({
    protect: (req, res, next) => {
        req.user = req.user || { id: 1, username: 'test_doctor', role: 'doctor' };
        req.hospital_id = req.hospital_id || 1;
        next();
    },
    authorize: () => (req, res, next) => next()
}));

// 2. Setup Express app with auth bypassed
const emergencyRoutes = require('../../routes/emergencyRoutes');

const app = express();
app.use(express.json());
// Inject test user and hospital context
app.use((req, res, next) => {
    req.user = { id: 1, username: 'test_doctor', role: 'doctor' };
    req.hospital_id = 1;
    next();
});
app.use('/api/emergency', emergencyRoutes);

describe('CONTRACT: POST /api/emergency/trigger', () => {

    beforeEach(() => {
        mockQuery.mockReset();
        // Default DB mock response for emergency_logs INSERT RETURNING
        mockQuery.mockImplementation((sql, params) => {
            return Promise.resolve({
                rows: [{
                    id: 999,
                    code: params && params[0] ? params[0] : 'Blue',
                    location: params && params[1] ? params[1] : 'Ward A',
                    status: 'Active',
                    triggered_at: new Date().toISOString()
                }]
            });
        });
    });

    it('Priority 1: should accept req.body.code ("Red") and store as Red', async () => {
        const res = await request(app)
            .post('/api/emergency/trigger')
            .send({ code: 'Red', location: 'OT-1' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.code).toBe('Red');
        expect(res.body.data.emergency_type).toBe('CODE_RED');

        // Verify DB was called with 'Red'
        expect(mockQuery).toHaveBeenCalled();
        const insertCall = mockQuery.mock.calls.find(call => typeof call[0] === 'string' && call[0].includes('INSERT INTO emergency_logs'));
        expect(insertCall).toBeDefined();
        expect(insertCall[1][0]).toBe('Red');
    });

    it('Priority 2: should fall back to req.body.type ("CODE_BLUE") when code is omitted', async () => {
        const res = await request(app)
            .post('/api/emergency/trigger')
            .send({ type: 'CODE_BLUE', location: 'ICU Bed 3' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.code).toBe('Blue');
        expect(res.body.data.emergency_type).toBe('CODE_BLUE');
    });

    it('Priority 3: should fall back to req.body.emergencyType ("CODE_YELLOW") when code & type omitted', async () => {
        const res = await request(app)
            .post('/api/emergency/trigger')
            .send({ emergencyType: 'CODE_YELLOW', location: 'ER Triage' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.code).toBe('Yellow');
        expect(res.body.data.emergency_type).toBe('CODE_YELLOW');
    });

    it('Default: should default to "Blue" when no code/type specified', async () => {
        const res = await request(app)
            .post('/api/emergency/trigger')
            .send({ location: 'General Ward' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.code).toBe('Blue');
        expect(res.body.data.emergency_type).toBe('CODE_BLUE');
    });
});
