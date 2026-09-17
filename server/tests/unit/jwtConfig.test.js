/**
 * jwtConfig.test.js — JWT Issuer, Audience, Expiration, and Compatibility Window Tests
 */

const jwt = require('jsonwebtoken');
const { protect } = require('../../middleware/authMiddleware');

describe('JWT Configuration & Claims (Phase 2)', () => {
    const TEST_SECRET = 'test_jwt_secret_32_characters_long_min!';
    const origEnv = process.env;

    beforeEach(() => {
        process.env = {
            ...origEnv,
            JWT_SECRET: TEST_SECRET,
            JWT_ISSUER: 'wolf-hms',
            JWT_AUDIENCE: 'wolf-hms-api'
        };
    });

    afterAll(() => {
        process.env = origEnv;
    });

    test('should successfully verify token signed with valid iss and aud', (done) => {
        const token = jwt.sign(
            { id: 14, role: 'security_guard', hospital_id: 1 },
            TEST_SECRET,
            { expiresIn: '8h', issuer: 'wolf-hms', audience: 'wolf-hms-api' }
        );

        const req = {
            headers: { authorization: `Bearer ${token}` },
            hospital_id: 1
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn(() => {
            expect(req.user.id).toBe(14);
            expect(req.user.iss).toBe('wolf-hms');
            expect(req.user.aud).toBe('wolf-hms-api');
            done();
        });

        protect(req, res, next);
    });

    test('should accept legacy token without iss and aud during compatibility window', (done) => {
        // Sign without iss/aud
        const legacyToken = jwt.sign(
            { id: 14, role: 'security_guard', hospital_id: 1 },
            TEST_SECRET,
            { expiresIn: '8h' }
        );

        const req = {
            headers: { authorization: `Bearer ${legacyToken}` },
            hospital_id: 1
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn(() => {
            expect(req.user.id).toBe(14);
            expect(req.user.iss).toBeUndefined();
            done();
        });

        protect(req, res, next);
    });

    test('should reject token with mismatched issuer', () => {
        const forgedToken = jwt.sign(
            { id: 99, role: 'attacker', hospital_id: 1 },
            TEST_SECRET,
            { expiresIn: '1h', issuer: 'evil-issuer', audience: 'wolf-hms-api' }
        );

        const req = {
            headers: { authorization: `Bearer ${forgedToken}` },
            hospital_id: 1
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        protect(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Not authorized, invalid token issuer'
        }));
    });

    test('should reject token with mismatched audience', () => {
        const forgedToken = jwt.sign(
            { id: 99, role: 'attacker', hospital_id: 1 },
            TEST_SECRET,
            { expiresIn: '1h', issuer: 'wolf-hms', audience: 'different-app' }
        );

        const req = {
            headers: { authorization: `Bearer ${forgedToken}` },
            hospital_id: 1
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        protect(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Not authorized, invalid token audience'
        }));
    });

    test('should fail-fast with 500 when JWT_SECRET is unset in environment', () => {
        delete process.env.JWT_SECRET;

        const req = {
            headers: { authorization: 'Bearer dummy.token.here' }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        protect(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Server misconfiguration'
        }));
    });
});
