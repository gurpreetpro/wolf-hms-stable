const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const { createTenantStorage, preFetchHospitalCode } = require('../middleware/tenantUpload');
const securityController = require('../controllers/securityController');
const guardController = require('../controllers/security/guardController');

// Blueprint upload configuration
const blueprintUpload = multer({
    storage: createTenantStorage('blueprints'),
    limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Blueprint file type not allowed (${file.mimetype}). PNG, JPEG, WebP, SVG supported.`), false);
        }
    }
});

// ============================================
// LOGIN SECURITY ENDPOINTS
// ============================================

// Security Dashboard Stats
router.get('/stats', authenticateToken, securityController.getSecurityStats);

// Login Audit Trail
router.get('/audit-log', authenticateToken, authorize('admin'), securityController.getAuditLog);

// Active Session Management
router.get('/sessions', authenticateToken, authorize('admin'), securityController.getActiveSessions);
router.all('/sessions/:id/revoke', authenticateToken, authorize('admin'), securityController.revokeSession);

// Account Management
router.all('/users/:id/unlock', authenticateToken, authorize('admin'), securityController.unlockAccount);
router.all('/users/:id/revoke-all', authenticateToken, authorize('admin'), securityController.revokeAllUserSessions);

// Password Validation
router.all('/validate-password', authenticateToken, securityController.validatePassword);

// Visitor Check-In
router.post('/visitors/check-in', authenticateToken, guardController.checkInVisitor);

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
router.get('/guard/:id/metrics', authenticateToken, guardController.getGuardMetrics);

// Guard Shift Handover History
router.get('/handover/:id', authenticateToken, guardController.getHandoverHistory);

// ============================================
// NEW WOLF GUARD PRODUCTION ENDPOINTS
// (Phase 1-2: Floor Plans, Geofences, SOS, Incidents, Missions, Patrols)
// ============================================

// Hospital Buildings
router.get('/buildings', authenticateToken, guardController.getHospitalBuildings);

// Command Map (combined dashboard load)
router.get('/command/map', authenticateToken, guardController.getCommandMap);

// Floor Plans & Studio Endpoints (used by FloorPlanManager.jsx & FloorPlanStudioModal.jsx)
router.get('/maps/active', authenticateToken, guardController.getActiveMap);
router.post('/maps', authenticateToken, authorize('admin'), guardController.saveFloorMap);
router.post('/maps/upload', authenticateToken, authorize('admin'), preFetchHospitalCode, blueprintUpload.single('blueprint'), guardController.uploadBlueprint);
router.post('/maps/calibrate', authenticateToken, authorize('admin'), guardController.calibrateFloorPlan);
router.get('/maps/:id/zones', authenticateToken, guardController.getFloorZones);
router.post('/maps/:id/zones', authenticateToken, authorize('admin'), guardController.createFloorZone);
router.post('/maps/:id/corridors', authenticateToken, authorize('admin'), guardController.saveCorridorGraph);
router.get('/maps/:id', authenticateToken, guardController.getFloorPlan);
router.delete('/zones/:zoneId', authenticateToken, authorize('admin'), guardController.deleteFloorZone);

// Geofences
router.get('/geofences', authenticateToken, guardController.getGeofences);

// Security Visitors (dashboard calls GET /api/security/visitors)
router.get('/visitors', authenticateToken, guardController.getSecurityVisitors);

// Incidents (GET must precede POST for /incidents)
router.get('/incidents', authenticateToken, guardController.getIncidents);
router.post('/incidents', authenticateToken, guardController.createIncident);

// Incident status update (both `/status` and bare `/:id` for dashboard compat)
router.put('/incidents/:id/status', authenticateToken, guardController.updateIncidentStatus);
router.put('/incidents/:id', authenticateToken, guardController.updateIncidentStatus);

// SOS & Incidents
router.post('/sos', authenticateToken, guardController.triggerSOS);

// Missions (real security_missions table)
router.get('/missions', authenticateToken, guardController.getMissions);

// Security Gates CRUD
router.get('/gates', authenticateToken, guardController.getGates);
router.post('/gates/:id/toggle', authenticateToken, authorize('admin'), guardController.toggleGate);

// Sensor Logs (WGM accelerometer/gyro)
router.post('/sensor-logs', authenticateToken, guardController.logSensorData);

// Voice Token (stub for now)
router.post('/voice/token', authenticateToken, guardController.getVoiceToken);

// Command ping alias
router.post('/command/ping', authenticateToken, guardController.pingGuard);

// Patrols (route_name matches WGM payload)
router.post('/patrols/start', authenticateToken, guardController.startPatrol);
router.put('/patrols/:patrolId/end', authenticateToken, guardController.endPatrol);
router.put('/patrols/:patrolId/checkpoint', authenticateToken, guardController.recordCheckpoint);

module.exports = router;
