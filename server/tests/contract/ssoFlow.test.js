/**
 * ssoFlow.test.js — Contract tests for Enterprise SSO / OIDC Authentication Flow
 * 
 * Part of Wolf HMS Phase 5 Hardening (W1).
 * Tests:
 * 1. Disabled-by-default behavior (404 when env vars unset)
 * 2. Login URL generation with PKCE & state creation
 * 3. Callback state mismatch rejection (400)
 * 4. Token exchange / nonce failure handling (400)
 * 5. Strict no-auto-provisioning policy enforcement (403 for unmapped email)
 * 6. Inactive account rejection (403)
 * 7. Happy-path authentication with JWT & refresh token issuance (200)
 */

const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test_jwt_secret_phase5_wolf_sso_32b';
process.env.JWT_ISSUER = 'wolf-hms';
process.env.JWT_AUDIENCE = 'wolf-hms-api';

// Mock DB pool
const mockQuery = jest.fn();
jest.mock('../../config/db', () => ({
    query: (...args) => mockQuery(...args)
}));

const oidcService = require('../../services/oidcService');
const ssoRoutes = require('../../routes/ssoRoutes');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth/sso', ssoRoutes);

describe('CONTRACT: Enterprise SSO / OIDC Flow (Phase 5 W1)', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        mockQuery.mockReset();
        oidcService.resetClient();
        delete process.env.OIDC_ISSUER_URL;
        delete process.env.OIDC_CLIENT_ID;
        delete process.env.OIDC_CLIENT_SECRET;
        delete process.env.OIDC_REDIRECT_URI;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('1. Disabled-by-default: returns 404 when OIDC environment variables are not configured', async () => {
        const loginRes = await request(app).get('/api/auth/sso/login');
        expect(loginRes.status).toBe(404);
        expect(loginRes.body.success).toBe(false);
        expect(loginRes.body.error).toMatch(/SSO not configured/i);

        const callbackRes = await request(app).get('/api/auth/sso/callback?code=abc&state=xyz');
        expect(callbackRes.status).toBe(404);
        expect(callbackRes.body.success).toBe(false);
        expect(callbackRes.body.error).toMatch(/SSO not configured/i);
    });

    describe('When OIDC is configured', () => {
        let mockOidcClient;

        beforeEach(() => {
            process.env.OIDC_ISSUER_URL = 'https://idp.hospital.org/v2.0';
            process.env.OIDC_CLIENT_ID = 'wolf-client-id';
            process.env.OIDC_CLIENT_SECRET = 'wolf-client-secret';
            process.env.OIDC_REDIRECT_URI = 'https://hms.hospital.org/api/auth/sso/callback';

            mockOidcClient = {
                authorizationUrl: jest.fn().mockImplementation((params) => {
                    return `https://idp.hospital.org/authorize?client_id=${params.client_id}&state=${params.state}&code_challenge=${params.code_challenge}`;
                }),
                callbackParams: jest.fn().mockImplementation((req) => ({
                    code: req.query.code,
                    state: req.query.state
                })),
                callback: jest.fn(),
                userinfo: jest.fn()
            };

            oidcService.setMockClient(mockOidcClient);
        });

        test('2. Login URL generation: initiates authorization code flow with PKCE', async () => {
            const res = await request(app)
                .get('/api/auth/sso/login?format=json')
                .set('Accept', 'application/json');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.url).toContain('https://idp.hospital.org/authorize');
            expect(res.body.state).toBeDefined();

            expect(mockOidcClient.authorizationUrl).toHaveBeenCalledTimes(1);
            const callArgs = mockOidcClient.authorizationUrl.mock.calls[0][0];
            expect(callArgs.code_challenge).toBeDefined();
            expect(callArgs.code_challenge_method).toBe('S256');
            expect(callArgs.state).toBeDefined();
            expect(callArgs.nonce).toBeDefined();
        });

        test('3. State mismatch: returns 400 when state parameter is missing or does not match stored state', async () => {
            // Missing state
            const noStateRes = await request(app)
                .get('/api/auth/sso/callback?code=mock_code');
            expect(noStateRes.status).toBe(400);
            expect(noStateRes.body.error).toMatch(/state.*missing/i);

            // Invalid / expired state
            const badStateRes = await request(app)
                .get('/api/auth/sso/callback?code=mock_code&state=non_existent_state_val');
            expect(badStateRes.status).toBe(400);
            expect(badStateRes.body.error).toMatch(/state mismatch/i);
        });

        test('4. Token exchange / nonce mismatch failure: returns 400 with error message', async () => {
            // First initiate login to register a valid state
            const loginRes = await request(app)
                .get('/api/auth/sso/login?format=json')
                .set('Accept', 'application/json');
            const validState = loginRes.body.state;

            // Mock token exchange failure
            mockOidcClient.callback.mockRejectedValueOnce(new Error('nonce mismatch or expired code'));

            const callbackRes = await request(app)
                .get(`/api/auth/sso/callback?code=bad_code&state=${validState}`);

            expect(callbackRes.status).toBe(400);
            expect(callbackRes.body.success).toBe(false);
            expect(callbackRes.body.error).toMatch(/Authentication failed: nonce mismatch or expired code/i);
        });

        test('5. Unmapped email: returns 403 Forbidden under strict no-auto-provisioning policy', async () => {
            // Initiate login
            const loginRes = await request(app)
                .get('/api/auth/sso/login?format=json')
                .set('Accept', 'application/json');
            const validState = loginRes.body.state;

            // Mock successful token exchange
            mockOidcClient.callback.mockResolvedValueOnce({
                claims: () => ({ email: 'unprovisioned.doctor@hospital.org' })
            });

            // Mock DB returning 0 rows (user not provisioned)
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const callbackRes = await request(app)
                .get(`/api/auth/sso/callback?code=valid_auth_code&state=${validState}`);

            expect(callbackRes.status).toBe(403);
            expect(callbackRes.body.success).toBe(false);
            expect(callbackRes.body.error).toBe('User not provisioned. Contact administrator.');

            // Verify query queried users by lower(email)
            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(mockQuery.mock.calls[0][1]).toEqual(['unprovisioned.doctor@hospital.org']);
        });

        test('6. Inactive account: returns 403 when user is found but is_active is false', async () => {
            const loginRes = await request(app)
                .get('/api/auth/sso/login?format=json')
                .set('Accept', 'application/json');
            const validState = loginRes.body.state;

            mockOidcClient.callback.mockResolvedValueOnce({
                claims: () => ({ email: 'suspended.doctor@hospital.org' })
            });

            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 99,
                    username: 'suspended_doc',
                    full_name: 'Dr. Suspended',
                    email: 'suspended.doctor@hospital.org',
                    role: 'doctor',
                    department: 'Cardiology',
                    hospital_id: 1,
                    is_active: false
                }]
            });

            const callbackRes = await request(app)
                .get(`/api/auth/sso/callback?code=valid_auth_code&state=${validState}`);

            expect(callbackRes.status).toBe(403);
            expect(callbackRes.body.error).toMatch(/Account is inactive or pending approval/i);
        });

        test('7. Happy path: issues standard 8h Wolf HMS JWT & rotating refresh token for provisioned user', async () => {
            const loginRes = await request(app)
                .get('/api/auth/sso/login?format=json')
                .set('Accept', 'application/json');
            const validState = loginRes.body.state;

            mockOidcClient.callback.mockResolvedValueOnce({
                claims: () => ({ email: 'dr.sharma@hospital.org' })
            });

            // Mock DB: user found and active
            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 42,
                    username: 'dr_sharma',
                    full_name: 'Dr. Rajesh Sharma',
                    email: 'dr.sharma@hospital.org',
                    role: 'doctor',
                    department: 'Oncology',
                    hospital_id: 1,
                    is_active: true,
                    security_question: 'mother_maiden_name'
                }]
            });

            // Mock DB: refresh_tokens insertion
            mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

            const callbackRes = await request(app)
                .get(`/api/auth/sso/callback?code=valid_auth_code&state=${validState}`);

            expect(callbackRes.status).toBe(200);
            expect(callbackRes.body.success).toBe(true);
            expect(callbackRes.body.message).toBe('SSO login successful');

            // Token verification
            const token = callbackRes.body.token;
            expect(token).toBeDefined();
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            expect(decoded.id).toBe(42);
            expect(decoded.username).toBe('dr_sharma');
            expect(decoded.role).toBe('doctor');
            expect(decoded.hospital_id).toBe(1);
            expect(decoded.iss).toBe('wolf-hms');
            expect(decoded.aud).toBe('wolf-hms-api');

            // Refresh token & user payload
            expect(callbackRes.body.refreshToken).toBeDefined();
            expect(callbackRes.body.user).toEqual({
                id: 42,
                username: 'dr_sharma',
                name: 'Dr. Rajesh Sharma',
                full_name: 'Dr. Rajesh Sharma',
                email: 'dr.sharma@hospital.org',
                role: 'doctor',
                department: 'Oncology',
                hospital_id: 1
            });
            expect(callbackRes.body.security_setup_required).toBe(false);
        });
    });
});
