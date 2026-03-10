/**
 * Branding & Theme Routes
 * API endpoints for white-label customization
 * Phase 6: Advanced Features (Gold Standard HMS)
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const themingService = require('../services/themingService');
const i18nService = require('../services/i18nService');
const fcmService = require('../services/fcmService');

/**
 * GET /api/branding
 * Get branding for current hospital (public)
 */
router.get('/', async (req, res) => {
    try {
        const branding = await themingService.getBranding(req.hospital_id);
        res.json(branding);
    } catch (error) {
        console.error('[Branding] Get error:', error);
        res.status(500).json({ message: 'Failed to fetch branding' });
    }
});

/**
 * GET /api/branding/css
 * Get CSS variables for theming (public)
 */
router.get('/css', async (req, res) => {
    try {
        const branding = await themingService.getBranding(req.hospital_id);
        const css = themingService.generateCssVariables(branding);
        res.type('text/css').send(css);
    } catch (error) {
        res.status(500).send('/* Error loading theme */');
    }
});

// Protected routes below
router.use(protect);

/**
 * PUT /api/branding
 * Update hospital branding (admin only)
 */
router.put('/', authorize('admin'), async (req, res) => {
    try {
        const branding = await themingService.updateBranding(req.hospital_id, req.body);
        res.json({ message: 'Branding updated', branding });
    } catch (error) {
        console.error('[Branding] Update error:', error);
        res.status(500).json({ message: 'Failed to update branding' });
    }
});

// === i18n Routes ===

/**
 * GET /api/branding/translations/:locale
 * Get translations for a locale
 */
router.get('/translations/:locale', async (req, res) => {
    try {
        const translations = await i18nService.getTranslations(req.params.locale, req.hospital_id);
        res.json(translations);
    } catch (error) {
        console.error('[i18n] Get error:', error);
        res.status(500).json({ message: 'Failed to fetch translations' });
    }
});

/**
 * GET /api/branding/locales
 * Get supported locales
 */
router.get('/locales', async (req, res) => {
    try {
        const locales = await i18nService.getSupportedLocales();
        res.json({ locales });
    } catch (error) {
        res.json({ locales: ['en'] });
    }
});

// === Notification Routes ===

/**
 * POST /api/branding/notifications/register
 * Register FCM token
 */
router.post('/notifications/register', async (req, res) => {
    try {
        const { fcm_token, device_type } = req.body;
        await fcmService.registerToken(req.user.id, fcm_token, device_type, req.hospital_id);
        res.json({ message: 'Token registered' });
    } catch (error) {
        console.error('[FCM] Register error:', error);
        res.status(500).json({ message: 'Failed to register token' });
    }
});

/**
 * GET /api/branding/notifications/preferences
 * Get notification preferences
 */
router.get('/notifications/preferences', async (req, res) => {
    try {
        const prefs = await fcmService.getPreferences(req.user.id);
        res.json(prefs || {});
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch preferences' });
    }
});

/**
 * PUT /api/branding/notifications/preferences
 * Update notification preferences
 */
router.put('/notifications/preferences', async (req, res) => {
    try {
        await fcmService.updatePreferences(req.user.id, req.body);
        res.json({ message: 'Preferences updated' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update preferences' });
    }
});

module.exports = router;
