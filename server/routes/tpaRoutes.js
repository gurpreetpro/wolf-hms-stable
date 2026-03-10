/**
 * TPA Routes
 * API routes for TPA/Insurance integration
 * WOLF HMS
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    // Provider Management
    getProviders,
    getProvider,
    addProvider,
    updateProvider,
    deactivateProvider,
    setCredential,
    testConnection,
    getCapabilities,

    // Insurance Operations
    checkEligibility,
    submitPreAuth,
    getPreAuthStatus,
    submitClaim,
    getClaimStatus,

    // PMJAY
    searchPMJAYBeneficiary,
    sendPMJAYOTP,
    verifyPMJAYBeneficiary,
    getPMJAYPackages,

    // Webhooks
    handleNHCXWebhook,
    handlePMJAYWebhook,
    handleTPAWebhook
} = require('../controllers/tpaController');

// ============================================
// Provider Management Routes
// ============================================
router.get('/providers', protect, authorize('admin', 'billing'), getProviders);
router.get('/providers/:code', protect, authorize('admin', 'billing'), getProvider);
router.post('/providers', protect, authorize('admin'), addProvider);
router.put('/providers/:code', protect, authorize('admin'), updateProvider);
router.delete('/providers/:code', protect, authorize('admin'), deactivateProvider);
router.post('/providers/:code/credentials', protect, authorize('admin'), setCredential);
router.post('/providers/:code/test', protect, authorize('admin', 'billing'), testConnection);
router.get('/providers/:code/capabilities', protect, getCapabilities);

// ============================================
// Insurance Operation Routes
// ============================================
router.post('/eligibility/check', protect, authorize('admin', 'billing', 'receptionist'), checkEligibility);

// Pre-authorization
router.post('/preauth/submit', protect, authorize('admin', 'billing'), submitPreAuth);
router.get('/preauth/:providerCode/:preauthId/status', protect, authorize('admin', 'billing'), getPreAuthStatus);

// Claims
router.post('/claims/submit', protect, authorize('admin', 'billing'), submitClaim);
router.get('/claims/:providerCode/:claimId/status', protect, authorize('admin', 'billing'), getClaimStatus);

// ============================================
// PMJAY Routes
// ============================================
router.post('/pmjay/beneficiary/search', protect, authorize('admin', 'billing', 'receptionist'), searchPMJAYBeneficiary);
router.post('/pmjay/beneficiary/send-otp', protect, authorize('admin', 'billing', 'receptionist'), sendPMJAYOTP);
router.post('/pmjay/beneficiary/verify', protect, authorize('admin', 'billing', 'receptionist'), verifyPMJAYBeneficiary);
router.get('/pmjay/packages', protect, getPMJAYPackages);

// ============================================
// Webhook Routes (No auth - signature verified)
// ============================================
router.post('/webhook/nhcx', handleNHCXWebhook);
router.post('/webhook/pmjay', handlePMJAYWebhook);
router.post('/webhook/:providerCode', handleTPAWebhook);

module.exports = router;
