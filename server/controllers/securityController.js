const LoginSecurityService = require('../services/LoginSecurityService');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const pool = require('../config/db');

/**
 * Security Controller — Admin API for Login Security Features
 */

// GET /api/security/audit-log — Login Audit Trail
const getAuditLog = asyncHandler(async (req, res) => {
    const { user_id, action, limit = 50, offset = 0 } = req.query;
    const hospital_id = req.hospital_id;

    const logs = await LoginSecurityService.getLoginHistory({
        hospital_id,
        user_id: user_id ? parseInt(user_id) : null,
        action: action || null,
        limit: parseInt(limit),
        offset: parseInt(offset)
    });

    ResponseHandler.success(res, logs);
});

// GET /api/security/sessions — Active Sessions
const getActiveSessions = asyncHandler(async (req, res) => {
    const hospital_id = req.hospital_id;
    const sessions = await LoginSecurityService.getActiveSessions(hospital_id);
    ResponseHandler.success(res, sessions);
});

// POST /api/security/sessions/:id/revoke — Force Revoke Session
const revokeSession = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await LoginSecurityService.revokeSession(id);
    if (!result) {
        return ResponseHandler.error(res, 'Session not found', 404);
    }

    await LoginSecurityService.logLoginEvent({
        user_id: req.user?.id,
        username: req.user?.username,
        hospital_id: req.hospital_id,
        action: 'SESSION_REVOKED',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        details: { revoked_session_id: id, revoked_user_id: result.user_id }
    });

    ResponseHandler.success(res, { message: 'Session revoked successfully' });
});

// POST /api/security/users/:id/unlock — Admin Unlock Account
const unlockAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    await pool.query(
        'UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = $1',
        [id]
    );

    await LoginSecurityService.logLoginEvent({
        user_id: req.user?.id,
        username: req.user?.username,
        hospital_id: req.hospital_id,
        action: 'ACCOUNT_UNLOCKED',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        details: { unlocked_user_id: parseInt(id) }
    });

    ResponseHandler.success(res, { message: 'Account unlocked successfully' });
});

// POST /api/security/users/:id/revoke-all — Revoke All Sessions for a User
const revokeAllUserSessions = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const count = await LoginSecurityService.revokeAllUserSessions(parseInt(id));
    ResponseHandler.success(res, { message: `${count} session(s) revoked` });
});

// GET /api/security/stats — Security Dashboard Stats
const getSecurityStats = asyncHandler(async (req, res) => {
    const hospital_id = req.hospital_id;

    try {
        const failedRes = await pool.query(
            `SELECT COUNT(*) as cnt FROM login_audit_log 
             WHERE hospital_id = $1 AND action = 'LOGIN_FAILED' 
             AND created_at > NOW() - INTERVAL '24 hours'`,
            [hospital_id]
        );
        const successRes = await pool.query(
            `SELECT COUNT(*) as cnt FROM login_audit_log 
             WHERE hospital_id = $1 AND action = 'LOGIN_SUCCESS' 
             AND created_at > NOW() - INTERVAL '24 hours'`,
            [hospital_id]
        );
        const suspiciousRes = await pool.query(
            `SELECT COUNT(*) as cnt FROM login_audit_log 
             WHERE hospital_id = $1 AND action = 'SUSPICIOUS' 
             AND created_at > NOW() - INTERVAL '24 hours'`,
            [hospital_id]
        );
        const lockedRes = await pool.query(
            `SELECT COUNT(*) as cnt FROM users 
             WHERE hospital_id = $1 AND locked_until > NOW()`,
            [hospital_id]
        );
        const sessionsRes = await pool.query(
            `SELECT COUNT(*) as cnt FROM refresh_tokens rt
             JOIN users u ON rt.user_id = u.id
             WHERE u.hospital_id = $1 AND rt.is_revoked = false AND rt.expires_at > NOW()`,
            [hospital_id]
        );

        ResponseHandler.success(res, {
            failed_logins_24h: parseInt(failedRes.rows[0].cnt),
            successful_logins_24h: parseInt(successRes.rows[0].cnt),
            suspicious_events_24h: parseInt(suspiciousRes.rows[0].cnt),
            locked_accounts: parseInt(lockedRes.rows[0].cnt),
            active_sessions: parseInt(sessionsRes.rows[0].cnt)
        });
    } catch (err) {
        ResponseHandler.success(res, {
            failed_logins_24h: 0, successful_logins_24h: 0,
            suspicious_events_24h: 0, locked_accounts: 0, active_sessions: 0
        });
    }
});

// POST /api/security/validate-password — Password Strength Check
const validatePassword = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const result = LoginSecurityService.validatePasswordStrength(password);
    ResponseHandler.success(res, result);
});

module.exports = {
    getAuditLog, getActiveSessions, revokeSession,
    unlockAccount, revokeAllUserSessions, getSecurityStats, validatePassword
};
