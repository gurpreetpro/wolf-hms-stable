const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Entry (Guard Only)
router.post('/entry', protect, authorize('admin', 'security_guard'), parkingController.vehicleEntry);

// Exit Calculation (Guard Only)
router.get('/exit-calc', protect, authorize('admin', 'security_guard'), parkingController.vehicleExitCalculation);

// Confirm Exit/Payment (Guard Only)
router.post('/exit-confirm', protect, authorize('admin', 'security_guard'), parkingController.confirmExit);

// Phase 18: Circumstances
router.post('/inspection_log', protect, authorize('admin', 'security_guard'), parkingController.logInspection);
router.post('/violation_log', protect, authorize('admin', 'security_guard'), parkingController.logViolation);

// Stats (Admin/Dash)
router.get('/stats', protect, authorize('admin', 'security_manager'), parkingController.getParkingStats);

module.exports = router;
