const express = require('express');
const router = express.Router();
const consentController = require('../controllers/consentController');
const { protect } = require('../middleware/authMiddleware'); // Assuming this exists or similar

// All routes require authentication
// In real world, might require specific role (e.g. DATA_OFFICER or the Patient themselves)
// using 'protect' for now.

router.post('/log', protect, consentController.logConsent);
router.get('/history/:patient_id', protect, consentController.getConsentHistory);
router.post('/revoke', protect, consentController.revokeConsent);

module.exports = router;
