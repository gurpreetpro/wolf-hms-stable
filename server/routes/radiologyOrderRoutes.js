const express = require('express');
const router = express.Router();
const { createOrder, getWorklist, updateStatus } = require('../controllers/radiologyOrderController');
const { protect, authorize } = require('../middleware/authMiddleware');

// RIS Routes
router.post('/orders', protect, authorize('doctor', 'admin'), createOrder);
router.get('/worklist', protect, authorize('radiology_tech', 'admin', 'doctor'), getWorklist);
router.patch('/orders/:id/status', protect, authorize('radiology_tech', 'admin', 'system'), updateStatus);

module.exports = router;
