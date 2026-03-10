/**
 * Doctor Analytics Routes
 * Phase 3: Performance metrics and analytics endpoints
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getDoctorAnalytics,
    getDepartmentAnalytics
} = require('../controllers/doctorAnalyticsController');

// Doctor's personal analytics
router.get('/my-analytics', protect, getDoctorAnalytics);

// Department analytics (for heads)
router.get('/department/:department', protect, getDepartmentAnalytics);

module.exports = router;
