/**
 * AI Billing Controller
 * WOLF HMS - Phase 4 AI Billing Engine
 */

const { getAIBillingEngine } = require('../services/aiBillingEngine');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Predict claim denial risk
 */
const predictDenial = asyncHandler(async (req, res) => {
    const claimData = req.body;
    const engine = getAIBillingEngine();
    const prediction = await engine.predictDenial(claimData);
    ResponseHandler.success(res, prediction);
});

/**
 * Suggest ICD-10 codes from diagnosis text
 */
const suggestICD10Codes = asyncHandler(async (req, res) => {
    const { diagnosis_text } = req.body;

    if (!diagnosis_text) {
        return ResponseHandler.error(res, 'Diagnosis text is required', 400);
    }

    const engine = getAIBillingEngine();
    const suggestions = await engine.suggestICD10Codes(diagnosis_text);
    ResponseHandler.success(res, { suggestions });
});

/**
 * Validate ICD-10 code
 */
const validateICD10Code = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const engine = getAIBillingEngine();
    const result = engine.validateICD10Code(code);
    ResponseHandler.success(res, result);
});

/**
 * Optimize invoice pricing
 */
const optimizePricing = asyncHandler(async (req, res) => {
    const { lineItems, tpaInfo } = req.body;

    if (!lineItems || !Array.isArray(lineItems)) {
        return ResponseHandler.error(res, 'Line items array is required', 400);
    }

    const engine = getAIBillingEngine();
    const result = await engine.optimizePricing(lineItems, tpaInfo);
    ResponseHandler.success(res, result);
});

/**
 * Estimate claim approval amount
 */
const estimateApproval = asyncHandler(async (req, res) => {
    const claimData = req.body;
    const engine = getAIBillingEngine();
    const estimate = await engine.estimateApprovalAmount(claimData);
    ResponseHandler.success(res, estimate);
});

/**
 * Detect billing anomalies
 */
const detectAnomalies = asyncHandler(async (req, res) => {
    const invoiceData = req.body;
    const engine = getAIBillingEngine();
    const result = await engine.detectAnomalies(invoiceData);
    ResponseHandler.success(res, result);
});

/**
 * Get AI billing statistics
 */
const getAIBillingStats = asyncHandler(async (req, res) => {
    const engine = getAIBillingEngine();
    const stats = await engine.getStats();
    ResponseHandler.success(res, stats);
});

/**
 * Batch ICD-10 code lookup
 */
const batchICD10Lookup = asyncHandler(async (req, res) => {
    const { codes } = req.body;

    if (!codes || !Array.isArray(codes)) {
        return ResponseHandler.error(res, 'Codes array is required', 400);
    }

    const engine = getAIBillingEngine();
    const results = codes.map(code => engine.validateICD10Code(code));
    ResponseHandler.success(res, { results });
});

module.exports = {
    predictDenial,
    suggestICD10Codes,
    validateICD10Code,
    optimizePricing,
    estimateApproval,
    detectAnomalies,
    getAIBillingStats,
    batchICD10Lookup
};
