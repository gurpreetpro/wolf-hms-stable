const pool = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const ResponseHandler = require('../utils/responseHandler');
const axios = require('axios');

/**
 * App Build Controller
 * 
 * Handles white-label APK build triggers, status tracking, and webhook callbacks
 * from GitHub Actions.
 */

// GitHub Configuration
const GITHUB_CONFIG = {
    owner: process.env.GITHUB_OWNER || 'gurpreetpro',
    token: process.env.GITHUB_TOKEN,
    api: 'https://api.github.com'
};

// App repository mapping
const APP_REPOS = {
    guard: 'wolf-guard-mobile',
    care: 'wolf-care-app',
    nurse: 'wolf-nurse-app',
    doctor: 'wolf-doctor-app'
};

// ============================================
// BUILD TRIGGER ENDPOINTS
// ============================================

/**
 * Trigger builds for all apps of a hospital
 * POST /api/platform/builds/trigger
 */
const triggerHospitalBuilds = asyncHandler(async (req, res) => {
    const { hospital_id, app_types = ['guard', 'care', 'nurse', 'doctor'] } = req.body;
    const triggeredBy = req.user.id;

    // Validate hospital exists
    const hospitalRes = await pool.query(
        'SELECT * FROM hospitals WHERE id = $1',
        [hospital_id]
    );

    if (!hospitalRes.rows.length) {
        return ResponseHandler.error(res, 'Hospital not found', 404);
    }

    const hospital = hospitalRes.rows[0];
    const results = [];

    for (const appType of app_types) {
        try {
            const result = await triggerSingleBuild(hospital, appType, triggeredBy);
            results.push(result);
        } catch (error) {
            console.error(`Failed to trigger ${appType} build:`, error.message);
            results.push({
                app_type: appType,
                status: 'failed',
                error: error.message
            });
        }
    }

    ResponseHandler.success(res, { builds: results }, 'Build jobs triggered');
});

/**
 * Trigger build for a single app
 * POST /api/platform/builds/trigger/:app_type
 */
const triggerSingleAppBuild = asyncHandler(async (req, res) => {
    const { hospital_id } = req.body;
    const { app_type } = req.params;
    const triggeredBy = req.user.id;

    if (!['guard', 'care', 'nurse', 'doctor'].includes(app_type)) {
        return ResponseHandler.error(res, 'Invalid app type', 400);
    }

    const hospitalRes = await pool.query(
        'SELECT * FROM hospitals WHERE id = $1',
        [hospital_id]
    );

    if (!hospitalRes.rows.length) {
        return ResponseHandler.error(res, 'Hospital not found', 404);
    }

    const result = await triggerSingleBuild(hospitalRes.rows[0], app_type, triggeredBy);
    ResponseHandler.success(res, result, 'Build triggered');
});

/**
 * Internal: Trigger a single build via GitHub Actions
 */
async function triggerSingleBuild(hospital, appType, triggeredBy) {
    const repo = APP_REPOS[appType];
    
    // Get or create build config
    let buildConfig = await pool.query(
        'SELECT * FROM hospital_app_builds WHERE hospital_id = $1 AND app_type = $2',
        [hospital.id, appType]
    );

    if (!buildConfig.rows.length) {
        // Create build config
        const insertRes = await pool.query(
            `INSERT INTO hospital_app_builds 
             (hospital_id, app_type, app_display_name, api_endpoint)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [hospital.id, appType, `${hospital.hospital_name} ${appType}`, 
             `https://${hospital.hospital_domain}/api`]
        );
        buildConfig = { rows: insertRes.rows };
    }

    const config = buildConfig.rows[0];

    // Update status to queued
    await pool.query(
        `UPDATE hospital_app_builds 
         SET build_status = 'queued', updated_at = NOW() 
         WHERE id = $1`,
        [config.id]
    );

    // Create history record
    await pool.query(
        `INSERT INTO app_build_history 
         (build_config_id, triggered_by, trigger_reason, status)
         VALUES ($1, $2, 'manual', 'queued')`,
        [config.id, triggeredBy]
    );

    // Trigger GitHub Actions workflow
    const callbackUrl = `${process.env.API_URL || 'https://wolf-hms-server-1026194439642.asia-south1.run.app'}/api/platform/builds/webhook`;
    
    let githubResponse = null;
    
    if (GITHUB_CONFIG.token) {
        try {
            githubResponse = await axios.post(
                `${GITHUB_CONFIG.api}/repos/${GITHUB_CONFIG.owner}/${repo}/actions/workflows/build-whitelabel.yml/dispatches`,
                {
                    ref: 'main',
                    inputs: {
                        hospital_id: hospital.id.toString(),
                        hospital_name: hospital.hospital_name,
                        app_type: appType,
                        primary_color: config.primary_color || '#2563EB',
                        api_url: config.api_endpoint || `https://${hospital.hospital_domain}/api`,
                        logo_url: config.logo_url || '',
                        callback_url: callbackUrl
                    }
                },
                {
                    headers: {
                        'Authorization': `token ${GITHUB_CONFIG.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            // Update status to building
            await pool.query(
                `UPDATE hospital_app_builds 
                 SET build_status = 'building', build_started_at = NOW(), updated_at = NOW() 
                 WHERE id = $1`,
                [config.id]
            );

            console.log(`[AppBuild] Triggered ${appType} build for ${hospital.hospital_name}`);
        } catch (ghError) {
            console.error('[AppBuild] GitHub trigger failed:', ghError.response?.data || ghError.message);
            
            // Update status to failed
            await pool.query(
                `UPDATE hospital_app_builds 
                 SET build_status = 'failed', build_error = $2, updated_at = NOW() 
                 WHERE id = $1`,
                [config.id, ghError.message]
            );
            
            throw new Error(`GitHub API error: ${ghError.message}`);
        }
    } else {
        console.log(`[AppBuild] MOCK: Would trigger ${appType} build for ${hospital.hospital_name} (No GitHub token)`);
    }

    return {
        app_type: appType,
        hospital_id: hospital.id,
        status: 'queued',
        config_id: config.id
    };
}

// ============================================
// WEBHOOK HANDLER
// ============================================

/**
 * Handle build completion webhook from GitHub Actions
 * POST /api/platform/builds/webhook
 */
const handleBuildWebhook = asyncHandler(async (req, res) => {
    const { hospital_id, app_type, status, apk_url, build_id, error } = req.body;

    console.log(`[AppBuild Webhook] Received: ${app_type} for hospital ${hospital_id} - ${status}`);

    // Find the build config
    const configRes = await pool.query(
        'SELECT * FROM hospital_app_builds WHERE hospital_id = $1 AND app_type = $2',
        [hospital_id, app_type]
    );

    if (!configRes.rows.length) {
        console.error('[AppBuild Webhook] Config not found');
        return ResponseHandler.error(res, 'Build config not found', 404);
    }

    const config = configRes.rows[0];

    // Update build config
    await pool.query(
        `UPDATE hospital_app_builds SET
            build_status = $2,
            build_id = $3,
            build_completed_at = NOW(),
            apk_url = COALESCE($4, apk_url),
            build_error = $5,
            updated_at = NOW()
         WHERE id = $1`,
        [config.id, status, build_id, apk_url, error]
    );

    // Update build history
    await pool.query(
        `UPDATE app_build_history SET
            status = $2,
            completed_at = NOW(),
            apk_url = $3,
            error_message = $4,
            github_run_id = $5
         WHERE build_config_id = $1 AND completed_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [config.id, status, apk_url, error, build_id]
    );

    console.log(`[AppBuild] ${app_type} build for hospital ${hospital_id}: ${status}`);

    ResponseHandler.success(res, { received: true });
});

// ============================================
// STATUS & MANAGEMENT ENDPOINTS
// ============================================

/**
 * Get all builds for a hospital
 * GET /api/platform/builds/:hospital_id
 */
const getHospitalBuilds = asyncHandler(async (req, res) => {
    const { hospital_id } = req.params;

    const builds = await pool.query(
        `SELECT hab.*, h.hospital_name 
         FROM hospital_app_builds hab
         JOIN hospitals h ON hab.hospital_id = h.id
         WHERE hab.hospital_id = $1
         ORDER BY hab.app_type`,
        [hospital_id]
    );

    ResponseHandler.success(res, builds.rows);
});

/**
 * Get build history for a specific app
 * GET /api/platform/builds/:hospital_id/:app_type/history
 */
const getBuildHistory = asyncHandler(async (req, res) => {
    const { hospital_id, app_type } = req.params;

    const config = await pool.query(
        'SELECT id FROM hospital_app_builds WHERE hospital_id = $1 AND app_type = $2',
        [hospital_id, app_type]
    );

    if (!config.rows.length) {
        return ResponseHandler.error(res, 'Build config not found', 404);
    }

    const history = await pool.query(
        `SELECT abh.*, u.username as triggered_by_name
         FROM app_build_history abh
         LEFT JOIN users u ON abh.triggered_by = u.id
         WHERE abh.build_config_id = $1
         ORDER BY abh.created_at DESC
         LIMIT 20`,
        [config.rows[0].id]
    );

    ResponseHandler.success(res, history.rows);
});

/**
 * Update branding configuration
 * PUT /api/platform/builds/:hospital_id/:app_type
 */
const updateBuildConfig = asyncHandler(async (req, res) => {
    const { hospital_id, app_type } = req.params;
    const { app_display_name, primary_color, secondary_color, logo_url, splash_url } = req.body;

    const result = await pool.query(
        `UPDATE hospital_app_builds SET
            app_display_name = COALESCE($3, app_display_name),
            primary_color = COALESCE($4, primary_color),
            secondary_color = COALESCE($5, secondary_color),
            logo_url = COALESCE($6, logo_url),
            splash_url = COALESCE($7, splash_url),
            updated_at = NOW()
         WHERE hospital_id = $1 AND app_type = $2
         RETURNING *`,
        [hospital_id, app_type, app_display_name, primary_color, secondary_color, logo_url, splash_url]
    );

    if (!result.rows.length) {
        return ResponseHandler.error(res, 'Build config not found', 404);
    }

    ResponseHandler.success(res, result.rows[0], 'Build config updated');
});

/**
 * Get all builds across all hospitals (for platform overview)
 * GET /api/platform/builds
 */
const getAllBuilds = asyncHandler(async (req, res) => {
    const { status, limit = 50 } = req.query;

    let query = `
        SELECT hab.*, h.hospital_name, h.hospital_domain
        FROM hospital_app_builds hab
        JOIN hospitals h ON hab.hospital_id = h.id
    `;
    const params = [];

    if (status) {
        query += ' WHERE hab.build_status = $1';
        params.push(status);
    }

    query += ' ORDER BY hab.updated_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));

    const builds = await pool.query(query, params);

    ResponseHandler.success(res, builds.rows);
});

module.exports = {
    triggerHospitalBuilds,
    triggerSingleAppBuild,
    handleBuildWebhook,
    getHospitalBuilds,
    getBuildHistory,
    updateBuildConfig,
    getAllBuilds
};
