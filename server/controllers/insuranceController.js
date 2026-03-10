/**
 * Insurance Controller - Multi-Tenant
 */
const { getInsuranceService } = require('../services/insuranceService');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const getProviders = asyncHandler(async (req, res) => {
    const service = getInsuranceService();
    const providers = await service.getProviders();
    ResponseHandler.success(res, { providers });
});

const verifyPolicy = asyncHandler(async (req, res) => {
    const { policy_number, provider_id } = req.body;
    if (!policy_number || !provider_id) {
        return ResponseHandler.error(res, 'Policy number and provider are required', 400);
    }
    const service = getInsuranceService();
    const result = await service.verifyPolicy(policy_number, provider_id);
    ResponseHandler.success(res, result);
});

const linkPatientInsurance = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const service = getInsuranceService();
    const insurance = await service.linkPatientInsurance(patient_id, req.body);
    ResponseHandler.success(res, { message: 'Insurance linked successfully', insurance });
});

const getPatientInsurance = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const service = getInsuranceService();
    const policies = await service.getPatientInsurance(patient_id);
    ResponseHandler.success(res, { policies });
});

const createPreAuth = asyncHandler(async (req, res) => {
    const preauthData = { ...req.body, requested_by: req.user?.id };
    const service = getInsuranceService();
    const preauth = await service.createPreAuth(preauthData);
    ResponseHandler.success(res, { message: 'Pre-authorization submitted', preauth });
});

const getPreAuthStatus = asyncHandler(async (req, res) => {
    const { preauth_number } = req.params;
    const service = getInsuranceService();
    const preauth = await service.getPreAuthStatus(preauth_number);
    if (!preauth) {
        return ResponseHandler.error(res, 'Pre-authorization not found', 404);
    }
    ResponseHandler.success(res, preauth);
});

const updatePreAuth = asyncHandler(async (req, res) => {
    const { preauth_id } = req.params;
    const service = getInsuranceService();
    const preauth = await service.updatePreAuth(preauth_id, req.body);
    ResponseHandler.success(res, { message: 'Pre-authorization updated', preauth });
});

const getAdmissionPreAuths = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = getHospitalId(req);
    const pool = require('../config/db');
    const result = await pool.query(`
        SELECT pr.*, ip.short_name as provider_name FROM preauth_requests pr
        LEFT JOIN patient_insurance pi ON pr.patient_insurance_id = pi.id
        LEFT JOIN insurance_providers ip ON pi.provider_id = ip.id
        WHERE pr.admission_id = $1 AND (pr.hospital_id = $2 OR pr.hospital_id IS NULL) ORDER BY pr.requested_at DESC
    `, [admission_id, hospitalId]);
    ResponseHandler.success(res, { preauths: result.rows });
});

const createClaim = asyncHandler(async (req, res) => {
    const service = getInsuranceService();
    const claim = await service.createClaim(req.body);
    ResponseHandler.success(res, { message: 'Claim submitted', claim });
});

const getClaimDetails = asyncHandler(async (req, res) => {
    const { claim_number } = req.params;
    const service = getInsuranceService();
    const claim = await service.getClaimDetails(claim_number);
    if (!claim) {
        return ResponseHandler.error(res, 'Claim not found', 404);
    }
    ResponseHandler.success(res, claim);
});

const updateClaim = asyncHandler(async (req, res) => {
    const service = getInsuranceService();
    const claim = await service.updateClaim(req.params.claim_id, req.body);
    ResponseHandler.success(res, { message: 'Claim updated', claim });
});

const settleClaim = asyncHandler(async (req, res) => {
    const { claim_id } = req.params;
    const { settlement_amount, utr_number } = req.body;
    const service = getInsuranceService();
    const claim = await service.settleClaim(claim_id, { settlement_amount, utr_number });
    ResponseHandler.success(res, { message: 'Claim settled', claim });
});

const getPendingClaims = asyncHandler(async (req, res) => {
    const service = getInsuranceService();
    const claims = await service.getPendingClaims();
    ResponseHandler.success(res, { claims });
});

const getClaimStats = asyncHandler(async (req, res) => {
    const service = getInsuranceService();
    const stats = await service.getClaimStats();
    ResponseHandler.success(res, stats);
});

const getDenialCodes = asyncHandler(async (req, res) => {
    const service = getInsuranceService();
    const codes = await service.getDenialCodes();
    ResponseHandler.success(res, { codes });
});

const predictDenialRisk = asyncHandler(async (req, res) => {
    const service = getInsuranceService();
    const risk = await service.predictDenialRisk(req.body);
    ResponseHandler.success(res, risk);
});

module.exports = {
    getProviders, verifyPolicy, linkPatientInsurance, getPatientInsurance,
    createPreAuth, getPreAuthStatus, updatePreAuth, getAdmissionPreAuths,
    createClaim, getClaimDetails, updateClaim, settleClaim,
    getPendingClaims, getClaimStats, getDenialCodes, predictDenialRisk
};
