/**
 * Contract tests for Dashboard.jsx data sources
 * Verifies payload contracts for:
 * - GET /api/opd/queue (active OPD queue status items)
 * - GET /api/admissions/active (active IPD admissions)
 * - GET /api/emergency/status (active emergency count source)
 */
const express = require('express');
const request = require('supertest');

// 1. Mock DB pool
const mockQuery = jest.fn();
jest.mock('../../db', () => ({
    pool: {
        query: (...args) => mockQuery(...args)
    }
}));
jest.mock('../../config/db', () => ({
    query: (...args) => mockQuery(...args)
}));

// 2. Mock authMiddleware to allow contract testing
jest.mock('../../middleware/authMiddleware', () => ({
    protect: (req, res, next) => {
        req.user = req.user || { id: 1, username: 'admin', role: 'admin', hospital_id: 1 };
        req.hospital_id = 1;
        next();
    },
    authenticateToken: (req, res, next) => {
        req.user = req.user || { id: 1, username: 'admin', role: 'admin', hospital_id: 1 };
        req.hospital_id = 1;
        next();
    },
    authorize: () => (req, res, next) => next()
}));

const opdRoutes = require('../../routes/opdRoutes');
const admissionRoutes = require('../../routes/admissionRoutes');
const emergencyRoutes = require('../../routes/emergencyRoutes');

const app = express();
app.use(express.json());
app.use('/api/opd', opdRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/emergency', emergencyRoutes);

describe('CONTRACT: Dashboard.jsx Data Endpoints', () => {

    beforeEach(() => {
        mockQuery.mockReset();
    });

    describe('GET /api/opd/queue', () => {
        it('should return array of queue entries with status fields', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    { id: 1, patient_name: 'Patient One', token_number: 101, status: 'waiting' },
                    { id: 2, patient_name: 'Patient Two', token_number: 102, status: 'checked_in' },
                    { id: 3, patient_name: 'Patient Three', token_number: 103, status: 'completed' }
                ]
            });

            const res = await request(app).get('/api/opd/queue');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data).toHaveLength(3);
            expect(res.body.data[0]).toHaveProperty('status');
        });
    });

    describe('GET /api/admissions/active', () => {
        it('should return active admitted patients list', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    { id: 'uuid-adm-1', patient_name: 'Alice', ward: 'ICU', bed_number: 'B-01' },
                    { id: 'uuid-adm-2', patient_name: 'Bob', ward: 'General', bed_number: 'G-12' }
                ]
            });

            const res = await request(app).get('/api/admissions/active');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.data[0]).toHaveProperty('ward');
        });
    });

    describe('GET /api/emergency/status', () => {
        it('should return active emergencies', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    { id: 10, code: 'Blue', status: 'Active', location: 'ICU Bed 2' }
                ]
            });

            const res = await request(app).get('/api/emergency/status');

            expect(res.status).toBe(200);
            expect(res.body).toBeDefined();
            expect(res.body.success).toBe(true);
        });
    });
});
