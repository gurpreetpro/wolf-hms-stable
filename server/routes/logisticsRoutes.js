const express = require('express');
const router = express.Router();
const logisticsController = require('../controllers/logisticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Keys
router.get('/keys', protect, logisticsController.getKeys);
router.post('/keys/checkout', protect, authorize('admin', 'security_guard'), logisticsController.checkoutKey);
router.post('/keys/return', protect, authorize('admin', 'security_guard'), logisticsController.returnKey);

// Packages
router.post('/packages', protect, authorize('admin', 'security_guard'), logisticsController.logPackage);
router.get('/packages', protect, logisticsController.getPackages);

// Lost Found
router.post('/lostfound', protect, authorize('admin', 'security_guard'), logisticsController.logLostItem);

module.exports = router;
