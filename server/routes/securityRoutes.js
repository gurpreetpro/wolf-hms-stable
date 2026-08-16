const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const securityController = require('../controllers/securityController');
const guardController = require('../controllers/security/guardController');

// ============================================
// LOGIN SECURITY ENDPOINTS
// ============================================

// Security Dashboard Stats
router.get('/stats', authenticateToken, securityController.getSecurityStats);

// Login Audit Trail
router.get('/audit-log', authenticateToken, authorize('admin'), securityController.getAuditLog);

// Active Session Management
router.get('/sessions', authenticateToken, authorize('admin'), securityController.getActiveSessions);
router.post('/sessions/:id/revoke', authenticateToken, authorize('admin'), securityController.revokeSession);

// Account Management
router.post('/users/:id/unlock', authenticateToken, authorize('admin'), securityController.unlockAccount);
router.post('/users/:id/revoke-all', authenticateToken, authorize('admin'), securityController.revokeAllUserSessions);

// Password Validation
router.post('/validate-password', authenticateToken, securityController.validatePassword);

// ============================================
// GUARD TRACKING & COMMAND CENTRE ENDPOINTS
// (Used by SecurityDashboardV2.jsx)
// ============================================

// Guard Online Status
router.get('/guards/online', authenticateToken, guardController.getOnlineGuards);

// Active Patrols (alternative endpoint for guard map data)
router.get('/patrols/active', authenticateToken, guardController.getActivePatrols);

// Guard Ping
router.post('/guards/ping', authenticateToken, authorize('admin'), guardController.pingGuard);

// Ping All Guards (broadcast)
router.post('/guards/ping-all', authenticateToken, authorize('admin'), guardController.pingAllGuards);

// Request Photo from Guard
router.post('/guards/request-photo', authenticateToken, authorize('admin'), guardController.requestPhoto);

// Guard Location Update (callable by mobile app or dashboard)
router.post('/location', authenticateToken, guardController.updateLocation);

// Hospital Lockdown
router.post('/lockdown', authenticateToken, authorize('admin'), guardController.toggleLockdown);

// Dispatch Message to Guards
router.post('/dispatch', authenticateToken, authorize('admin'), guardController.sendDispatch);

// Guard Performance Metrics
router.get('/guards/:id/metrics', authenticateToken, guardController.getGuardMetrics);

module.exports = router;
