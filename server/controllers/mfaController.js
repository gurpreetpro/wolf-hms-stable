const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const pool = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const ResponseHandler = require('../utils/responseHandler');
const { PLATFORM_CONFIG } = require('../config/platformOwners');

/**
 * MFA Controller - TOTP-based Multi-Factor Authentication
 * 
 * Uses speakeasy for TOTP generation/verification
 * Compatible with Google Authenticator, Authy, Microsoft Authenticator
 */

// Generate MFA Secret for a User
const generateMfaSecret = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userEmail = req.user.email || req.user.username;

    // Generate new secret
    const secret = speakeasy.generateSecret({
        name: `${PLATFORM_CONFIG.MFA.ISSUER}:${userEmail}`,
        issuer: PLATFORM_CONFIG.MFA.ISSUER,
        length: 20
    });

    // Store secret temporarily (user must verify before it's active)
    await pool.query(
        `UPDATE users SET 
            mfa_secret_temp = $1, 
            mfa_updated_at = NOW() 
         WHERE id = $2`,
        [secret.base32, userId]
    );

    // Generate QR Code as Data URL
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    ResponseHandler.success(res, {
        secret: secret.base32,          // For manual entry
        qrCode: qrCodeDataUrl,          // For scanning
        otpauth_url: secret.otpauth_url // For advanced users
    }, 'MFA Secret Generated - Scan QR Code with Google Authenticator');
});

// Verify and Enable MFA
const verifyAndEnableMfa = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
        return ResponseHandler.error(res, 'TOTP token is required', 400);
    }

    // Get the temporary secret
    const userRes = await pool.query(
        'SELECT mfa_secret_temp FROM users WHERE id = $1',
        [userId]
    );

    if (!userRes.rows.length || !userRes.rows[0].mfa_secret_temp) {
        return ResponseHandler.error(res, 'No MFA setup in progress. Generate a secret first.', 400);
    }

    const tempSecret = userRes.rows[0].mfa_secret_temp;

    // Verify the token
    const verified = speakeasy.totp.verify({
        secret: tempSecret,
        encoding: 'base32',
        token: token,
        window: PLATFORM_CONFIG.MFA.WINDOW
    });

    if (!verified) {
        return ResponseHandler.error(res, 'Invalid TOTP code. Please try again.', 401);
    }

    // Move temp secret to active and enable MFA
    await pool.query(
        `UPDATE users SET 
            mfa_secret = mfa_secret_temp, 
            mfa_secret_temp = NULL,
            mfa_enabled = TRUE,
            mfa_verified_at = NOW()
         WHERE id = $1`,
        [userId]
    );

    ResponseHandler.success(res, { enabled: true }, 'MFA Enabled Successfully');
});

// Verify MFA Token (Called during login)
const verifyMfaToken = asyncHandler(async (req, res) => {
    const { user_id, token, bypass_code } = req.body;

    if (!user_id) {
        return ResponseHandler.error(res, 'User ID is required', 400);
    }

    // Get user's MFA secret
    const userRes = await pool.query(
        'SELECT mfa_secret, mfa_enabled, email FROM users WHERE id = $1',
        [user_id]
    );

    if (!userRes.rows.length) {
        return ResponseHandler.error(res, 'User not found', 404);
    }

    const user = userRes.rows[0];

    if (!user.mfa_enabled || !user.mfa_secret) {
        // MFA not enabled - this shouldn't happen if MFA is required
        return ResponseHandler.success(res, { verified: true, mfa_required: false });
    }

    // Check for bypass code first
    if (bypass_code) {
        const isValidBypass = PLATFORM_CONFIG.BYPASS_CODES.includes(bypass_code);
        if (isValidBypass) {
            // Log bypass code usage (security audit)
            console.log(`[SECURITY AUDIT] Bypass code used for user ${user.email}`);
            
            // TODO: Invalidate used bypass code in production
            return ResponseHandler.success(res, { 
                verified: true, 
                method: 'bypass_code',
                warning: 'Bypass code used. Generate new codes if this was your last one.'
            });
        } else {
            return ResponseHandler.error(res, 'Invalid bypass code', 401);
        }
    }

    // Verify TOTP token
    if (!token) {
        return ResponseHandler.error(res, 'TOTP token is required', 400);
    }

    const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: token,
        window: PLATFORM_CONFIG.MFA.WINDOW
    });

    if (!verified) {
        // Log failed attempt
        console.log(`[SECURITY] Failed MFA attempt for user ${user.email}`);
        return ResponseHandler.error(res, 'Invalid TOTP code', 401);
    }

    ResponseHandler.success(res, { verified: true, method: 'totp' });
});

// Check MFA Status for Current User
const getMfaStatus = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const userRes = await pool.query(
        'SELECT mfa_enabled, mfa_verified_at FROM users WHERE id = $1',
        [userId]
    );

    if (!userRes.rows.length) {
        return ResponseHandler.error(res, 'User not found', 404);
    }

    const user = userRes.rows[0];

    ResponseHandler.success(res, {
        mfa_enabled: user.mfa_enabled || false,
        mfa_verified_at: user.mfa_verified_at || null
    });
});

// Disable MFA (requires current TOTP or bypass code)
const disableMfa = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { token, bypass_code } = req.body;

    // Get user's MFA secret
    const userRes = await pool.query(
        'SELECT mfa_secret, email FROM users WHERE id = $1',
        [userId]
    );

    const user = userRes.rows[0];

    // Verify identity before disabling
    let verified = false;

    if (bypass_code && PLATFORM_CONFIG.BYPASS_CODES.includes(bypass_code)) {
        verified = true;
        console.log(`[SECURITY AUDIT] MFA disabled via bypass code for ${user.email}`);
    } else if (token && user.mfa_secret) {
        verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: token,
            window: PLATFORM_CONFIG.MFA.WINDOW
        });
    }

    if (!verified) {
        return ResponseHandler.error(res, 'Invalid verification. Provide valid TOTP or bypass code.', 401);
    }

    // Disable MFA
    await pool.query(
        `UPDATE users SET 
            mfa_enabled = FALSE, 
            mfa_secret = NULL,
            mfa_secret_temp = NULL
         WHERE id = $1`,
        [userId]
    );

    console.log(`[SECURITY AUDIT] MFA disabled for user ${user.email}`);
    ResponseHandler.success(res, { disabled: true }, 'MFA Disabled');
});

module.exports = {
    generateMfaSecret,
    verifyAndEnableMfa,
    verifyMfaToken,
    getMfaStatus,
    disableMfa
};
