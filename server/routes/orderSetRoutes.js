const express = require('express');
const router = express.Router();
const { getOrderSets, applyOrderSet } = require('../controllers/orderSetController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getOrderSets);
router.post('/apply', protect, authorize('doctor', 'admin'), applyOrderSet);

module.exports = router;
