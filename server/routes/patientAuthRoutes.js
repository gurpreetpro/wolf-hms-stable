/**
 * Wolf Patient Auth Routes
 * 
 * Self-hosted OTP authentication for Wolf Care app
 * No Firebase dependency - 100% self-hosted
 * 
 * Endpoints:
 * - POST /api/patient-auth/send-otp
 * - POST /api/patient-auth/verify-otp
 * - POST /api/patient-auth/refresh
 * - GET /api/patient-auth/me
 */

const express = require('express');
const router = express.Router();
const otpAuthService = require('../services/otpAuthService');
const { pool } = require('../db');

console.log('[PATIENT-AUTH] Router Loaded');


/**
 * @route   POST /api/patient-auth/send-otp
 * @desc    Send OTP to phone number
 * @access  Public
 */
router.post('/send-otp', async (req, res) => {
    try {
        const { phone, hospital_id } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }
        
        // Validate phone format (10 digits for India)
        const formatted = otpAuthService.formatPhone(phone);
        if (formatted.length !== 10 || !/^\d+$/.test(formatted)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format. Please enter 10 digit number.'
            });
        }
        
        const result = await otpAuthService.sendOTP(phone, hospital_id);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'OTP sent successfully',
                expiresIn: result.expiresIn
            });
        } else {
            res.status(result.retryAfter ? 429 : 400).json({
                success: false,
                error: result.error,
                retryAfter: result.retryAfter
            });
        }
    } catch (err) {
        console.error('[PATIENT-AUTH] Send OTP error:', err);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

/**
 * @route   POST /api/patient-auth/login
 * @desc    Login with Phone and Password
 * @access  Public
 */
router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                error: 'Phone and password are required'
            });
        }
        
        const formatted = otpAuthService.formatPhone(phone);
        console.log('[PATIENT-AUTH] Formatted phone:', formatted);

        const result = await pool.query(
            `SELECT id, password_hash, name, phone, uhid, hospital_id FROM patients WHERE phone = $1`,
            [formatted]
        );
        console.log('[PATIENT-AUTH] Patient query result count:', result.rows.length);

        if (result.rows.length === 0) {
            console.log('[PATIENT-AUTH] Patient not found');
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const patient = result.rows[0];
        console.log('[PATIENT-AUTH] Patient found:', patient.id);

        const bcrypt = require('bcryptjs');
        const match = await bcrypt.compare(password, patient.password_hash);
        console.log('[PATIENT-AUTH] Password match:', match);

        if (!match) {
            console.log('[PATIENT-AUTH] Password mismatch');
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        console.log('[PATIENT-AUTH] Generating token...');
        const token = otpAuthService.generateToken(patient); 
        console.log('[PATIENT-AUTH] Token generated successfully');

        res.json({
            success: true,
            token,
            patient: {
                id: patient.id,
                name: patient.name,
                phone: patient.phone,
                uhid: patient.uhid,
                hospital_id: patient.hospital_id,
            }
        });
        console.log('[PATIENT-AUTH] Response sent');
    } catch (err) {
        console.error('[PATIENT-AUTH] Login error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

/**
 * @route   POST /api/patient-auth/verify-otp
 * @desc    Verify OTP and get Wolf JWT
 * @access  Public
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp, hospital_id } = req.body;
        
        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                error: 'Phone and OTP are required'
            });
        }
        
        const result = await otpAuthService.verifyOTP(phone, otp, hospital_id);
        
        if (result.success) {
            res.json({
                success: true,
                token: result.token,
                patient: result.patient
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                attemptsRemaining: result.attemptsRemaining
            });
        }
    } catch (err) {
        console.error('[PATIENT-AUTH] Verify OTP error:', err);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

/**
 * @route   POST /api/patient-auth/refresh
 * @desc    Refresh Wolf JWT token
 * @access  Private (requires valid token)
 */
router.post('/refresh', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        
        const oldToken = authHeader.split(' ')[1];
        const newToken = otpAuthService.refreshToken(oldToken);
        
        if (newToken) {
            res.json({
                success: true,
                token: newToken
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
    } catch (err) {
        console.error('[PATIENT-AUTH] Refresh token error:', err);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

/**
 * @route   GET /api/patient-auth/me
 * @desc    Get current patient profile
 * @access  Private (requires Wolf JWT)
 */
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = otpAuthService.verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        
        // Get patient details
        const result = await pool.query(
            `SELECT p.id, p.name, p.phone, p.uhid, p.gender, p.dob,
                    p.blood_group as blood_type, p.address, p.hospital_id,
                    h.name as hospital_name, h.code as hospital_code
             FROM patients p
             LEFT JOIN hospitals h ON p.hospital_id = h.id
             WHERE p.id = $1`,
            [decoded.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }
        
        res.json({
            success: true,
            patient: result.rows[0]
        });
    } catch (err) {
        console.error('[PATIENT-AUTH] Get me error:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * @route   PUT /api/patient-auth/profile
 * @desc    Update patient profile
 * @access  Private (requires Wolf JWT)
 */
router.put('/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = otpAuthService.verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        
        const { name, gender, dob, blood_type, address } = req.body;
        
        // Update patient
        const result = await pool.query(
            `UPDATE patients 
             SET name = COALESCE($1, name),
                 gender = COALESCE($2, gender),
                 dob = COALESCE($3, dob),
                 blood_group = COALESCE($4, blood_group),
                 address = COALESCE($5, address),
                 updated_at = NOW()
             WHERE id = $6
             RETURNING id, name, phone, uhid, gender, dob, blood_group as blood_type, address`,
            [name, gender, dob, blood_type, address, decoded.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            patient: result.rows[0]
        });
    } catch (err) {
        console.error('[PATIENT-AUTH] Update profile error:', err);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

module.exports = router;
