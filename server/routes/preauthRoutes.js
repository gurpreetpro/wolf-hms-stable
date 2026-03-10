/**
 * Pre-Authorization Routes
 * Insurance eligibility and pre-auth workflow
 */

const express = require('express');
const router = express.Router();
const {
    getInsuranceProviders,
    getPatientInsurance,
    savePatientInsurance,
    verifyEligibility,
    getPreauthRequests,
    getPreauthStats,
    createPreauthRequest,
    updatePreauthStatus
} = require('../controllers/preauthController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Insurance Providers
router.get('/providers', protect, getInsuranceProviders);

// Patient Insurance
router.get('/patient/:patient_id/insurance', protect, getPatientInsurance);
router.post('/patient/insurance', protect, authorize('admin', 'receptionist', 'billing'), savePatientInsurance);

// Eligibility Verification
router.post('/verify-eligibility', protect, authorize('admin', 'receptionist', 'billing'), verifyEligibility);

// Pre-Authorization Requests
router.get('/requests', protect, authorize('admin', 'billing'), getPreauthRequests);
router.get('/stats', protect, authorize('admin', 'billing'), getPreauthStats);
router.post('/request', protect, authorize('admin', 'billing', 'doctor'), createPreauthRequest);
router.put('/request/:id/status', protect, authorize('admin', 'billing'), updatePreauthStatus);

module.exports = router;
