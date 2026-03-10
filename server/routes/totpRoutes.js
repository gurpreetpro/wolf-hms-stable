/**
 * TOTP Routes
 * Two-Factor Authentication with Authenticator Apps
 */

const express = require('express');
const router = express.Router();
const {
    setupTOTP,
    verifyAndEnableTOTP,
    verifyTOTPLogin,
    getTOTPStatus,
    disableTOTP,
    regenerateBackupCodes
} = require('../controllers/totpController');
const { protect } = require('../middleware/authMiddleware');

// Get 2FA status
router.get('/status', protect, getTOTPStatus);

// Setup 2FA - Generate QR code
router.post('/setup', protect, setupTOTP);

// Verify and enable 2FA
router.post('/verify', protect, verifyAndEnableTOTP);

// Verify 2FA during login (no auth - called after password check)
router.post('/login-verify', verifyTOTPLogin);

// Disable 2FA
router.post('/disable', protect, disableTOTP);

// Regenerate backup codes
router.post('/backup-codes', protect, regenerateBackupCodes);

module.exports = router;
