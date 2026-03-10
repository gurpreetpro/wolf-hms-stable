/**
 * vaultRoutes.js - Wolf Vault Admin API Routes
 * Secure credential management endpoints for multi-tenant insurance integrations
 * 
 * WOLF HMS - Beyond Gold Standard Architecture
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const TenantConfigService = require('../services/insurance/TenantConfigService');
const InsuranceFactory = require('../services/insurance/InsuranceFactory');

// All vault routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRoles('Admin', 'Super Admin', 'admin', 'superadmin'));

/**
 * GET /api/admin/vault/integrations
 * List all integrations for the current hospital (without secrets)
 */
router.get('/integrations', async (req, res) => {
    try {
        const hospitalId = req.hospitalId || 1;
        const integrations = await TenantConfigService.listIntegrations(hospitalId);
        
        res.json({
            success: true,
            integrations: integrations.map(i => ({
                id: i.id,
                provider_code: i.provider_code,
                client_id: i.client_id,
                hfr_id: i.hfr_id,
                tier_level: i.tier_level,
                is_active: i.is_active,
                has_private_key: !!i.private_key_data,
                created_at: i.created_at,
                updated_at: i.updated_at
            }))
        });
    } catch (error) {
        console.error('[VaultAPI] List integrations error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/vault/save
 * Save or update an integration with encrypted credentials
 */
router.post('/save', async (req, res) => {
    try {
        const hospitalId = req.hospitalId || 1;
        const { providerCode, clientId, clientSecret, privateKey, hfrId, tierLevel } = req.body;

        if (!providerCode || !clientId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Provider code and Client ID are required' 
            });
        }

        const result = await TenantConfigService.saveConfig({
            hospitalId,
            providerCode,
            clientId,
            clientSecret,
            privateKey,
            hfrId,
            tierLevel
        });

        // Invalidate cached adapter for this integration
        InsuranceFactory.invalidateCache(hospitalId, providerCode);

        console.log(`[VaultAPI] Saved integration: hospital=${hospitalId}, provider=${providerCode}`);

        res.json({
            success: true,
            message: 'Integration saved and encrypted',
            integration: result
        });
    } catch (error) {
        console.error('[VaultAPI] Save integration error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/vault/test
 * Test connection to a configured integration
 */
router.post('/test', async (req, res) => {
    try {
        const hospitalId = req.hospitalId || 1;
        const { providerCode } = req.body;

        if (!providerCode) {
            return res.status(400).json({ success: false, error: 'Provider code is required' });
        }

        const result = await InsuranceFactory.healthCheck(hospitalId, providerCode);

        res.json({
            success: result.success,
            message: result.success ? 'Connection successful' : result.error,
            capabilities: result.capabilities
        });
    } catch (error) {
        console.error('[VaultAPI] Test connection error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/vault/deactivate
 * Deactivate an integration (soft delete)
 */
router.post('/deactivate', async (req, res) => {
    try {
        const hospitalId = req.hospitalId || 1;
        const { providerCode } = req.body;

        if (!providerCode) {
            return res.status(400).json({ success: false, error: 'Provider code is required' });
        }

        await TenantConfigService.deactivate(hospitalId, providerCode);
        InsuranceFactory.invalidateCache(hospitalId, providerCode);

        console.log(`[VaultAPI] Deactivated integration: hospital=${hospitalId}, provider=${providerCode}`);

        res.json({
            success: true,
            message: 'Integration deactivated'
        });
    } catch (error) {
        console.error('[VaultAPI] Deactivate error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/vault/cache-stats
 * Get adapter cache statistics (for monitoring)
 */
router.get('/cache-stats', (req, res) => {
    const stats = InsuranceFactory.getCacheStats();
    res.json({ success: true, stats });
});

module.exports = router;
