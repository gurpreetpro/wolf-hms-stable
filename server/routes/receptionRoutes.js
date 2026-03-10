const express = require('express');
const router = express.Router();
const { getReceptionStats, getOPDCollections, getCollectionSummary } = require('../controllers/receptionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get reception stats
router.get('/stats', protect, authorize('receptionist', 'admin'), getReceptionStats);

// OPD Payment Collection Reports
// GET /api/reception/collections?start_date=2026-01-01&end_date=2026-01-02&collected_by=123&payment_mode=Cash
router.get('/collections', protect, authorize('receptionist', 'admin', 'billing'), getOPDCollections);

// Cashier Collection Summary (Admin only - shows all cashiers' totals)
// GET /api/reception/collections/summary?date=2026-01-02
router.get('/collections/summary', protect, authorize('admin', 'billing'), getCollectionSummary);

module.exports = router;
