const express = require('express');
const router = express.Router();
const { triggerEmergency, respondToEmergency, getActiveEmergency, resolveEmergency, getAlertConfig } = require('../controllers/emergencyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/config', protect, getAlertConfig); // Get alert routing config
router.post('/trigger', protect, triggerEmergency);
router.get('/status', protect, getActiveEmergency);
router.post('/resolve', protect, authorize('admin', 'anaesthetist', 'doctor', 'ward_incharge', 'nurse'), resolveEmergency);
router.post('/respond', protect, authorize('admin', 'anaesthetist', 'doctor'), respondToEmergency);

module.exports = router;
