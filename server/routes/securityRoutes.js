const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Incidents
router.get('/incidents', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.getIncidents);
router.post('/incidents', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.createIncident);
router.put('/incidents/:id/status', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.updateIncidentStatus);

// Visitors
router.get('/visitors', protect, authorize('admin', 'security_guard', 'security_manager', 'receptionist'), securityController.getVisitors);
router.post('/visitors/check-in', protect, authorize('admin', 'security_guard', 'security_manager', 'receptionist'), securityController.checkInVisitor);
router.put('/visitors/:id/check-out', protect, authorize('admin', 'security_guard', 'security_manager', 'receptionist'), securityController.checkOutVisitor);

// Patrols
router.get('/patrols/active', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.getActivePatrols);
router.post('/patrols/start', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.startPatrol);
router.put('/patrols/:id/checkpoint', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.updatePatrolCheckpoint);
router.put('/patrols/:id/end', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.endPatrol);

// System Control
router.post('/lockdown', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.toggleLockdown);

// Wolf Voice
router.post('/voice/token', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.getVoiceToken);

// SCC: Gates
router.get('/gates', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.getGates);
router.post('/gates/:id/toggle', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.toggleGate);

// SCC: Missions
router.get('/missions', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.getMissions);
router.post('/missions/dispatch', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.dispatchMission);

// SCC - Phase 4 (Wolf Voice)
router.post('/voice/command', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.processVoiceCommand);

// SCC - Phase 5 (Command & Control)
router.post('/dispatch', protect, authorize('admin', 'security_manager'), securityController.sendDispatch);
router.post('/sos', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.handlePanicButton);

// SCC - Phase 4.1 (Overwatch / Tracking)
router.get('/geofences', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.getGeofences);
router.post('/location', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.updateLocation);
router.post('/sensor-logs', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.logSensorData);

// SCC - Phase 1 (Command & Control)
router.get('/command/map', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.getCommandMap);
router.post('/command/ping', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.requestGuardLocation);

// Phase 7 - Guard Command Centre Dashboard
router.get('/guards/online', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.getOnlineGuards);
router.post('/guards/ping-all', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.pingAllGuards);
router.post('/guards/request-photo', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.requestPhoto);

// Floor Plan Maps (Phase 10)
router.post('/maps', protect, authorize('admin', 'security_manager'), securityController.saveFloorPlan);
router.get('/maps/active', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.getActiveFloorPlan);

// Location History & Mapping (Phase 11)
router.get('/guard/:id/history', protect, authorize('admin', 'security_manager'), securityController.getGuardLocationHistory);
router.post('/mapping/start', protect, authorize('admin', 'security_manager'), securityController.startMappingSession);
router.post('/mapping/stop', protect, authorize('admin', 'security_manager'), securityController.stopMappingSession);

// Phase 14: Analytics
router.get('/guard/:id/metrics', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.getGuardMetrics);

// Digital Logbook (Phase 13)
router.post('/handover', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.submitHandover);
router.get('/handover/:guardId', protect, authorize('admin', 'security_guard', 'security_manager'), securityController.getHandoverHistory);

module.exports = router;
