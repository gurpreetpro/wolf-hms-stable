/**
 * Billing Automation Routes
 * Phase 4: Claim Scrubbing, Payment Posting, Collection Workflow
 */

const express = require('express');
const router = express.Router();
const {
    // Claim Scrubbing
    scrubClaim,
    batchScrubClaims,
    getScrubRules,
    // Payment Posting
    autoPostPayment,
    processBatchERA,
    // Collection Workflow
    getCollectionWorklist,
    logCollectionAction,
    createPaymentPlan,
    getAutomationStats
} = require('../controllers/automationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Claim Scrubbing
router.get('/scrub/:claim_id', protect, authorize('admin', 'billing'), scrubClaim);
router.post('/scrub/batch', protect, authorize('admin', 'billing'), batchScrubClaims);
router.get('/scrub/rules', protect, getScrubRules);

// Payment Posting
router.post('/payment/auto-post', protect, authorize('admin', 'billing'), autoPostPayment);
router.post('/payment/process-era', protect, authorize('admin', 'billing'), processBatchERA);

// Collection Workflow
router.get('/collections/worklist', protect, authorize('admin', 'billing'), getCollectionWorklist);
router.post('/collections/log-action', protect, authorize('admin', 'billing'), logCollectionAction);
router.post('/collections/payment-plan', protect, authorize('admin', 'billing'), createPaymentPlan);

// Dashboard Stats
router.get('/stats', protect, authorize('admin', 'billing'), getAutomationStats);

module.exports = router;
