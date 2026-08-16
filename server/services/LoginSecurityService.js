const pool = require('../config/db');

/**
 * LoginSecurityService — Enterprise Login Security Layer
 * 
 * Features:
 * 1. Account Lockout (5 failed → 15min lock, 10 failed → 1hr lock)
 * 2. Login Audit Trail (IP, User-Agent, Timestamp, Action)
 * 3. Suspicious Login Detection (new IP, off-hours, credential stuffing)
 */
class LoginSecurityService {

    // ──────────────────────────────────────
    // 1. ACCOUNT LOCKOUT
    // ──────────────────────────────────────

    /**
     * Check if account is currently locked
     * @returns {object|null} { locked: true, minutes_remaining } or null if not locked
     */
    static async checkLockout(userId) {
        try {
            const result = await pool.query(
                'SELECT failed_login_count, locked_until FROM users WHERE id = $1',
                [userId]
            );
            if (result.rows.length === 0) return null;

            const user = result.rows[0];
            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
                return { locked: true, minutes_remaining: remaining };
            }
            return null;
        } catch (err) {
            console.error('[Security] Lockout check error:', err.message);
            return null;
        }
    }

    /**
     * Record a failed login attempt — increment counter and lock if threshold hit
     */
    static async recordFailedAttempt(userId, ip) {
        try {
            // Increment counter
            const result = await pool.query(
                `UPDATE users 
                 SET failed_login_count = COALESCE(failed_login_count, 0) + 1, 
                     last_failed_ip = $2
                 WHERE id = $1 
                 RETURNING failed_login_count`,
                [userId, ip]
            );

            if (result.rows.length === 0) return;

            const count = result.rows[0].failed_login_count;

            // Lockout tiers
            if (count >= 10) {
                // Tier 2: 1 hour lock
                const lockUntil = new Date(Date.now() + 60 * 60 * 1000);
                await pool.query('UPDATE users SET locked_until = $1 WHERE id = $2', [lockUntil, userId]);
                console.warn(`[Security] 🔒 Account ${userId} LOCKED for 1 HOUR (${count} failed attempts)`);
            } else if (count >= 5) {
                // Tier 1: 15 minute lock
                const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
                await pool.query('UPDATE users SET locked_until = $1 WHERE id = $2', [lockUntil, userId]);
                console.warn(`[Security] 🔒 Account ${userId} LOCKED for 15 MINUTES (${count} failed attempts)`);
            }
        } catch (err) {
            console.error('[Security] Failed attempt recording error:', err.message);
        }
    }

    /**
     * Reset failed attempt counter on successful login
     */
    static async resetFailedAttempts(userId) {
        try {
            await pool.query(
                'UPDATE users SET failed_login_count = 0, locked_until = NULL, last_failed_ip = NULL WHERE id = $1',
                [userId]
            );
        } catch (err) {
            console.error('[Security] Reset counter error:', err.message);
        }
    }

    // ──────────────────────────────────────
    // 2. LOGIN AUDIT TRAIL
    // ──────────────────────────────────────

    /**
     * Log a login event to the audit trail
     * @param {string} action - LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, TOKEN_REFRESH, LOCKOUT, SUSPICIOUS
     */
    static async logLoginEvent(params) {
        const {
            user_id = null,
            username = null,
            hospital_id = null,
            action,
            ip_address = null,
            user_agent = null,
            details = null
        } = params;

        try {
            await pool.query(
                `INSERT INTO login_audit_log 
                 (user_id, username, hospital_id, action, ip_address, user_agent, details)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [user_id, username, hospital_id, action, ip_address, user_agent, 
                 details ? JSON.stringify(details) : null]
            );
        } catch (err) {
            // Non-fatal — don't break login flow for audit failures
            console.error('[Security] Audit log write error:', err.message);
        }
    }

    /**
     * Get login history for a user or hospital
     */
    static async getLoginHistory({ hospital_id, user_id, action, limit = 50, offset = 0 }) {
        try {
            let query = `SELECT id, user_id, username, hospital_id, action, ip_address, 
                         user_agent, details, created_at 
                         FROM login_audit_log WHERE 1=1`;
            const params = [];
            let idx = 1;

            if (hospital_id) {
                query += ` AND hospital_id = $${idx++}`;
                params.push(hospital_id);
            }
            if (user_id) {
                query += ` AND user_id = $${idx++}`;
                params.push(user_id);
            }
            if (action) {
                query += ` AND action = $${idx++}`;
                params.push(action);
            }

            query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
            params.push(limit, offset);

            const result = await pool.query(query, params);
            return result.rows;
        } catch (err) {
            console.error('[Security] Audit log read error:', err.message);
            return [];
        }
    }

    // ──────────────────────────────────────
    // 3. SUSPICIOUS LOGIN DETECTION
    // ──────────────────────────────────────

    /**
     * Check for suspicious login patterns
     * Returns array of flags like ['NEW_IP', 'OFF_HOURS', 'RAPID_ATTEMPTS']
     */
    static async detectSuspiciousLogin(userId, ip, hospitalId) {
        const flags = [];

        try {
            // Flag 1: New IP — never seen for this user
            const ipCheck = await pool.query(
                `SELECT COUNT(*) as cnt FROM login_audit_log 
                 WHERE user_id = $1 AND ip_address = $2 AND action = 'LOGIN_SUCCESS'`,
                [userId, ip]
            );
            if (parseInt(ipCheck.rows[0].cnt) === 0) {
                flags.push('NEW_IP');
            }

            // Flag 2: Off-hours login (11 PM – 5 AM local server time)
            const hour = new Date().getHours();
            if (hour >= 23 || hour < 5) {
                flags.push('OFF_HOURS');
            }

            // Flag 3: Rapid failed attempts from same IP across different users (credential stuffing)
            const stuffingCheck = await pool.query(
                `SELECT COUNT(DISTINCT username) as cnt FROM login_audit_log
                 WHERE ip_address = $1 AND action = 'LOGIN_FAILED' 
                 AND created_at > NOW() - INTERVAL '15 minutes'`,
                [ip]
            );
            if (parseInt(stuffingCheck.rows[0].cnt) >= 3) {
                flags.push('CREDENTIAL_STUFFING');
            }

        } catch (err) {
            console.error('[Security] Suspicious detection error:', err.message);
        }

        return flags;
    }

    // ──────────────────────────────────────
    // 4. SESSION MANAGEMENT
    // ──────────────────────────────────────

    /**
     * Get all active sessions for a hospital
     */
    static async getActiveSessions(hospitalId) {
        try {
            const result = await pool.query(
                `SELECT rt.id, rt.user_id, u.username, u.role, 
                        rt.created_at, rt.expires_at,
                        rt.ip_address, rt.user_agent
                 FROM refresh_tokens rt
                 JOIN users u ON rt.user_id = u.id
                 WHERE u.hospital_id = $1 
                   AND rt.is_revoked = false 
                   AND rt.expires_at > NOW()
                 ORDER BY rt.created_at DESC`,
                [hospitalId]
            );
            return result.rows;
        } catch (err) {
            console.error('[Security] Session list error:', err.message);
            return [];
        }
    }

    /**
     * Force-revoke a specific session
     */
    static async revokeSession(sessionId) {
        try {
            const result = await pool.query(
                'UPDATE refresh_tokens SET is_revoked = true WHERE id = $1 RETURNING id, user_id',
                [sessionId]
            );
            return result.rows[0] || null;
        } catch (err) {
            console.error('[Security] Session revoke error:', err.message);
            return null;
        }
    }

    /**
     * Force-revoke all sessions for a user
     */
    static async revokeAllUserSessions(userId) {
        try {
            const result = await pool.query(
                'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1 AND is_revoked = false RETURNING id',
                [userId]
            );
            return result.rows.length;
        } catch (err) {
            console.error('[Security] Revoke all error:', err.message);
            return 0;
        }
    }

    // ──────────────────────────────────────
    // 5. PASSWORD STRENGTH VALIDATION
    // ──────────────────────────────────────

    /**
     * Validate password strength server-side
     * @returns {object} { valid: boolean, errors: string[] }
     */
    static validatePasswordStrength(password) {
        const errors = [];
        
        if (!password || password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        return {
            valid: errors.length === 0,
            errors,
            strength: errors.length === 0 ? 'STRONG' : 
                       errors.length <= 2 ? 'MEDIUM' : 'WEAK'
        };
    }
}

module.exports = LoginSecurityService;
