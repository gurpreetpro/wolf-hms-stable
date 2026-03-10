const express = require('express');
const router = express.Router();
const {
    triggerHospitalBuilds,
    triggerSingleAppBuild,
    handleBuildWebhook,
    getHospitalBuilds,
    getBuildHistory,
    updateBuildConfig,
    getAllBuilds
} = require('../controllers/appBuildController');
const { protect } = require('../middleware/authMiddleware');
const { isPlatformAdmin } = require('../config/platformOwners');

/**
 * App Build Routes
 * 
 * Endpoints for managing white-label APK builds
 */

// Platform admin middleware (reuse from platform routes)
const requirePlatformAdmin = (req, res, next) => {
    const userEmail = req.user?.email?.toLowerCase();
    const userRole = req.user?.role;

    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!isPlatformAdmin(userEmail) && userRole !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Platform Administrator privileges required.' 
        });
    }

    next();
};

// ============================================
// BUILD MANAGEMENT (Protected)
// ============================================

// Get all builds (overview)
router.get('/', protect, requirePlatformAdmin, getAllBuilds);

// Trigger builds for all apps of a hospital
router.post('/trigger', protect, requirePlatformAdmin, triggerHospitalBuilds);

// Trigger build for a single app
router.post('/trigger/:app_type', protect, requirePlatformAdmin, triggerSingleAppBuild);

// Get all builds for a hospital
router.get('/:hospital_id', protect, requirePlatformAdmin, getHospitalBuilds);

// Get build history for specific app
router.get('/:hospital_id/:app_type/history', protect, requirePlatformAdmin, getBuildHistory);

// Update branding config
router.put('/:hospital_id/:app_type', protect, requirePlatformAdmin, updateBuildConfig);

// ============================================
// WEBHOOK (Public - validated by signature)
// ============================================

// GitHub Actions webhook callback
router.post('/webhook', handleBuildWebhook);

module.exports = router;
