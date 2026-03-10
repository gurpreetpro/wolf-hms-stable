/**
 * TOTP Controller
 * Authenticator App (Google Authenticator, Authy, etc.) Integration
 * Wolf HMS - Two-Factor Authentication
 */

const { pool } = require('../db');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Configure TOTP options
authenticator.options = {
    digits: 6,
    step: 30, // 30 seconds window
    window: 1  // Allow 1 step before/after for clock drift
};

/**
 * Setup TOTP - Generate secret and QR code
 * Called when user wants to enable 2FA
 */
const setupTOTP = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    // Check if already enabled
    const existing = await pool.query(
        'SELECT totp_enabled FROM users WHERE id = $1',
        [userId]
    );
    
    if (existing.rows[0]?.totp_enabled) {
        return ResponseHandler.error(res, '2FA is already enabled', 400);
    }
    
    // Generate new secret
    const secret = authenticator.generateSecret(20);
    
    // Get user info for label
    const userResult = await pool.query(
        'SELECT username, email FROM users WHERE id = $1',
        [userId]
    );
    const user = userResult.rows[0];
    
    // Generate otpauth URI
    const otpauthUrl = authenticator.keyuri(
        user.email || user.username,
        'Wolf HMS',
        secret
    );
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
    
    // Store secret temporarily (not enabled yet until verified)
    await pool.query(
        'UPDATE users SET totp_secret = $1 WHERE id = $2',
        [secret, userId]
    );
    
    ResponseHandler.success(res, {
        success: true,
        qrCode: qrCodeDataUrl,
        secret: secret, // Manual entry option
        otpauthUrl: otpauthUrl,
        message: 'Scan this QR code with your authenticator app'
    });
});

/**
 * Verify TOTP code and enable 2FA
 * Called after user scans QR and enters the first code
 */
const verifyAndEnableTOTP = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { token } = req.body;
    
    if (!token || token.length !== 6) {
        return ResponseHandler.error(res, 'Invalid token format', 400);
    }
    
    // Get stored secret
    const result = await pool.query(
        'SELECT totp_secret, totp_enabled FROM users WHERE id = $1',
        [userId]
    );
    
    if (!result.rows[0]?.totp_secret) {
        return ResponseHandler.error(res, 'Please setup 2FA first', 400);
    }
    
    if (result.rows[0].totp_enabled) {
        return ResponseHandler.error(res, '2FA is already enabled', 400);
    }
    
    // Verify the token
    const isValid = authenticator.verify({
        token: token.toString(),
        secret: result.rows[0].totp_secret
    });
    
    if (!isValid) {
        return ResponseHandler.error(res, 'Invalid verification code', 400);
    }
    
    // Generate backup codes (10 single-use codes)
    const backupCodes = [];
    const hashedBackupCodes = [];
    
    for (let i = 0; i < 10; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        backupCodes.push(code);
        hashedBackupCodes.push(await bcrypt.hash(code, 10));
    }
    
    // Enable 2FA and store backup codes
    await pool.query(`
        UPDATE users SET 
            totp_enabled = true,
            totp_backup_codes = $1,
            updated_at = NOW()
        WHERE id = $2
    `, [hashedBackupCodes, userId]);
    
    ResponseHandler.success(res, {
        success: true,
        message: '2FA has been enabled successfully',
        backupCodes: backupCodes, // Show only once!
        warning: 'Save these backup codes in a safe place. They will not be shown again.'
    });
});

/**
 * Verify TOTP during login
 * Called after password verification for users with 2FA enabled
 */
const verifyTOTPLogin = asyncHandler(async (req, res) => {
    const { tempToken, token, backupCode } = req.body;
    
    // Verify temporary token
    let decoded;
    try {
        decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'wolf-secret-key');
    } catch (err) {
        return ResponseHandler.error(res, 'Session expired, please login again', 401);
    }
    
    const userId = decoded.userId;
    
    // Get user with secret
    const result = await pool.query(`
        SELECT id, username, email, role, totp_secret, totp_backup_codes
        FROM users WHERE id = $1 AND totp_enabled = true
    `, [userId]);
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'User not found or 2FA not enabled', 404);
    }
    
    const user = result.rows[0];
    let isValid = false;
    
    // Check if using backup code
    if (backupCode) {
        const codes = user.totp_backup_codes || [];
        for (let i = 0; i < codes.length; i++) {
            if (await bcrypt.compare(backupCode, codes[i])) {
                isValid = true;
                // Remove used backup code
                codes.splice(i, 1);
                await pool.query(
                    'UPDATE users SET totp_backup_codes = $1 WHERE id = $2',
                    [codes, userId]
                );
                break;
            }
        }
    } else if (token) {
        // Verify TOTP code
        isValid = authenticator.verify({
            token: token.toString(),
            secret: user.totp_secret
        });
    }
    
    if (!isValid) {
        return ResponseHandler.error(res, 'Invalid 2FA code', 401);
    }
    
    // Generate full JWT
    const fullToken = jwt.sign(
        {
            id: user.id,
            user_id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET || 'wolf-secret-key',
        { expiresIn: '12h' }
    );
    
    ResponseHandler.success(res, {
        success: true,
        message: 'Login successful',
        token: fullToken,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    });
});

/**
 * Get 2FA status for current user
 */
const getTOTPStatus = asyncHandler(async (req, res) => {
    const result = await pool.query(
        'SELECT totp_enabled FROM users WHERE id = $1',
        [req.user.id]
    );
    
    ResponseHandler.success(res, {
        enabled: result.rows[0]?.totp_enabled || false
    });
});

/**
 * Disable 2FA (requires password verification)
 */
const disableTOTP = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const userId = req.user.id;
    
    if (!password) {
        return ResponseHandler.error(res, 'Password is required', 400);
    }
    
    // Verify password
    const result = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
    );
    
    const isValid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!isValid) {
        return ResponseHandler.error(res, 'Invalid password', 401);
    }
    
    // Disable 2FA
    await pool.query(`
        UPDATE users SET 
            totp_enabled = false,
            totp_secret = NULL,
            totp_backup_codes = NULL,
            updated_at = NOW()
        WHERE id = $1
    `, [userId]);
    
    ResponseHandler.success(res, {
        success: true,
        message: '2FA has been disabled'
    });
});

/**
 * Regenerate backup codes
 */
const regenerateBackupCodes = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const userId = req.user.id;
    
    // Verify password
    const result = await pool.query(
        'SELECT password_hash, totp_enabled FROM users WHERE id = $1',
        [userId]
    );
    
    if (!result.rows[0]?.totp_enabled) {
        return ResponseHandler.error(res, '2FA is not enabled', 400);
    }
    
    const isValid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!isValid) {
        return ResponseHandler.error(res, 'Invalid password', 401);
    }
    
    // Generate new backup codes
    const backupCodes = [];
    const hashedBackupCodes = [];
    
    for (let i = 0; i < 10; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        backupCodes.push(code);
        hashedBackupCodes.push(await bcrypt.hash(code, 10));
    }
    
    await pool.query(
        'UPDATE users SET totp_backup_codes = $1 WHERE id = $2',
        [hashedBackupCodes, userId]
    );
    
    ResponseHandler.success(res, {
        success: true,
        backupCodes: backupCodes,
        warning: 'Your old backup codes have been invalidated. Save these new codes.'
    });
});

module.exports = {
    setupTOTP,
    verifyAndEnableTOTP,
    verifyTOTPLogin,
    getTOTPStatus,
    disableTOTP,
    regenerateBackupCodes
};
