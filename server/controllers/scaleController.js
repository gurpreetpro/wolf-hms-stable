/**
 * Scale Controller
 * [PHASE 4] Hyper-Scale Infrastructure
 * 
 * Admin endpoints for archive management and feature flags
 */

const ArchiveService = require('../services/ArchiveService');
const FeatureFlagService = require('../services/FeatureFlagService');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// ============================================================================
// ARCHIVE ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/archive/stats
 * Get archive statistics
 */
const getArchiveStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const stats = await ArchiveService.getArchiveStats(hospitalId);
    ResponseHandler.success(res, stats);
});

/**
 * POST /api/admin/archive/run
 * Run archive job (admin only)
 */
const runArchive = asyncHandler(async (req, res) => {
    const { daysOld = 730, table } = req.body;
    const hospitalId = getHospitalId(req);

    let result;
    if (table) {
        result = await ArchiveService.archiveTable(table, hospitalId, daysOld);
    } else {
        result = await ArchiveService.archiveAll(hospitalId, daysOld);
    }

    ResponseHandler.success(res, result, 'Archive job completed');
});

/**
 * POST /api/admin/archive/setup
 * Create archive tables
 */
const setupArchiveTables = asyncHandler(async (req, res) => {
    const result = await ArchiveService.ensureArchiveTables();
    ResponseHandler.success(res, result, 'Archive tables setup complete');
});

/**
 * POST /api/admin/archive/restore
 * Restore records from archive
 */
const restoreFromArchive = asyncHandler(async (req, res) => {
    const { table, recordIds } = req.body;
    const hospitalId = getHospitalId(req);

    if (!table || !recordIds || !Array.isArray(recordIds)) {
        return ResponseHandler.error(res, 'table and recordIds[] required', 400);
    }

    const result = await ArchiveService.restoreFromArchive(table, recordIds, hospitalId);
    ResponseHandler.success(res, result, 'Records restored');
});

// ============================================================================
// FEATURE FLAG ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/features
 * Get feature flags for current hospital
 */
const getFeatures = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const features = await FeatureFlagService.getFeatures(hospitalId);
    const definitions = FeatureFlagService.getFeatureDefinitions();
    
    ResponseHandler.success(res, { 
        features, 
        definitions,
        hospitalId 
    });
});

/**
 * PUT /api/admin/features
 * Update feature flags
 */
const updateFeatures = asyncHandler(async (req, res) => {
    const { features } = req.body;
    const hospitalId = getHospitalId(req);

    if (!features || typeof features !== 'object') {
        return ResponseHandler.error(res, 'features object required', 400);
    }

    const updated = await FeatureFlagService.updateFeatures(hospitalId, features);
    ResponseHandler.success(res, updated, 'Features updated');
});

/**
 * POST /api/admin/features/enable
 * Enable a specific feature
 */
const enableFeature = asyncHandler(async (req, res) => {
    const { feature } = req.body;
    const hospitalId = getHospitalId(req);

    if (!feature) {
        return ResponseHandler.error(res, 'feature name required', 400);
    }

    const updated = await FeatureFlagService.enableFeature(hospitalId, feature);
    ResponseHandler.success(res, updated, `${feature} enabled`);
});

/**
 * POST /api/admin/features/disable
 * Disable a specific feature
 */
const disableFeature = asyncHandler(async (req, res) => {
    const { feature } = req.body;
    const hospitalId = getHospitalId(req);

    if (!feature) {
        return ResponseHandler.error(res, 'feature name required', 400);
    }

    const updated = await FeatureFlagService.disableFeature(hospitalId, feature);
    ResponseHandler.success(res, updated, `${feature} disabled`);
});

/**
 * GET /api/admin/features/all-hospitals
 * Get features for all hospitals (platform admin only)
 */
const getAllHospitalFeatures = asyncHandler(async (req, res) => {
    const hospitals = await FeatureFlagService.getAllHospitalFeatures();
    ResponseHandler.success(res, hospitals);
});

/**
 * POST /api/admin/features/apply-tier
 * Apply subscription tier defaults
 */
const applyTier = asyncHandler(async (req, res) => {
    const { tier } = req.body;
    const hospitalId = getHospitalId(req);

    if (!['basic', 'professional', 'enterprise'].includes(tier)) {
        return ResponseHandler.error(res, 'tier must be basic, professional, or enterprise', 400);
    }

    const updated = await FeatureFlagService.applyTierDefaults(hospitalId, tier);
    ResponseHandler.success(res, updated, `Tier ${tier} applied`);
});

/**
 * GET /api/admin/features/check/:featureName
 * Quick feature check (for frontend)
 */
const checkFeature = asyncHandler(async (req, res) => {
    const { featureName } = req.params;
    const hospitalId = getHospitalId(req);

    const enabled = await FeatureFlagService.isEnabled(hospitalId, featureName);
    ResponseHandler.success(res, { feature: featureName, enabled });
});

module.exports = {
    // Archive
    getArchiveStats,
    runArchive,
    setupArchiveTables,
    restoreFromArchive,
    // Features
    getFeatures,
    updateFeatures,
    enableFeature,
    disableFeature,
    getAllHospitalFeatures,
    applyTier,
    checkFeature
};
