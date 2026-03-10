/**
 * Wolf OTP Auth Service
 * 
 * Self-hosted OTP authentication for Wolf Care app
 * Eliminates Firebase dependency - 100% self-hosted
 * 
 * Features:
 * - OTP generation with expiry
 * - Rate limiting per phone number
 * - Brute force protection
 * - Wolf JWT issuance
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const smsService = require('./smsService');

// In-memory OTP storage (use Redis in production for multi-instance)
const otpStore = new Map();

// Rate limiting for OTP requests
const rateLimitStore = new Map();

// Configuration
const config = {
    OTP_LENGTH: 6,
    OTP_EXPIRY_MS: 5 * 60 * 1000,      // 5 minutes
    MAX_ATTEMPTS: 3,                    // Max verification attempts
    RATE_LIMIT_WINDOW_MS: 60 * 1000,   // 1 minute
    RATE_LIMIT_MAX_REQUESTS: 3,         // Max OTP requests per minute
    JWT_EXPIRY: '30d'                   // Token validity
};

/**
 * TEST MODE CONFIGURATION
 * Like Firebase's test phone numbers - these bypass real SMS
 * 
 * Test Numbers ALWAYS bypass SMS (for testing convenience):
 * - 9999999991 → OTP: 123456
 * - 9999999992 → OTP: 123456
 * - 9999999993 → OTP: 123456
 * - 9999999994 → OTP: 123456
 * - 9999999995 → OTP: 123456
 * - 1234567890 → OTP: 123456 (Easy to remember)
 * 
 * Set TEST_MODE=true in .env to also disable rate limiting etc.
 */
const TEST_MODE = process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'development';
const TEST_OTP = '123456';
const TEST_PHONE_NUMBERS = [
    '9999999991',
    '9999999992',
    '9999999993',
    '9999999994',
    '9999999995',
    '1234567890', // Easy to remember
];

/**
 * Check if phone is a test number
 * Note: Test numbers ALWAYS bypass SMS even in production
 */
function isTestPhone(phone) {
    return TEST_PHONE_NUMBERS.includes(phone);
}


/**
 * Generate a random numeric OTP
 */
function generateOTP() {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < config.OTP_LENGTH; i++) {
        otp += digits[crypto.randomInt(0, 10)];
    }
    return otp;
}

/**
 * Format phone number to standard format
 */
function formatPhone(phone) {
    // Remove spaces, dashes, and + prefix
    let formatted = phone.replace(/[\s\-\+]/g, '');
    
    // If starts with 91 and is 12 digits, it's Indian format with country code
    if (formatted.length === 12 && formatted.startsWith('91')) {
        return formatted.substring(2); // Return 10 digit number
    }
    
    // If 10 digits, return as is
    if (formatted.length === 10) {
        return formatted;
    }
    
    return formatted;
}

/**
 * Check rate limit for phone number
 */
function checkRateLimit(phone) {
    const now = Date.now();
    const key = `rate:${phone}`;
    
    const entry = rateLimitStore.get(key);
    
    if (!entry) {
        rateLimitStore.set(key, { count: 1, windowStart: now });
        return { allowed: true };
    }
    
    // Reset window if expired
    if (now - entry.windowStart > config.RATE_LIMIT_WINDOW_MS) {
        rateLimitStore.set(key, { count: 1, windowStart: now });
        return { allowed: true };
    }
    
    // Check if limit exceeded
    if (entry.count >= config.RATE_LIMIT_MAX_REQUESTS) {
        const retryAfter = Math.ceil((config.RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
        return { allowed: false, retryAfter };
    }
    
    // Increment count
    entry.count++;
    rateLimitStore.set(key, entry);
    return { allowed: true };
}

/**
 * Send OTP to phone number
 */
async function sendOTP(phone, hospitalId = null) {
    const formattedPhone = formatPhone(phone);
    
    // TEST MODE: Skip rate limit and SMS for test numbers
    if (isTestPhone(formattedPhone)) {
        console.log(`[OTP-AUTH] 🧪 TEST MODE: Using test OTP for ${formattedPhone}`);
        otpStore.set(formattedPhone, {
            otp: TEST_OTP,
            expiresAt: Date.now() + config.OTP_EXPIRY_MS,
            attempts: 0,
            hospitalId,
            isTest: true
        });
        return {
            success: true,
            message: 'OTP sent successfully (TEST MODE)',
            expiresIn: config.OTP_EXPIRY_MS / 1000,
            testMode: true,
            hint: 'Use OTP: 123456'
        };
    }
    
    // Check rate limit
    const rateCheck = checkRateLimit(formattedPhone);
    if (!rateCheck.allowed) {
        return {
            success: false,
            error: 'Too many requests',
            retryAfter: rateCheck.retryAfter
        };
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + config.OTP_EXPIRY_MS;
    
    // Store OTP
    otpStore.set(formattedPhone, {
        otp,
        expiresAt,
        attempts: 0,
        hospitalId
    });
    
    // Send SMS
    const message = `Your Wolf Care verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;
    
    try {
        const result = await smsService.sendSMS(formattedPhone, message);
        
        if (result.success) {
            console.log(`[OTP-AUTH] OTP sent to ${formattedPhone.slice(-4)}`);
            return {
                success: true,
                message: 'OTP sent successfully',
                expiresIn: config.OTP_EXPIRY_MS / 1000
            };
        } else {
            // Clear stored OTP if SMS failed
            otpStore.delete(formattedPhone);
            return {
                success: false,
                error: result.error || 'Failed to send SMS'
            };
        }
    } catch (err) {
        console.error('[OTP-AUTH] SMS send error:', err);
        otpStore.delete(formattedPhone);
        return {
            success: false,
            error: 'SMS service error'
        };
    }
}

/**
 * Verify OTP and issue Wolf JWT
 */
async function verifyOTP(phone, otp, hospitalId = null) {
    const formattedPhone = formatPhone(phone);
    
    // TEST MODE: Accept TEST_OTP directly for test numbers (even without send-otp)
    if (isTestPhone(formattedPhone) && otp === TEST_OTP) {
        console.log(`[OTP-AUTH] 🧪 TEST MODE: Verified test OTP for ${formattedPhone}`);
        otpStore.delete(formattedPhone); // Clear any stored OTP
        
        const patient = await findOrCreatePatient(formattedPhone, hospitalId);
        if (!patient) {
            return { success: false, error: 'Failed to create patient record' };
        }
        
        const token = jwt.sign(
            {
                id: patient.id,
                phone: formattedPhone,
                role: 'patient',
                hospital_id: patient.hospital_id,
                type: 'patient_app'
            },
            process.env.JWT_SECRET || 'wolf-jwt-secret',
            { expiresIn: config.JWT_EXPIRY }
        );
        
        return {
            success: true,
            token,
            patient: {
                id: patient.id,
                name: patient.name,
                phone: patient.phone,
                uhid: patient.uhid,
                hospital_id: patient.hospital_id,
                isNewUser: patient.isNewUser
            },
            testMode: true
        };
    }
    
    // Get stored OTP
    const stored = otpStore.get(formattedPhone);
    
    if (!stored) {
        return {
            success: false,
            error: 'No OTP found. Please request a new one.'
        };
    }
    
    // Check expiry
    if (Date.now() > stored.expiresAt) {
        otpStore.delete(formattedPhone);
        return {
            success: false,
            error: 'OTP expired. Please request a new one.'
        };
    }
    
    // Check attempts
    if (stored.attempts >= config.MAX_ATTEMPTS) {
        otpStore.delete(formattedPhone);
        return {
            success: false,
            error: 'Too many failed attempts. Please request a new OTP.'
        };
    }
    
    // Verify OTP
    if (stored.otp !== otp) {
        stored.attempts++;
        otpStore.set(formattedPhone, stored);
        return {
            success: false,
            error: 'Invalid OTP',
            attemptsRemaining: config.MAX_ATTEMPTS - stored.attempts
        };
    }
    
    // OTP verified! Clear it
    otpStore.delete(formattedPhone);
    
    // Find or create patient
    const patient = await findOrCreatePatient(formattedPhone, hospitalId || stored.hospitalId);
    
    if (!patient) {
        return {
            success: false,
            error: 'Failed to create patient record'
        };
    }
    
    // Generate Wolf JWT
    const token = jwt.sign(
        {
            id: patient.id,
            phone: formattedPhone,
            role: 'patient',
            hospital_id: patient.hospital_id,
            type: 'patient_app'
        },
        process.env.JWT_SECRET || 'wolf-jwt-secret',
        { expiresIn: config.JWT_EXPIRY }
    );
    
    console.log(`[OTP-AUTH] Patient ${patient.id} authenticated via OTP`);
    
    return {
        success: true,
        token,
        patient: {
            id: patient.id,
            name: patient.name,
            phone: patient.phone,
            uhid: patient.uhid,
            hospital_id: patient.hospital_id,
            isNewUser: patient.isNewUser
        }
    };
}

/**
 * Find or create patient by phone number
 * Uses MAX-based UHID generation with retry logic to handle race conditions
 */
async function findOrCreatePatient(phone, hospitalId) {
    try {
        // Try to find existing patient
        let result = await pool.query(
            `SELECT id, name, phone, uhid, hospital_id 
             FROM patients 
             WHERE phone = $1 
             ORDER BY id DESC 
             LIMIT 1`,
            [phone]
        );
        
        if (result.rows.length > 0) {
            return { ...result.rows[0], isNewUser: false };
        }
        
        // Create new patient with retry logic for UHID conflicts
        const effectiveHospitalId = hospitalId || 1;
        const maxRetries = 5;
        
        // Get hospital code once
        const uhidResult = await pool.query(
            `SELECT code FROM hospitals WHERE id = $1`,
            [effectiveHospitalId]
        );
        const hospitalCode = uhidResult.rows[0]?.code || 'WOLF';
        const year = new Date().getFullYear();
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Use MAX-based UHID generation (more reliable than COUNT)
                const maxResult = await pool.query(
                    `SELECT COALESCE(MAX(
                        CAST(
                            REGEXP_REPLACE(
                                SPLIT_PART(SPLIT_PART(uhid, '-', 2), '/', 1),
                                '[^0-9]', '', 'g'
                            ) AS INTEGER
                        )
                    ), 0) as max_num
                     FROM patients 
                     WHERE hospital_id = $1 
                     AND uhid LIKE $2`,
                    [effectiveHospitalId, `${hospitalCode}-%/${year}`]
                );
                
                const nextNum = (maxResult.rows[0]?.max_num || 0) + 1 + attempt;
                const uhid = `${hospitalCode}-${String(nextNum).padStart(4, '0')}/${year}`;
                
                // Insert new patient
                result = await pool.query(
                    `INSERT INTO patients (phone, hospital_id, uhid, name, created_at)
                     VALUES ($1, $2, $3, $4, NOW())
                     RETURNING id, name, phone, uhid, hospital_id`,
                    [phone, effectiveHospitalId, uhid, 'New Patient']
                );
                
                console.log(`[OTP-AUTH] Created new patient: ${result.rows[0].uhid}`);
                return { ...result.rows[0], isNewUser: true };
                
            } catch (insertErr) {
                // PostgreSQL error code 23505 = unique_violation
                if (insertErr.code === '23505' && attempt < maxRetries - 1) {
                    console.log(`[OTP-AUTH] UHID conflict on attempt ${attempt + 1}, retrying...`);
                    continue;
                }
                throw insertErr;
            }
        }
        
        throw new Error('Failed to generate unique UHID after max retries');
        
    } catch (err) {
        console.error('[OTP-AUTH] Find/create patient error:', err.message);
        return null;
    }
}


/**
 * Verify Wolf JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'wolf-jwt-secret');
    } catch (err) {
        return null;
    }
}

/**
 * Refresh token with extended expiry
 */
function refreshToken(oldToken) {
    const decoded = verifyToken(oldToken);
    if (!decoded) return null;
    
    const token = jwt.sign(
        {
            id: decoded.id,
            phone: decoded.phone,
            role: 'patient',
            hospital_id: decoded.hospital_id,
            type: 'patient_app'
        },
        process.env.JWT_SECRET || 'wolf-jwt-secret',
        { expiresIn: config.JWT_EXPIRY }
    );
    
    return token;
}

/**
 * Cleanup expired OTPs (run periodically)
 */
function cleanupExpiredOTPs() {
    const now = Date.now();
    for (const [phone, data] of otpStore.entries()) {
        if (now > data.expiresAt) {
            otpStore.delete(phone);
        }
    }
    
    // Also cleanup rate limit entries
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now - entry.windowStart > config.RATE_LIMIT_WINDOW_MS * 10) {
            rateLimitStore.delete(key);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

/**
 * Generate Wolf JWT for a patient
 */
function generateToken(patient) {
    return jwt.sign(
        {
            id: patient.id,
            phone: patient.phone,
            role: 'patient',
            hospital_id: patient.hospital_id || 1, // Default to 1 if missing
            type: 'patient_app'
        },
        process.env.JWT_SECRET || 'wolf-jwt-secret',
        { expiresIn: config.JWT_EXPIRY }
    );
}

module.exports = {
    sendOTP,
    verifyOTP,
    verifyToken,
    refreshToken,
    formatPhone,
    generateToken
};
