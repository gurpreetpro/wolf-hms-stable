const express = require('express');
const router = express.Router();
const { getImagingQueue, uploadImagingResult, getImagingHistory, getRadiologyStats, getImagingTemplates } = require('../controllers/radiologyController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Radiology routes - accessible by radiology_tech, lab_tech (fallback), and admin
router.get('/queue', protect, authorize('radiology_tech', 'lab_tech', 'admin'), getImagingQueue);
router.post('/upload', protect, authorize('radiology_tech', 'lab_tech', 'admin'), uploadImagingResult);
router.get('/history', protect, authorize('radiology_tech', 'lab_tech', 'admin'), getImagingHistory);
router.get('/stats', protect, authorize('radiology_tech', 'lab_tech', 'admin'), getRadiologyStats);
router.get('/templates', protect, authorize('radiology_tech', 'lab_tech', 'admin'), getImagingTemplates); // New Route for Templates

module.exports = router;
