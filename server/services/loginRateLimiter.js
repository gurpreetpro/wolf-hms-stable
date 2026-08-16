/**
 * 🐺 WOLF ECOSYSTEM — SLIDING-SCALE LOGIN RATE LIMITER
 * ====================================================
 * 
 * Strategy:
 * - High global concurrency (150/15min) for shift-change bursts
 * - Per-IP in-memory failure tracking with 3 tiers
 * - Clean IPs cross the window freely; repeat offenders get throttled
 * 
 * Tiers:
 *   Tier 0 (Green):  < 3 failures/15min → Full 150 quota
 *   Tier 1 (Amber):   ≥ 3 failures/15min → Reduced to 20/15min
 *   Tier 2 (Red):     ≥ 10 failures/15min → Blocked for 1 hour
 * 
 * Connected Apps Impacted:
 * - Wolf Care (login via patient-auth uses separate OTP path)
 * - Wolf Ultimate (RMO App login — benefits from higher concurrency)
 * - Wolf Runner / Wolf Guard (mobile app logins protected by tier system)
 * 
 * Data Flow:
 *   Request → slidingAuthLimiter middleware → checkTier(ip) → 
 *   → pass/block → authController → on failure: recordLoginFailure(ip)
 *   → on success: clearLoginFailures(ip)
 * 
 * Memory Safe:
 * - Entries auto-expire after 15 min of inactivity
 * - Periodic cleanup every 5 minutes
 * - Map size bounded by active IPs only
 */

// ──────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────
const CONFIG = {
    WINDOW_MS: 15 * 60 * 1000,          // 15 minutes sliding window
    DEFAULT_LIMIT: 150,                  // Tier 0: max 150 requests per window
    TIER_1_LIMIT: 20,                    // Tier 1: reduced to 20
    TIER_1_THRESHOLD: 3,                 // ≥3 failures triggers Tier 1
    TIER_2_THRESHOLD: 10,                // ≥10 failures triggers Tier 2
    TIER_2_BLOCK_MS: 60 * 60 * 1000,    // Tier 2: blocked for 1 hour
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // Cleanup stale entries every 5 min
    REQUEST_CLEANUP_MS: 60 * 1000,       // Cleanup request counters every 1 min
};

// ──────────────────────────────────────────────
// IN-MEMORY STORES
// ──────────────────────────────────────────────

// Map<ip, { counts: number[], blockedUntil: number|null, warnings: number }>
const failureTracker = new Map();

// Map<ip, number[]> — sliding window request timestamps for quota tracking
const requestCounts = new Map();

// ──────────────────────────────────────────────
// PERIODIC CLEANUP
// ──────────────────────────────────────────────

setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of failureTracker.entries()) {
        // If tier 2 blocked and block expired, remove
        if (data.blockedUntil && now > data.blockedUntil) {
            failureTracker.delete(ip);
            continue;
        }
        // Filter out expired failure timestamps
        data.counts = data.counts.filter(t => now - t < CONFIG.WINDOW_MS);
        if (data.counts.length === 0 && !data.blockedUntil) {
            failureTracker.delete(ip);
        }
    }
}, CONFIG.CLEANUP_INTERVAL_MS);

setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of requestCounts.entries()) {
        const valid = timestamps.filter(t => now - t < CONFIG.WINDOW_MS);
        if (valid.length === 0) {
            requestCounts.delete(ip);
        } else {
            requestCounts.set(ip, valid);
        }
    }
}, CONFIG.REQUEST_CLEANUP_MS);

// ──────────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────────

/**
 * Get current tier and allowed limit for an IP
 * @param {string} ip
 * @returns {{ limit: number, tier: number, blockedFor?: number, failureCount?: number }}
 */
function getAuthLimitForIp(ip) {
    const now = Date.now();
    const entry = failureTracker.get(ip);

    // No record → Tier 0 (full quota)
    if (!entry) return { limit: CONFIG.DEFAULT_LIMIT, tier: 0, failureCount: 0 };

    // Tier 2: Blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
        const remaining = Math.ceil((entry.blockedUntil - now) / 1000);
        return { limit: 0, tier: 2, blockedFor: remaining, failureCount: entry.counts.length, destroyConnection: true };
    }

    // Clear expired block
    if (entry.blockedUntil && now >= entry.blockedUntil) {
        entry.blockedUntil = null;
        entry.counts = [];
        failureTracker.set(ip, entry);
        return { limit: CONFIG.DEFAULT_LIMIT, tier: 0, failureCount: 0 };
    }

    // Count failures within the sliding window
    entry.counts = entry.counts.filter(t => now - t < CONFIG.WINDOW_MS);
    const failureCount = entry.counts.length;

    if (failureCount >= CONFIG.TIER_2_THRESHOLD) {
        // Escalate to Tier 2: Block for 1 hour
        entry.blockedUntil = now + CONFIG.TIER_2_BLOCK_MS;
        entry.warnings = (entry.warnings || 0) + 1;
        failureTracker.set(ip, entry);
        console.warn(`[LoginRateLimiter] 🚨 IP ${ip} BLOCKED for 1h (${failureCount} failures)`);
        return { limit: 0, tier: 2, blockedFor: Math.ceil(CONFIG.TIER_2_BLOCK_MS / 1000), failureCount, destroyConnection: true };
    }

    if (failureCount >= CONFIG.TIER_1_THRESHOLD) {
        // Tier 1: Reduced quota
        return { limit: CONFIG.TIER_1_LIMIT, tier: 1, failureCount };
    }

    // Tier 0: Full quota
    return { limit: CONFIG.DEFAULT_LIMIT, tier: 0, failureCount };
}

/**
 * Record a failed login attempt for sliding-scale penalization
 * @param {string} ip
 */
function recordLoginFailure(ip) {
    const now = Date.now();
    let entry = failureTracker.get(ip);
    if (!entry) {
        entry = { counts: [], warnings: 0, blockedUntil: null };
    }

    // If currently blocked, don't accumulate further
    if (entry.blockedUntil && now < entry.blockedUntil) {
        return;
    }

    entry.counts.push(now);
    entry.counts = entry.counts.filter(t => now - t < CONFIG.WINDOW_MS);
    failureTracker.set(ip, entry);

    // Check if this pushes to next tier
    if (entry.counts.length >= CONFIG.TIER_2_THRESHOLD) {
        entry.blockedUntil = now + CONFIG.TIER_2_BLOCK_MS;
        entry.warnings = (entry.warnings || 0) + 1;
        failureTracker.set(ip, entry);
        console.warn(`[LoginRateLimiter] 🚨 IP ${ip} ESCALATED to BLOCKED (${entry.counts.length} failures)`);
    } else if (entry.counts.length >= CONFIG.TIER_1_THRESHOLD) {
        console.warn(`[LoginRateLimiter] ⚠️ IP ${ip} demoted to Tier 1 (${entry.counts.length} failures)`);
    }
}

/**
 * Clear failure record on successful login
 * @param {string} ip
 */
function clearLoginFailures(ip) {
    if (failureTracker.has(ip)) {
        console.log(`[LoginRateLimiter] ✅ IP ${ip} cleared (successful login)`);
        failureTracker.delete(ip);
    }
}

/**
 * Express middleware factory for sliding-scale rate limiting
 * @param {object} options
 * @param {number} options.windowMs - Sliding window in ms (default: 15 min)
 * @param {number} options.defaultLimit - Default request limit (default: 150)
 * @returns {function} Express middleware
 */
function slidingAuthLimiter(options = {}) {
    const windowMs = options.windowMs || CONFIG.WINDOW_MS;
    const defaultLimit = options.defaultLimit || CONFIG.DEFAULT_LIMIT;

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';

        // 1. Get the sliding tier from failure history
        const tierInfo = getAuthLimitForIp(ip);

        // 2. Tier 2: Drop connection at TCP layer immediately.
        //    No JSON response for blocked IPs — conserve CPU by destroying the socket
        //    outright. Malicious brute-force bots waste zero server cycles parsing a
        //    response body. We still send Retry-After + a minimal JSON body first for
        //    well-behaved HTTP clients, then flush and destroy the TCP connection.
        if (tierInfo.tier === 2) {
            const retryAfter = tierInfo.blockedFor || 3600;
            res.set('Retry-After', String(retryAfter));
            const body = JSON.stringify({
                success: false,
                message: `Too many failed login attempts. Your IP is blocked for ${Math.ceil(retryAfter / 60)} minute(s).`,
                blocked_for_seconds: retryAfter
            });
            res.writeHead(429, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
            res.end(body);
            // After flushing the response, destroy the underlying TCP socket with RST.
            // This prevents keep-alive reuse and signals the client that the connection
            // is dead without a graceful FIN handshake.
            if (res.socket && !res.socket.destroyed) {
                console.warn(`[LoginRateLimiter] 🔴 HARD DROP — socket destroyed for IP ${ip} (${Math.ceil(retryAfter / 60)}m block)`);
                setImmediate(() => {
                    try { if (res.socket && !res.socket.destroyed) res.socket.destroy(new Error('Tier2Block')); } catch (_) { /* ignore */ }
                });
            }
            return;
        }

        // 3. Count requests in the sliding window
        const now = Date.now();
        let timestamps = requestCounts.get(ip) || [];
        timestamps = timestamps.filter(t => now - t < windowMs);
        timestamps.push(now);
        requestCounts.set(ip, timestamps);

        const count = timestamps.length;
        const limit = tierInfo.tier === 1 ? CONFIG.TIER_1_LIMIT : defaultLimit;

        // 4. Apply sliding limit for Tier 0/1 quota exhaustion.
        //    These are soft blocks — return HTTP 429 but do NOT destroy the socket,
        //    because the client may return after the window expires.
        if (count > limit) {
            const oldestInWindow = timestamps[0] || now;
            const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
            res.set('Retry-After', String(retryAfter));

            if (tierInfo.tier === 1) {
                console.warn(`[LoginRateLimiter] ⚠️ IP ${ip} at rate limit (${count}/${limit}) in Tier 1`);
            }

            return res.status(429).json({
                success: false,
                message: tierInfo.tier === 1
                    ? 'Too many login attempts from this IP. Your rate has been reduced due to recent failures. Please wait before trying again.'
                    : 'Too many login attempts. Please try again later.',
                retry_after_seconds: retryAfter
            });
        }

        // 5. Attach tracking info to request for downstream use.
        //    The `recordFailure()` wrapper re-checks whether this IP just escalated
        //    to Tier 2 after a bad password, and if so, retroactively destroys the
        //    socket mid-request to prevent the response from being sent.
        req.authRateInfo = {
            ip,
            tier: tierInfo.tier,
            limit,
            remaining: limit - count,
            failureCount: tierInfo.failureCount || 0,
            recordFailure: () => {
                recordLoginFailure(ip);
                // Re-check tier after recording the failure — if we just crossed
                // the Tier 2 threshold, destroy the socket mid-request to abort
                // the response for this in-flight brute-force attempt.
                const postCheck = getAuthLimitForIp(ip);
                if (postCheck.tier === 2 && res.socket && !res.socket.destroyed) {
                    console.warn(`[LoginRateLimiter] 🔴 RETROACTIVE HARD DROP — IP ${ip} escalated to Tier 2 mid-request`);
                    setImmediate(() => {
                        try { if (res.socket && !res.socket.destroyed) res.socket.destroy(new Error('Tier2BlockMidRequest')); } catch (_) { /* ignore */ }
                    });
                }
            },
            clearFailures: () => clearLoginFailures(ip),
        };

        next();
    };
}

module.exports = {
    slidingAuthLimiter,
    getAuthLimitForIp,
    recordLoginFailure,
    clearLoginFailures,
    CONFIG,
};