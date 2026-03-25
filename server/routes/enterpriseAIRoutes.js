/**
 * Enterprise AI Routes — Phase 8
 * 16 endpoints across 4 AI pillars
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

const {
    // Revenue Cycle
    scrubClaim, autoCodDRG, generateAppeal, detectLeakage,
    // Supply Chain
    forecastSurgical, detectSpikes, smartPO, expiryRisk,
    // Clinical AI
    checkPathway, readmissionRisk, sepsisScreen,
    // Ops Center
    bedIntelligence, staffWorkload, erSurge, performanceScorecard,
} = require('../controllers/enterpriseAIController');

// ══════════════════════════════════════════════════
// PILLAR 1: REVENUE CYCLE & CLAIMS AI 
// ══════════════════════════════════════════════════
router.get('/revenue/scrub/:invoiceId', protect, authorize('admin', 'billing'), scrubClaim);
router.get('/revenue/drg/:admissionId', protect, authorize('admin', 'doctor', 'billing'), autoCodDRG);
router.post('/revenue/appeal/:invoiceId', protect, authorize('admin', 'billing'), generateAppeal);
router.get('/revenue/leakage/:admissionId', protect, authorize('admin', 'billing'), detectLeakage);

// ══════════════════════════════════════════════════
// PILLAR 2: SUPPLY CHAIN INTELLIGENCE
// ══════════════════════════════════════════════════
router.get('/supply/surgical-forecast', protect, authorize('admin', 'pharmacist'), forecastSurgical);
router.get('/supply/disease-spikes', protect, authorize('admin', 'doctor'), detectSpikes);
router.post('/supply/smart-po', protect, authorize('admin', 'pharmacist'), smartPO);
router.get('/supply/expiry-risk', protect, authorize('admin', 'pharmacist'), expiryRisk);

// ══════════════════════════════════════════════════
// PILLAR 3: CLINICAL AI
// ══════════════════════════════════════════════════
router.get('/clinical/pathway/:admissionId', protect, authorize('admin', 'doctor'), checkPathway);
router.get('/clinical/readmission-risk/:patientId', protect, authorize('admin', 'doctor'), readmissionRisk);
router.get('/clinical/sepsis-screen/:admissionId', protect, authorize('admin', 'doctor', 'nurse'), sepsisScreen);

// ══════════════════════════════════════════════════
// PILLAR 4: OPERATIONAL COMMAND CENTER
// ══════════════════════════════════════════════════
router.get('/ops/beds', protect, bedIntelligence);
router.get('/ops/staff-workload', protect, authorize('admin'), staffWorkload);
router.get('/ops/er-surge', protect, erSurge);
router.get('/ops/scorecard', protect, authorize('admin'), performanceScorecard);

module.exports = router;
