const express = require('express');
const router = express.Router();
const { getPatientAlerts, getAllActiveAlerts, acknowledgeAlert, triggerDuress } = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/duress', protect, triggerDuress); // Any authenticated staff can trigger
router.get('/', getAllActiveAlerts); // Public for dev/nurse dashboard (add protect later)
router.get('/patient/:patient_id', protect, getPatientAlerts);
router.patch('/:id/acknowledge', protect, authorize('doctor', 'admin', 'nurse'), acknowledgeAlert);

module.exports = router;
