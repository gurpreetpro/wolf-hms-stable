/**
 * Session Routes
 * API endpoints for session management
 * Phase 1: Security Hardening (Gold Standard HMS)
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const sessionService = require('../services/sessionService');

/**
 * GET /api/sessions
 * Get current user's active sessions
 */
router.get('/', protect, async (req, res) => {
    try {
        const sessions = await sessionService.getActiveSessions(req.user.id);
        res.json({ sessions });
    } catch (error) {
        console.error('[Sessions] Error fetching sessions:', error);
        res.status(500).json({ message: 'Failed to fetch sessions' });
    }
});

/**
 * DELETE /api/sessions/:id
 * Revoke a specific session
 */
router.delete('/:id', protect, async (req, res) => {
    try {
        await sessionService.revokeSession(req.params.id);
        res.json({ message: 'Session revoked successfully' });
    } catch (error) {
        console.error('[Sessions] Error revoking session:', error);
        res.status(500).json({ message: 'Failed to revoke session' });
    }
});

/**
 * DELETE /api/sessions
 * Revoke all sessions (logout everywhere)
 */
router.delete('/', protect, async (req, res) => {
    try {
        await sessionService.revokeAllSessions(req.user.id);
        res.json({ message: 'All sessions revoked successfully' });
    } catch (error) {
        console.error('[Sessions] Error revoking all sessions:', error);
        res.status(500).json({ message: 'Failed to revoke sessions' });
    }
});

/**
 * POST /api/sessions/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;
        
        if (!refresh_token) {
            return res.status(400).json({ message: 'Refresh token required' });
        }

        const session = await sessionService.validateRefreshToken(refresh_token);
        
        if (!session) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        // Generate new tokens
        const newAccessToken = sessionService.generateAccessToken({
            id: session.user_id,
            username: session.username,
            role: session.role,
            hospital_id: session.hospital_id
        });

        // Rotate refresh token for security
        const newRefreshToken = sessionService.generateRefreshToken();
        await sessionService.rotateRefreshToken(refresh_token, newRefreshToken, session.id);

        res.json({
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            expires_in: 900 // 15 minutes in seconds
        });
    } catch (error) {
        console.error('[Sessions] Refresh error:', error);
        res.status(500).json({ message: 'Failed to refresh token' });
    }
});

module.exports = router;
