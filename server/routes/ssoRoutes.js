/**
 * ssoRoutes.js — Enterprise Single Sign-On (OIDC) Endpoints
 * 
 * Part of Wolf HMS Phase 5 Hardening (W1).
 * Supports standard OIDC authorization code flow with PKCE (RFC 7636).
 * Lazy-loaded and disabled unless OIDC environment variables are explicitly configured.
 * Enforces NO auto-provisioning policy: unmapped enterprise users receive 403.
 */

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const oidcService = require('../services/oidcService');

const router = express.Router();

// Ephemeral in-memory state store with 10-minute TTL for PKCE validation
const stateStore = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

// Periodic cleanup of expired states
setInterval(() => {
    const now = Date.now();
    for (const [stateKey, entry] of stateStore.entries()) {
        if (now - entry.createdAt > STATE_TTL_MS) {
            stateStore.delete(stateKey);
        }
    }
}, 60 * 1000).unref();

/**
 * GET /api/auth/sso/login
 * Initiates OIDC Authorization Code Flow with PKCE.
 */
router.get('/login', async (req, res) => {
    try {
        if (!oidcService.isConfigured()) {
            return res.status(404).json({
                success: false,
                error: 'SSO not configured'
            });
        }

        const client = await oidcService.getClient();
        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'SSO client unavailable'
            });
        }

        const code_verifier = oidcService.generators.codeVerifier();
        const code_challenge = oidcService.generators.codeChallenge(code_verifier);
        const state = oidcService.generators.state();
        const nonce = oidcService.generators.nonce();

        // Store PKCE context
        stateStore.set(state, {
            code_verifier,
            state,
            nonce,
            createdAt: Date.now()
        });

        // Also set a secure HTTP-only cookie for browser-driven callbacks
        const isProduction = process.env.NODE_ENV === 'production';
        if (res.cookie) {
            res.cookie('sso_pkce', JSON.stringify({ state, code_verifier, nonce }), {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'Lax',
                maxAge: STATE_TTL_MS
            });
        }

        const redirectUri = process.env.OIDC_REDIRECT_URI;
        const authUrl = client.authorizationUrl({
            redirect_uri: redirectUri,
            scope: 'openid email profile',
            code_challenge,
            code_challenge_method: 'S256',
            state,
            nonce
        });

        // If JSON format is requested or client is an API caller, return JSON
        if (
            req.query.format === 'json' ||
            req.xhr ||
            (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html'))
        ) {
            return res.json({
                success: true,
                url: authUrl,
                state
            });
        }

        return res.redirect(authUrl);
    } catch (err) {
        console.error('[SSO] Login initiation error:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to initiate SSO authentication: ' + err.message
        });
    }
});

/**
 * GET /api/auth/sso/callback
 * Handles IdP authorization code callback, exchanges for tokens, and validates user.
 */
router.get('/callback', async (req, res) => {
    try {
        if (!oidcService.isConfigured()) {
            return res.status(404).json({
                success: false,
                error: 'SSO not configured'
            });
        }

        if (req.query.error) {
            return res.status(400).json({
                success: false,
                error: req.query.error_description || req.query.error
            });
        }

        const stateParam = req.query.state;
        if (!stateParam) {
            return res.status(400).json({
                success: false,
                error: 'State parameter missing'
            });
        }

        // Retrieve PKCE context from memory store or cookie
        let pkceContext = stateStore.get(stateParam);
        if (!pkceContext && req.cookies && req.cookies.sso_pkce) {
            try {
                const parsed = JSON.parse(req.cookies.sso_pkce);
                if (parsed.state === stateParam) {
                    pkceContext = parsed;
                }
            } catch (e) {
                // Ignore cookie parse error
            }
        }

        if (!pkceContext || pkceContext.state !== stateParam) {
            return res.status(400).json({
                success: false,
                error: 'State mismatch or session expired'
            });
        }

        // Clean up state
        stateStore.delete(stateParam);
        if (res.clearCookie) {
            res.clearCookie('sso_pkce');
        }

        const client = await oidcService.getClient();
        const redirectUri = process.env.OIDC_REDIRECT_URI;
        const params = client.callbackParams(req);

        let tokenSet;
        try {
            tokenSet = await client.callback(redirectUri, params, {
                code_verifier: pkceContext.code_verifier,
                state: pkceContext.state,
                nonce: pkceContext.nonce
            });
        } catch (exchangeErr) {
            console.error('[SSO] Token exchange error:', exchangeErr.message);
            return res.status(400).json({
                success: false,
                error: 'Authentication failed: ' + exchangeErr.message
            });
        }

        // Extract claims / email
        let email = null;
        if (tokenSet.claims && typeof tokenSet.claims === 'function') {
            const claims = tokenSet.claims();
            email = claims.email;
        }

        if (!email && typeof client.userinfo === 'function') {
            try {
                const userinfo = await client.userinfo(tokenSet);
                email = userinfo.email;
            } catch (uiErr) {
                console.warn('[SSO] UserInfo lookup warning:', uiErr.message);
            }
        }

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'No email found in SSO token claims'
            });
        }

        // Query user in Wolf HMS database (No auto-provisioning policy)
        const userRes = await pool.query(
            `SELECT id, username, full_name, email, role, department, hospital_id, is_active, security_question
             FROM users
             WHERE LOWER(email) = LOWER($1)`,
            [email]
        );

        if (userRes.rows.length === 0) {
            console.warn(`[SSO] Unprovisioned email attempt: ${email}`);
            return res.status(403).json({
                success: false,
                error: 'User not provisioned. Contact administrator.'
            });
        }

        const user = userRes.rows[0];

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                error: 'Account is inactive or pending approval.'
            });
        }

        // Issue standard Wolf HMS JWT
        const tokenExpiry = process.env.JWT_EXPIRES || '8h';
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                username: user.username,
                email: user.email,
                hospital_id: user.hospital_id || 1
            },
            process.env.JWT_SECRET || 'wolf-hms-test-jwt-secret-key-32b!',
            {
                expiresIn: tokenExpiry,
                issuer: process.env.JWT_ISSUER || 'wolf-hms',
                audience: process.env.JWT_AUDIENCE || 'wolf-hms-api'
            }
        );

        // Issue rotating refresh token
        let rawRefreshToken = null;
        try {
            rawRefreshToken = crypto.randomBytes(40).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await pool.query(
                `INSERT INTO refresh_tokens (token_hash, user_id, device, expires_at) VALUES ($1, $2, $3, $4)`,
                [tokenHash, user.id, 'sso_web', expiresAt]
            );

            const isProduction = process.env.NODE_ENV === 'production';
            if (res.cookie) {
                res.cookie('refreshToken', rawRefreshToken, {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: isProduction ? 'None' : 'Lax',
                    maxAge: 30 * 24 * 60 * 60 * 1000
                });
            }
        } catch (rtErr) {
            console.error('[SSO] Refresh token generation error:', rtErr.message);
        }

        const responseData = {
            token,
            refreshToken: rawRefreshToken,
            user: {
                id: user.id,
                username: user.username,
                name: user.full_name || user.username,
                full_name: user.full_name || user.username,
                email: user.email,
                role: user.role,
                department: user.department,
                hospital_id: user.hospital_id || 1
            },
            security_setup_required: !user.security_question
        };

        return res.status(200).json({
            success: true,
            message: 'SSO login successful',
            data: responseData,
            ...responseData
        });
    } catch (err) {
        console.error('[SSO] Callback processing error:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to process SSO callback: ' + err.message
        });
    }
});

module.exports = router;
