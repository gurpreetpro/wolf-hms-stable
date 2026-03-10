const express = require('express');
const router = express.Router();
const {
    generateMfaSecret,
    verifyAndEnableMfa,
    verifyMfaToken,
    getMfaStatus,
    disableMfa
} = require('../controllers/mfaController');
const { protect } = require('../middleware/authMiddleware');

/**
 * MFA Routes
 * 
 * Setup Flow:
 * 1. GET /api/mfa/status - Check if MFA is enabled
 * 2. POST /api/mfa/generate - Generate new secret (returns QR code)
 * 3. POST /api/mfa/verify-setup - Verify TOTP and enable MFA
 * 
 * Login Flow:
 * 1. Normal login returns user_id if MFA is required
 * 2. POST /api/mfa/verify - Verify TOTP token to complete login
 */

// Protected routes (user must be logged in)
router.get('/status', protect, getMfaStatus);
router.post('/generate', protect, generateMfaSecret);
router.post('/verify-setup', protect, verifyAndEnableMfa);
router.post('/disable', protect, disableMfa);

// Public route (called during login flow when MFA is required)
router.post('/verify', verifyMfaToken);

module.exports = router;
