/**
 * Session Service
 * Manages user sessions, refresh tokens, and active session tracking
 * Phase 1: Security Hardening (Gold Standard HMS)
 */

const pool = require('../config/db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

/**
 * Hash a token for secure storage
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate refresh token
 */
const generateRefreshToken = () => {
    return crypto.randomBytes(64).toString('hex');
};

/**
 * Create a new session for user
 */
const createSession = async ({ userId, refreshToken, ip, userAgent, hospitalId }) => {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);
    const tokenHash = hashToken(refreshToken);

    try {
        const result = await pool.query(`
            INSERT INTO user_sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at, hospital_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [userId, tokenHash, ip, userAgent, expiresAt, hospitalId]);

        return result.rows[0]?.id;
    } catch (error) {
        console.error('[Session] Failed to create session:', error.message);
        throw error;
    }
};

/**
 * Validate refresh token and return session
 */
const validateRefreshToken = async (refreshToken) => {
    const tokenHash = hashToken(refreshToken);

    try {
        const result = await pool.query(`
            SELECT s.*, u.username, u.role, u.hospital_id
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.refresh_token_hash = $1 
              AND s.is_active = TRUE 
              AND s.expires_at > NOW()
        `, [tokenHash]);

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    } catch (error) {
        console.error('[Session] Validation error:', error.message);
        return null;
    }
};

/**
 * Rotate refresh token (security best practice)
 */
const rotateRefreshToken = async (oldToken, newToken, sessionId) => {
    const newHash = hashToken(newToken);

    try {
        await pool.query(`
            UPDATE user_sessions 
            SET refresh_token_hash = $1, last_used_at = NOW()
            WHERE id = $2
        `, [newHash, sessionId]);
    } catch (error) {
        console.error('[Session] Rotation error:', error.message);
    }
};

/**
 * Revoke a specific session
 */
const revokeSession = async (sessionId) => {
    try {
        await pool.query(`
            UPDATE user_sessions SET is_active = FALSE WHERE id = $1
        `, [sessionId]);
    } catch (error) {
        console.error('[Session] Revoke error:', error.message);
    }
};

/**
 * Revoke all sessions for a user (logout everywhere)
 */
const revokeAllSessions = async (userId) => {
    try {
        await pool.query(`
            UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1
        `, [userId]);
    } catch (error) {
        console.error('[Session] Revoke all error:', error.message);
    }
};

/**
 * Get all active sessions for a user
 */
const getActiveSessions = async (userId) => {
    try {
        const result = await pool.query(`
            SELECT id, ip_address, user_agent, device_name, created_at, last_used_at
            FROM user_sessions
            WHERE user_id = $1 AND is_active = TRUE AND expires_at > NOW()
            ORDER BY last_used_at DESC
        `, [userId]);

        return result.rows;
    } catch (error) {
        console.error('[Session] Get sessions error:', error.message);
        return [];
    }
};

/**
 * Generate new access token
 */
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role,
            hospital_id: user.hospital_id
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

/**
 * Cleanup expired sessions (call via cron)
 */
const cleanupExpiredSessions = async () => {
    try {
        const result = await pool.query(`
            DELETE FROM user_sessions 
            WHERE expires_at < NOW() OR is_active = FALSE
        `);
        console.log(`[Session] Cleaned up ${result.rowCount} expired sessions`);
    } catch (error) {
        console.error('[Session] Cleanup error:', error.message);
    }
};

module.exports = {
    createSession,
    validateRefreshToken,
    rotateRefreshToken,
    revokeSession,
    revokeAllSessions,
    getActiveSessions,
    generateRefreshToken,
    generateAccessToken,
    cleanupExpiredSessions
};
