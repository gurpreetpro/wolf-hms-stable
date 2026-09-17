const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    login, getUsers, register, updateUserStatus, demoLogin,
    registerPublic, getPendingUsers, updateApprovalStatus, initiateRecovery, completeRecovery, setupSecurityProfile,
    updateSecurityQuestions, updateUser, resetUserPassword, deleteUser, updateProfile, forgotPassword, resetPassword,
    refreshToken, logout
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate, sanitize } = require('../middleware/validationMiddleware');

// ──────────────────────────────────────────────
// SLIDING-SCALE AUTH RATE LIMITER
// ──────────────────────────────────────────────
// Strategy:
// 1. High global concurrency (150/15min) for shift-change bursts
// 2. In-memory store tracks per-IP failures for strict penalization
// 3. Clean ips cross the window freely; repeat offenders get throttled
//
// Tiers:
//   Tier 0 (Green):  < 3 failures/15min → Full 150 quota
//   Tier 1 (Amber):   ≥ 3 failures/15min → Reduced to 20/15min
//   Tier 2 (Red):     ≥ 10 failures/15min → Blocked for 1 hour
// ──────────────────────────────────────────────

// In-memory sliding failure tracker
// Map<ip_address, { counts: number[], warnings: number }>
const failureTracker = new Map();
const FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const TIER_1_THRESHOLD = 3;
const TIER_2_THRESHOLD = 10;
const TIER_2_BLOCK_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Periodic cleanup of stale entries
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of failureTracker.entries()) {
        // If tier 2 blocked and block expired, or no failures in window, remove
        if (data.blockedUntil && now > data.blockedUntil) {
            failureTracker.delete(ip);
            continue;
        }
        // Filter out expired failure timestamps
        data.counts = data.counts.filter(t => now - t < FAILURE_WINDOW_MS);
        if (data.counts.length === 0 && !data.blockedUntil) {
            failureTracker.delete(ip);
        }
    }
}, CLEANUP_INTERVAL_MS);
if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
}

/**
 * Get current tier and allowed limit for an IP
 */
function getAuthLimitForIp(ip) {
    const now = Date.now();
    const entry = failureTracker.get(ip);

    // No record → Tier 0 (full quota)
    if (!entry) return { limit: 150, tier: 0 };

    // Tier 2: Blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
        const remaining = Math.ceil((entry.blockedUntil - now) / 1000);
        return { limit: 0, tier: 2, blockedFor: remaining };
    }

    // Clear expired block
    if (entry.blockedUntil && now >= entry.blockedUntil) {
        entry.blockedUntil = null;
        entry.counts = [];
        failureTracker.set(ip, entry);
        return { limit: 150, tier: 0 };
    }

    // Count failures within the sliding window
    entry.counts = entry.counts.filter(t => now - t < FAILURE_WINDOW_MS);
    const failureCount = entry.counts.length;

    if (failureCount >= TIER_2_THRESHOLD) {
        // Escalate to Tier 2: Block for 1 hour
        entry.blockedUntil = now + TIER_2_BLOCK_MS;
        entry.warnings = (entry.warnings || 0) + 1;
        failureTracker.set(ip, entry);
        console.warn(`[AuthRateLimit] 🚨 IP ${ip} BLOCKED for 1h (${failureCount} failures)`);
        return { limit: 0, tier: 2, blockedFor: 3600 };
    }

    if (failureCount >= TIER_1_THRESHOLD) {
        // Tier 1: Reduced quota
        return { limit: 20, tier: 1, failureCount };
    }

    // Tier 0: Full quota but track
    return { limit: 150, tier: 0, failureCount };
}

/**
 * Record a failed login attempt for sliding-scale tracking
 * Called from authController after bad credentials
 */
function recordLoginFailure(ip) {
    const now = Date.now();
    let entry = failureTracker.get(ip);
    if (!entry) {
        entry = { counts: [], warnings: 0, blockedUntil: null };
    }

    // If currently blocked, don't accumulate (already blocked)
    if (entry.blockedUntil && now < entry.blockedUntil) {
        return;
    }

    entry.counts.push(now);
    // Keep only entries within the window
    entry.counts = entry.counts.filter(t => now - t < FAILURE_WINDOW_MS);
    failureTracker.set(ip, entry);

    // Check if this pushes to next tier
    if (entry.counts.length >= TIER_2_THRESHOLD) {
        entry.blockedUntil = now + TIER_2_BLOCK_MS;
        entry.warnings = (entry.warnings || 0) + 1;
        failureTracker.set(ip, entry);
        console.warn(`[AuthRateLimit] 🚨 IP ${ip} ESCALATED to BLOCKED (${entry.counts.length} failures)`);
    } else if (entry.counts.length >= TIER_1_THRESHOLD) {
        console.warn(`[AuthRateLimit] ⚠️ IP ${ip} demoted to Tier 1 (${entry.counts.length} failures)`);
    }
}

/**
 * Clear failure record on successful login
 */
function clearLoginFailures(ip) {
    failureTracker.delete(ip);
}

/**
 * The sliding-scale middleware factory
 */
const slidingAuthLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000,
        defaultLimit = 150,
    } = options;

    // Track per-IP request count for the sliding window
    const requestCounts = new Map();

    // Periodic cleanup (unref to avoid hanging Jest or process exit)
    setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of requestCounts.entries()) {
            const valid = timestamps.filter(t => now - t < windowMs);
            if (valid.length === 0) {
                requestCounts.delete(ip);
            } else {
                requestCounts.set(ip, valid);
            }
        }
    }, 60 * 1000).unref(); // Cleanup every 1 minute

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';

        // 1. Get the sliding tier from failure history
        const tierInfo = getAuthLimitForIp(ip);

        // 2. Block if in Tier 2
        if (tierInfo.tier === 2) {
            const retryAfter = tierInfo.blockedFor || 3600;
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({
                success: false,
                message: `Too many failed login attempts. Your IP is blocked for ${Math.ceil(retryAfter / 60)} minute(s).`,
                blocked_for_seconds: retryAfter
            });
        }

        // 3. Count requests in the sliding window
        const now = Date.now();
        let timestamps = requestCounts.get(ip) || [];
        timestamps = timestamps.filter(t => now - t < windowMs);
        timestamps.push(now);
        requestCounts.set(ip, timestamps);

        const count = timestamps.length;
        const limit = tierInfo.limit;

        // 4. Apply sliding limit
        if (count > limit) {
            const oldestInWindow = timestamps[0] || now;
            const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
            res.set('Retry-After', String(retryAfter));

            // Log if tier 1 is being hit
            if (tierInfo.tier === 1) {
                console.warn(`[AuthRateLimit] ⚠️ IP ${ip} at rate limit (${count}/${limit}) in Tier 1`);
            }

            return res.status(429).json({
                success: false,
                message: tierInfo.tier === 1
                    ? 'Too many login attempts from this IP. Your rate has been reduced due to recent failures. Please wait before trying again.'
                    : 'Too many login attempts. Please try again later.',
                retry_after_seconds: retryAfter
            });
        }

        // 5. Attach tracking info to request for authController
        req.authRateInfo = {
            ip,
            tier: tierInfo.tier,
            limit,
            remaining: limit - count,
            recordFailure: () => recordLoginFailure(ip),
            clearFailures: () => clearLoginFailures(ip),
        };

        next();
    };
};

// Export failure tracker utilities so authController can use them
module.exports.recordLoginFailure = recordLoginFailure;
module.exports.clearLoginFailures = clearLoginFailures;
module.exports.getAuthLimitForIp = getAuthLimitForIp;

// Create the rate limiter middleware
const authLimiter = slidingAuthLimiter({
    windowMs: 15 * 60 * 1000,
    defaultLimit: 150
});

// Legacy static limiter for non-login auth routes (register, recovery, etc.)
// These are less sensitive to burst patterns but still need basic protection
const publicAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many requests. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Public Routes (rate-limited)
router.post('/register-public', publicAuthLimiter, sanitize, validate('register'), registerPublic);
router.post('/recover-init', publicAuthLimiter, sanitize, initiateRecovery);
router.post('/recover-verify', publicAuthLimiter, sanitize, completeRecovery);
router.post('/forgot-password', publicAuthLimiter, sanitize, forgotPassword);
router.post('/reset-password', publicAuthLimiter, sanitize, resetPassword);

// Protected Routes
// Login uses the sliding-scale rate limiter
router.post('/login', authLimiter, sanitize, validate('login'), login);
router.post('/token/refresh', refreshToken);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/demo-login', demoLogin);
// router.get('/profile', protect, getProfile); // Added get profile route
router.post('/setup-security', protect, setupSecurityProfile); // User setting up their own questions
router.post('/update-security', protect, updateSecurityQuestions); // User updating questions from settings
router.put('/profile', protect, sanitize, updateProfile); // User updating own profile
router.get('/users', protect, getUsers);
router.post('/register', protect, sanitize, register); // Admin internal create
router.put('/users/:id/status', protect, sanitize, updateUserStatus);
router.put('/users/:id', protect, sanitize, updateUser);
router.put('/users/:id/reset-password', protect, sanitize, resetUserPassword);
router.delete('/users/:id', protect, deleteUser);

// Admin Approval Routes
router.get('/users/pending', protect, getPendingUsers);
router.put('/users/:id/approval', protect, updateApprovalStatus);

module.exports = router;
