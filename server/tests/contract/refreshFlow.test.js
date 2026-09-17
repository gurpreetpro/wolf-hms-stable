/**
 * refreshFlow.test.js — Contract tests for Refresh Token Lifecycle, Rotation & Reuse Detection
 * 
 * Part of Wolf HMS Phase 3 Hardening.
 */

const express = require('express');
const request = require('supertest');
const crypto = require('crypto');

process.env.JWT_SECRET = 'test_jwt_secret_phase3_wolf_hms';
process.env.JWT_ISSUER = 'wolf-hms';
process.env.JWT_AUDIENCE = 'wolf-hms-api';

// 1. Mock DB pool & transaction client
const mockClient = {
    query: jest.fn().mockResolvedValue({ rowCount: 1, rows: [] }),
    release: jest.fn()
};

const mockQuery = jest.fn();
jest.mock('../../config/db', () => ({
    query: (...args) => mockQuery(...args),
    connect: jest.fn().mockResolvedValue(mockClient)
}));

jest.mock('../../db', () => ({
    pool: {
        query: (...args) => mockQuery(...args),
        connect: jest.fn().mockResolvedValue(mockClient)
    }
}));

const authRoutes = require('../../routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('CONTRACT: Refresh Token Flow & Security (Phase 3)', () => {
    const rawToken = 'test_raw_refresh_token_1234567890abcdef';
    const rawTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const familyId = '11111111-2222-3333-4444-555555555555';

    beforeEach(() => {
        mockQuery.mockReset();
        mockClient.query.mockReset();
        mockClient.release.mockReset();
        mockClient.query.mockResolvedValue({ rowCount: 1, rows: [] });
    });

    test('1. Happy-path rotation: valid refresh token issues new access token & new refresh token', async () => {
        // Mock token lookup in DB: valid, active, non-revoked token
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: 1,
                user_id: 10,
                token_hash: rawTokenHash,
                device: 'web',
                family_id: familyId,
                expires_at: new Date(Date.now() + 86400000), // tomorrow
                revoked_at: null,
                username: 'dr_sharma',
                email: 'sharma@wolf.test',
                role: 'doctor',
                hospital_id: 1,
                full_name: 'Dr. Sharma',
                department: 'Cardiology',
                is_active: true
            }]
        });

        const res = await request(app)
            .post('/api/auth/token/refresh')
            .send({ refreshToken: rawToken });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
        expect(res.body.refreshToken).not.toBe(rawToken); // New token rotated

        // Transaction verified: old revoked, new inserted with same family_id
        expect(mockClient.query).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1'),
            [1]
        );
        expect(mockClient.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO refresh_tokens'),
            expect.arrayContaining([10, 'web', familyId])
        );
    });

    test('2. Missing refresh token in request body returns 401', async () => {
        const res = await request(app)
            .post('/api/auth/token/refresh')
            .send({});

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Refresh token required/i);
    });

    test('3. Non-existent refresh token returns 401', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .post('/api/auth/token/refresh')
            .send({ refreshToken: 'non_existent_token' });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Invalid refresh token/i);
    });

    test('4. Expired refresh token returns 401', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: 2,
                user_id: 10,
                token_hash: rawTokenHash,
                family_id: familyId,
                expires_at: new Date(Date.now() - 86400000), // yesterday
                revoked_at: null,
                username: 'dr_sharma',
                is_active: true
            }]
        });

        const res = await request(app)
            .post('/api/auth/token/refresh')
            .send({ refreshToken: rawToken });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Refresh token expired/i);
    });

    test('5. Reuse detection: presenting an already-revoked token revokes entire token family', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: 3,
                user_id: 10,
                token_hash: rawTokenHash,
                family_id: familyId,
                expires_at: new Date(Date.now() + 86400000),
                revoked_at: new Date(Date.now() - 60000), // revoked 1 min ago!
                username: 'dr_sharma',
                is_active: true
            }]
        });

        const res = await request(app)
            .post('/api/auth/token/refresh')
            .send({ refreshToken: rawToken });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Token reuse detected/i);

        // Entire family revoked
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1'),
            [familyId]
        );
    });

    test('6. POST /api/auth/logout revokes refresh token in database', async () => {
        mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

        const res = await request(app)
            .post('/api/auth/logout')
            .send({ refreshToken: rawToken });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/Logged out successfully/i);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1'),
            [rawTokenHash]
        );
    });
});
