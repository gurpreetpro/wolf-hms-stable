const express = require('express');
const router = express.Router();
const icuController = require('../controllers/icuController');
const { protect } = require('../middleware/authMiddleware');

/**
 * 🫁 ICU Critical Care Routes
 * Prefixed under /api/icu
 */

// Ventilator Telemetry Logs
router.post('/ventilator-logs', protect, icuController.logVentilatorMetrics);
router.get('/ventilator-logs/:admissionId', protect, icuController.getVentilatorHistory);

// Hourly Fluid Intake / Output (I/O) Charting
router.post('/fluid-io', protect, icuController.logFluidIO);
router.get('/fluid-io/:admissionId', protect, icuController.getFluidIOHistory);

module.exports = router;
