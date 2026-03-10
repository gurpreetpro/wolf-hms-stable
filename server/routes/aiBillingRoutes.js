/**
 * AI Billing Routes
 * WOLF HMS - Phase 4 AI Billing Engine
 */

const express = require('express');
const router = express.Router();
const {
    predictDenial,
    suggestICD10Codes,
    validateICD10Code,
    optimizePricing,
    estimateApproval,
    detectAnomalies,
    getAIBillingStats,
    batchICD10Lookup
} = require('../controllers/aiBillingController');

// Denial Prediction
router.post('/predict-denial', predictDenial);

// ICD-10 Auto-Coding
router.post('/icd10/suggest', suggestICD10Codes);
router.get('/icd10/validate/:code', validateICD10Code);
router.post('/icd10/batch', batchICD10Lookup);

// Price Optimization
router.post('/optimize-pricing', optimizePricing);
router.post('/estimate-approval', estimateApproval);

// Anomaly Detection
router.post('/detect-anomalies', detectAnomalies);

// Statistics
router.get('/stats', getAIBillingStats);

module.exports = router;
