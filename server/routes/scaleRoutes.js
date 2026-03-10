/**
 * Scale Routes
 * [PHASE 4] Hyper-Scale Infrastructure
 * 
 * Admin routes for archive management and feature flags
 */

const express = require('express');
const router = express.Router();
const scaleController = require('../controllers/scaleController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/permissionMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// ARCHIVE MANAGEMENT
// ============================================================================

// Get archive statistics
router.get('/archive/stats', scaleController.getArchiveStats);

// Setup archive tables (admin only)
router.post('/archive/setup', requireRole(['admin', 'super_admin']), scaleController.setupArchiveTables);

// Run archive job (admin only)
router.post('/archive/run', requireRole(['admin', 'super_admin']), scaleController.runArchive);

// Restore from archive (admin only)
router.post('/archive/restore', requireRole(['admin', 'super_admin']), scaleController.restoreFromArchive);

// ============================================================================
// FEATURE FLAGS
// ============================================================================

// Get features for current hospital
router.get('/features', scaleController.getFeatures);

// Check specific feature (quick endpoint for frontend)
router.get('/features/check/:featureName', scaleController.checkFeature);

// Update features (admin only)
router.put('/features', requireRole(['admin', 'super_admin']), scaleController.updateFeatures);

// Enable/disable single feature (admin only)
router.post('/features/enable', requireRole(['admin', 'super_admin']), scaleController.enableFeature);
router.post('/features/disable', requireRole(['admin', 'super_admin']), scaleController.disableFeature);

// Platform admin only - view all hospitals
router.get('/features/all-hospitals', requireRole(['super_admin']), scaleController.getAllHospitalFeatures);

// Apply subscription tier (admin only)
router.post('/features/apply-tier', requireRole(['admin', 'super_admin']), scaleController.applyTier);

module.exports = router;
