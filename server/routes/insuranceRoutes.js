/**
 * Insurance Routes
 * WOLF HMS - Phase 2 Insurance/TPA Integration
 */

const express = require('express');
const router = express.Router();
const {
    getProviders,
    verifyPolicy,
    linkPatientInsurance,
    getPatientInsurance,
    createPreAuth,
    getPreAuthStatus,
    updatePreAuth,
    getAdmissionPreAuths,
    createClaim,
    getClaimDetails,
    updateClaim,
    settleClaim,
    getPendingClaims,
    getClaimStats,
    getDenialCodes,
    predictDenialRisk
} = require('../controllers/insuranceController');

// Providers
router.get('/providers', getProviders);

// Policy Verification
router.post('/verify', verifyPolicy);

// Patient Insurance
router.get('/patient/:patient_id', getPatientInsurance);
router.post('/patient/:patient_id/link', linkPatientInsurance);

// Pre-Authorization
router.post('/preauth', createPreAuth);
router.get('/preauth/:preauth_number', getPreAuthStatus);
router.put('/preauth/:preauth_id', updatePreAuth);
router.get('/preauth/admission/:admission_id', getAdmissionPreAuths);

// Claims
router.get('/claims/pending', getPendingClaims);
router.get('/claims/stats', getClaimStats);
router.post('/claims', createClaim);
router.get('/claims/:claim_number', getClaimDetails);
router.put('/claims/:claim_id', updateClaim);
router.post('/claims/:claim_id/settle', settleClaim);

// HCX Async Webhook - Mounted separately in server.js as /api/callbacks/hcx
// const { handleWebhook } = require('../controllers/HcxWebhookController');
// router.post('/webhook/hcx', handleWebhook);

// AI
router.get('/denial-codes', getDenialCodes);
router.post('/predict-denial', predictDenialRisk);


module.exports = router;
