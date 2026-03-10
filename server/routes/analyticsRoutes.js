const express = require('express');
const router = express.Router();
const {
    getDoctorStats, getPatientStats, getActivityStats,
    getReadmissionRisk, getBedDemandForecast, getDiseaseRegistries,
    getNabhReadiness, getHL7Messages, checkDrugInteractions
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Original routes
router.get('/doctors', protect, authorize('admin'), getDoctorStats);
router.get('/patients', protect, authorize('admin'), getPatientStats);
router.get('/activity', protect, authorize('admin'), getActivityStats);

// Phase 5: S-Tier Backend APIs
router.get('/readmission-risk', protect, authorize('admin', 'doctor'), getReadmissionRisk);
router.get('/bed-forecast', protect, authorize('admin'), getBedDemandForecast);
router.get('/disease-registries', protect, authorize('admin', 'doctor'), getDiseaseRegistries);
router.get('/nabh-readiness', protect, authorize('admin'), getNabhReadiness);
router.get('/hl7-messages', protect, authorize('admin'), getHL7Messages);
router.post('/drug-interactions/check', protect, authorize('admin', 'doctor'), checkDrugInteractions);

module.exports = router;
