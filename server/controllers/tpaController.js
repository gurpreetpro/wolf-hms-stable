/**
 * TPA Controller
 * API endpoints for TPA/Insurance management and operations
 * WOLF HMS
 */

const { getTPAService } = require('../services/insurance/TPAServiceManager');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { getHospitalId } = require('../utils/tenantHelper');

// ============================================
// Provider Management (Dashboard)
// ============================================

/**
 * Get all TPA providers
 */
const getProviders = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const tpaService = await getTPAService();
    const includeInactive = req.query.includeInactive === 'true';
    const providers = await tpaService.getProviders(includeInactive, hospitalId);
    ResponseHandler.success(res, providers);
});

/**
 * Get single provider details
 */
const getProvider = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    const provider = await tpaService.getProvider(req.params.code);
    if (!provider) {
        return ResponseHandler.error(res, 'Provider not found', 404);
    }
    ResponseHandler.success(res, provider);
});

/**
 * Add new TPA provider (Dynamic onboarding)
 */
const addProvider = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const tpaService = await getTPAService();
    const provider = await tpaService.addProvider({ ...req.body, hospital_id: hospitalId }, req.user?.id);
    ResponseHandler.success(res, provider, 'Provider added successfully', 201);
});

/**
 * Update TPA provider
 */
const updateProvider = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    const provider = await tpaService.updateProvider(req.params.code, req.body);
    ResponseHandler.success(res, provider);
});

/**
 * Deactivate TPA provider
 */
const deactivateProvider = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    await tpaService.deactivateProvider(req.params.code);
    ResponseHandler.success(res, { message: 'Provider deactivated' });
});

/**
 * Set provider credentials
 */
const setCredential = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    const { key, value, isProduction } = req.body;
    await tpaService.setCredential(req.params.code, key, value, isProduction, req.user?.id);
    ResponseHandler.success(res, { message: 'Credential saved successfully' });
});

/**
 * Test provider connection
 */
const testConnection = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    const result = await tpaService.testConnection(req.params.code);
    ResponseHandler.success(res, result);
});

/**
 * Get provider capabilities
 */
const getCapabilities = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    const adapter = tpaService.getAdapter(req.params.code);
    ResponseHandler.success(res, adapter.getCapabilities());
});

// ============================================
// Insurance Operations
// ============================================

/**
 * Check patient eligibility
 */
const checkEligibility = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const tpaService = await getTPAService();
    const { providerCode, patient, policyNumber } = req.body;

    if (!providerCode || !policyNumber) {
        return ResponseHandler.error(res, 'providerCode and policyNumber required', 400);
    }

    const result = await tpaService.checkEligibility(providerCode, patient, policyNumber, hospitalId);
    ResponseHandler.success(res, result);
});

/**
 * Submit pre-authorization
 */
const submitPreAuth = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const tpaService = await getTPAService();
    const { providerCode, ...preauthData } = req.body;
    preauthData.createdBy = req.user?.id;
    preauthData.hospital_id = hospitalId;

    const result = await tpaService.submitPreAuth(providerCode, preauthData);
    ResponseHandler.success(res, result);
});

/**
 * Get pre-auth status
 */
const getPreAuthStatus = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    const result = await tpaService.getPreAuthStatus(req.params.providerCode, req.params.preauthId);
    ResponseHandler.success(res, result);
});

/**
 * Submit claim
 */
const submitClaim = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const tpaService = await getTPAService();
    const { providerCode, ...claimData } = req.body;
    claimData.createdBy = req.user?.id;
    claimData.hospital_id = hospitalId;

    const result = await tpaService.submitClaim(providerCode, claimData);
    ResponseHandler.success(res, result);
});

/**
 * Get claim status
 */
const getClaimStatus = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    const result = await tpaService.getClaimStatus(req.params.providerCode, req.params.claimId);
    ResponseHandler.success(res, result);
});

// ============================================
// PMJAY Specific
// ============================================

/**
 * Search PMJAY beneficiary
 */
const searchPMJAYBeneficiary = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    const adapter = tpaService.getAdapter('pmjay');
    const result = await adapter.searchBeneficiary(req.body);
    ResponseHandler.success(res, result);
});

/**
 * Send PMJAY verification OTP
 */
const sendPMJAYOTP = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    const adapter = tpaService.getAdapter('pmjay');
    const result = await adapter.sendVerificationOTP(req.body.aadhaarNumber);
    ResponseHandler.success(res, result);
});

/**
 * Verify PMJAY beneficiary
 */
const verifyPMJAYBeneficiary = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    const adapter = tpaService.getAdapter('pmjay');
    const result = await adapter.verifyBeneficiary(req.body, req.body.kycMethod);
    ResponseHandler.success(res, result);
});

/**
 * Get PMJAY packages
 */
const getPMJAYPackages = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    const adapter = tpaService.getAdapter('pmjay');
    const packages = await adapter.getPackages(req.query.specialty);
    ResponseHandler.success(res, packages);
});

// ============================================
// Webhooks
// ============================================

/**
 * Handle NHCX webhook
 */
const handleNHCXWebhook = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    const adapter = tpaService.getAdapter('nhcx');
    const result = await adapter.handleWebhook(req.body, req.headers['x-signature']);

    if (result.valid) {
        // Process the webhook event
        console.log('[NHCX Webhook]', result.event, result.data);
    }

    ResponseHandler.success(res, { received: true });
});

/**
 * Handle PMJAY/NHA webhook
 */
const handlePMJAYWebhook = asyncHandler(async (req, res) => {
    const tpaService = await getTPAService();
    const adapter = tpaService.getAdapter('pmjay');
    const result = await adapter.handleWebhook(req.body, req.headers['x-signature']);

    if (result.valid) {
        console.log('[PMJAY Webhook]', result.event, result.data);
    }

    ResponseHandler.success(res, { received: true });
});

/**
 * Generic TPA webhook handler
 */
const handleTPAWebhook = asyncHandler(async (req, res) => {
    const { providerCode } = req.params;
    const tpaService = await getTPAService();
    const adapter = tpaService.getAdapter(providerCode);

    if (typeof adapter.handleWebhook === 'function') {
        const result = await adapter.handleWebhook(req.body, req.headers['x-signature']);
        console.log(`[${providerCode} Webhook]`, result);
    }

    ResponseHandler.success(res, { received: true });
});

module.exports = {
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
};
