/**
 * ABDM Controller
 * WOLF HMS - Phase 3 ABDM Compliance
 */

const { getABDMService } = require('../services/abdmService');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Verify ABHA number
 */
const verifyABHA = asyncHandler(async (req, res) => {
    const { abha_number } = req.body;

    if (!abha_number) {
        return ResponseHandler.error(res, 'ABHA number is required', 400);
    }

    const service = getABDMService();
    const result = await service.verifyABHANumber(abha_number);
    ResponseHandler.success(res, result);
});

/**
 * Link ABHA to patient
 */
const linkABHAToPatient = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const { abha_number, profile } = req.body;

    const service = getABDMService();
    const linked = await service.linkABHAToPatient(patient_id, abha_number, profile);
    ResponseHandler.success(res, { message: 'ABHA linked successfully', linked }, 'ABHA linked successfully');
});

/**
 * Get patient's ABHA details
 */
const getPatientABHA = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const service = getABDMService();
    const abha = await service.getPatientABHA(patient_id);
    ResponseHandler.success(res, abha || { linked: false });
});

/**
 * Create consent request
 */
const createConsentRequest = asyncHandler(async (req, res) => {
    const consentData = {
        ...req.body,
        requester_name: 'WOLF HMS'
    };

    const service = getABDMService();
    const consent = await service.createConsentRequest(consentData);
    ResponseHandler.success(res, { message: 'Consent request created', consent }, 'Consent request created', 201);
});

/**
 * Update consent status (simulate TPA callback)
 */
const updateConsentStatus = asyncHandler(async (req, res) => {
    const { consent_id } = req.params;
    const { status, artefact } = req.body;

    const service = getABDMService();
    const consent = await service.updateConsentStatus(consent_id, status, artefact);
    ResponseHandler.success(res, { message: 'Consent updated', consent });
});

/**
 * Get patient's consents
 */
const getPatientConsents = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const service = getABDMService();
    const consents = await service.getPatientConsents(patient_id);
    ResponseHandler.success(res, { consents });
});

/**
 * Get pending consent requests
 */
const getPendingConsents = asyncHandler(async (req, res) => {
    const service = getABDMService();
    const consents = await service.getPendingConsents();
    ResponseHandler.success(res, { consents });
});

/**
 * Generate FHIR bundle for patient
 */
const generateFHIRBundle = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const { hi_types } = req.query;

    const hiTypeList = hi_types ? hi_types.split(',') : ['Prescription', 'DiagnosticReport'];

    const service = getABDMService();
    const bundle = await service.createFHIRBundle(patient_id, hiTypeList);
    ResponseHandler.success(res, bundle);
});

/**
 * Create care context
 */
const createCareContext = asyncHandler(async (req, res) => {
    const contextData = req.body;
    const service = getABDMService();
    const context = await service.createCareContext(contextData);
    ResponseHandler.success(res, { message: 'Care context created', context }, 'Care context created', 201);
});

/**
 * Get patient's care contexts
 */
const getPatientCareContexts = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const service = getABDMService();
    const contexts = await service.getPatientCareContexts(patient_id);
    ResponseHandler.success(res, { contexts });
});

/**
 * Link care context to ABHA
 */
const linkCareContext = asyncHandler(async (req, res) => {
    const { context_id } = req.params;
    const service = getABDMService();
    const context = await service.linkCareContextToABHA(context_id);
    ResponseHandler.success(res, { message: 'Care context linked to ABHA', context });
});

/**
 * Get ABDM statistics
 */
const getABDMStats = asyncHandler(async (req, res) => {
    const service = getABDMService();
    const stats = await service.getABDMStats();
    ResponseHandler.success(res, stats);
});

/**
 * ABDM Callback handler (for gateway notifications)
 */
const handleABDMCallback = asyncHandler(async (req, res) => {
    console.log('[ABDM] Callback received:', JSON.stringify(req.body));

    // Log the callback
    const service = getABDMService();
    await service.logTransaction('callback', 'IN', req.path, req.body);

    // Process based on callback type
    const { requestId, acknowledgement, hiRequest, consent } = req.body;

    // Acknowledge receipt
    ResponseHandler.success(res, { status: 'OK', requestId });
});

module.exports = {
    verifyABHA,
    linkABHAToPatient,
    getPatientABHA,
    createConsentRequest,
    updateConsentStatus,
    getPatientConsents,
    getPendingConsents,
    generateFHIRBundle,
    createCareContext,
    getPatientCareContexts,
    linkCareContext,
    getABDMStats,
    handleABDMCallback
};
