/**
 * Government Scheme Controller
 * API endpoints for CGHS, ECHS, CAPF rate lookup, beneficiary management, and empanelment
 * WOLF HMS
 */

const govtRateService = require('../services/insurance/GovtRateService');
const asyncHandler = require('express-async-handler');
const ResponseHandler = require('../utils/responseHandler');
const { getHospitalId } = require('../utils/tenantHelper');

// ============================================
// Rate Lookup
// ============================================

/**
 * GET /:scheme/packages — List packages with filters
 */
const getSchemePackages = asyncHandler(async (req, res) => {
    const { scheme } = req.params;
    const { specialty, procedureType, requiresPreauth, isDaycare, limit, offset, search } = req.query;
    const hospitalId = getHospitalId(req);

    if (search) {
        const packages = await govtRateService.searchPackages(scheme, search, parseInt(limit) || 20, hospitalId);
        return ResponseHandler.success(res, packages, `Found ${packages.length} packages`);
    }

    const packages = await govtRateService.getPackages(scheme, {
        specialty,
        procedureType,
        requiresPreauth: requiresPreauth !== undefined ? requiresPreauth === 'true' : undefined,
        isDaycare: isDaycare !== undefined ? isDaycare === 'true' : undefined,
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0
    });

    ResponseHandler.success(res, packages, `${scheme.toUpperCase()} packages`);
});

/**
 * GET /:scheme/packages/:code — Single package with calculated rate
 */
const getPackageRate = asyncHandler(async (req, res) => {
    const { scheme, code } = req.params;
    const { cityTier, ward, nabh, superSpecialty } = req.query;

    const hospitalConfig = {
        nabh: nabh !== 'false',
        cityTier: cityTier || 'X',
        wardType: ward || 'semi_private',
        isSuperSpecialty: superSpecialty === 'true'
    };

    const rateData = await govtRateService.calculateRate(scheme, code, hospitalConfig);
    ResponseHandler.success(res, rateData, 'Rate calculated');
});

/**
 * GET /:scheme/specialties — List specialties
 */
const getSchemeSpecialties = asyncHandler(async (req, res) => {
    const specialties = await govtRateService.getSpecialties(req.params.scheme);
    ResponseHandler.success(res, specialties, 'Specialties');
});

/**
 * POST /:scheme/calculate-claim — Calculate multi-procedure claim
 */
const calculateClaim = asyncHandler(async (req, res) => {
    const { scheme } = req.params;
    const { procedures, cityTier, ward, nabh, superSpecialty } = req.body;

    if (!procedures || !Array.isArray(procedures) || procedures.length === 0) {
        return res.status(400).json({ success: false, error: 'procedures array is required' });
    }

    const hospitalConfig = {
        nabh: nabh !== false,
        cityTier: cityTier || 'X',
        wardType: ward || 'semi_private',
        isSuperSpecialty: superSpecialty || false
    };

    const bill = await govtRateService.calculateBill(scheme, procedures, hospitalConfig);
    ResponseHandler.success(res, bill, 'Bill calculated with all modifiers applied');
});

/**
 * POST /:scheme/compare-rates — Compare across CGHS/ECHS/PMJAY
 */
const compareSchemeRates = asyncHandler(async (req, res) => {
    const { packageSuffix, cityTier, ward } = req.body;

    if (!packageSuffix) {
        return res.status(400).json({ success: false, error: 'packageSuffix is required' });
    }

    const comparison = await govtRateService.compareRates(packageSuffix, {
        nabh: true,
        cityTier: cityTier || 'X',
        wardType: ward || 'semi_private'
    });

    ResponseHandler.success(res, comparison, 'Rate comparison');
});

/**
 * GET /:scheme/modifiers — Get rate pricing rules
 */
const getModifiers = asyncHandler(async (req, res) => {
    const modifiers = await govtRateService.getModifiers(req.params.scheme);
    ResponseHandler.success(res, modifiers, 'Rate modifiers');
});

/**
 * GET /:scheme/stats — Statistics
 */
const getSchemeStats = asyncHandler(async (req, res) => {
    const stats = await govtRateService.getStats(req.params.scheme);
    ResponseHandler.success(res, stats, `${req.params.scheme.toUpperCase()} statistics`);
});

// ============================================
// Ward Entitlement Helper
// ============================================

/**
 * GET /ward-entitlement/:basicPay — Determine ward from 7th CPC pay
 */
const getWardEntitlement = asyncHandler(async (req, res) => {
    const basicPay = parseInt(req.params.basicPay);
    if (isNaN(basicPay)) {
        return res.status(400).json({ success: false, error: 'Valid basic pay amount required' });
    }

    const ward = govtRateService.getWardEntitlement(basicPay);
    ResponseHandler.success(res, {
        basicPay,
        wardEntitlement: ward,
        rules: {
            general: 'Up to ₹47,600',
            semi_private: '₹47,601 to ₹63,100',
            private: '₹63,101 and above'
        }
    }, 'Ward entitlement (7th CPC)');
});

// ============================================
// Beneficiary Management
// ============================================

/**
 * POST /beneficiaries/register — Register patient under scheme
 */
const registerBeneficiary = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const beneficiary = await govtRateService.registerBeneficiary({ ...req.body, hospital_id: hospitalId });
    ResponseHandler.success(res, beneficiary, 'Beneficiary registered', 201);
});

/**
 * POST /beneficiaries/verify — Verify card/ID
 */
const verifyBeneficiary = asyncHandler(async (req, res) => {
    const { beneficiaryDbId } = req.body;
    if (!beneficiaryDbId) {
        return res.status(400).json({ success: false, error: 'beneficiaryDbId is required' });
    }
    const result = await govtRateService.verifyBeneficiary(beneficiaryDbId);
    if (!result) {
        return res.status(404).json({ success: false, error: 'Beneficiary not found' });
    }
    ResponseHandler.success(res, result, 'Beneficiary verified');
});

/**
 * GET /beneficiaries/search — Search by card number
 */
const searchBeneficiaries = asyncHandler(async (req, res) => {
    const { scheme, q } = req.query;
    if (!scheme || !q) {
        return res.status(400).json({ success: false, error: 'scheme and q (search query) are required' });
    }
    const results = await govtRateService.searchBeneficiaries(scheme, q);
    ResponseHandler.success(res, results, `Found ${results.length} beneficiaries`);
});

/**
 * GET /beneficiaries/patient/:patientId — All schemes for a patient
 */
const getPatientSchemes = asyncHandler(async (req, res) => {
    const schemes = await govtRateService.getPatientSchemes(req.params.patientId);
    ResponseHandler.success(res, schemes, 'Patient scheme registrations');
});

// ============================================
// Empanelment
// ============================================

/**
 * GET /empanelment — Hospital empanelment overview
 */
const getEmpanelment = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const empanelment = await govtRateService.getEmpanelment(hospitalId);
    ResponseHandler.success(res, empanelment, 'Hospital empanelment status');
});

/**
 * POST /empanelment — Update empanelment
 */
const updateEmpanelment = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await govtRateService.upsertEmpanelment(hospitalId, req.body);
    ResponseHandler.success(res, result, 'Empanelment updated');
});

module.exports = {
    getSchemePackages,
    getPackageRate,
    getSchemeSpecialties,
    calculateClaim,
    compareSchemeRates,
    getModifiers,
    getSchemeStats,
    getWardEntitlement,
    registerBeneficiary,
    verifyBeneficiary,
    searchBeneficiaries,
    getPatientSchemes,
    getEmpanelment,
    updateEmpanelment
};
