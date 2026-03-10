const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const AIDataSteward = require('../services/AIDataSteward');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Scan for data drift (formatting issues)
// @route   GET /api/admin/data-steward/scan
// @access  Admin only
router.get('/scan', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const { table = 'patients', column = 'phone', type = 'PHONE' } = req.query;
    
    // Safety: Whitelist allowed types to prevent arbitrary execution
    const allowedTypes = ['PHONE', 'EMAIL', 'NAME', 'CITY'];
    if (!allowedTypes.includes(type)) {
        return res.status(400).json({ success: false, message: 'Invalid scan type' });
    }

    const issues = await AIDataSteward.scanForDrift(table, column, type);
    
    ResponseHandler.success(res, {
        total_issues: issues.length,
        params: { table, column, type },
        results: issues
    });
}));

// @desc    Find duplicate patients
// @route   GET /api/admin/data-steward/dedupe
// @access  Admin only
router.get('/dedupe', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const duplicates = await AIDataSteward.findDuplicates();
    
    ResponseHandler.success(res, {
        total_clusters: duplicates.length,
        results: duplicates
    });
}));

module.exports = router;
