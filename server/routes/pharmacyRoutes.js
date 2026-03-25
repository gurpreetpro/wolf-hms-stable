const express = require('express');
const router = express.Router();
const {
    getInventory,
    searchInventory,
    dispense,
    getPrescriptionQueue,
    processPrescription,
    requestPriceChange,
    getPriceRequests,
    approvePriceChange,
    denyPriceChange,
    getExpiryHeatmap,
    getDemandForecast,
    addInventoryItem,
    deleteInventoryItem,
    getSuppliers,
    createPurchaseOrder,
    receiveStock,
    getPurchaseOrders,
    getABCAnalysis,
    getExpiryReport,
    getRecentDispenses,
    processRefund,
    getRefundHistory,
    getControlledSubstanceLog,
    getSmartAlerts,
    approvePurchaseOrder,
    rejectPurchaseOrder
} = require('../controllers/pharmacyController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { cache } = require('../middleware/cacheMiddleware');

// [FIX] Allow doctors read-only access to inventory for prescription autocomplete
router.get('/inventory', protect, authorize('pharmacist', 'admin', 'doctor'), async (req, res) => {
    try {
        const pool = require('../config/db');
        const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
        const result = await pool.query('SELECT * FROM inventory_items WHERE (hospital_id = $1) ORDER BY name', [hospitalId]); 
        res.json(result.rows);
    } catch (e) {
        console.error('Inventory Inline Error:', e);
        res.status(500).json({error: e.message});
    }
});
router.get('/inventory/search', protect, searchInventory);
router.post('/dispense', protect, authorize('pharmacist', 'admin'), dispense);
router.get('/queue', protect, authorize('pharmacist', 'admin', 'doctor'), getPrescriptionQueue);

// New endpoint for fullfilment
router.post('/process-prescription', protect, authorize('pharmacist', 'admin'), processPrescription);

// Price Management Routes
router.post('/price-request', protect, authorize('pharmacist', 'admin'), requestPriceChange);
router.get('/price-requests', protect, authorize('admin'), getPriceRequests);
router.post('/price-request/:id/approve', protect, authorize('admin'), approvePriceChange);
router.post('/price-request/:id/deny', protect, authorize('admin'), denyPriceChange);

router.get('/heatmap', protect, authorize('admin', 'pharmacist', 'doctor'), getExpiryHeatmap);
router.get('/forecast', protect, authorize('admin', 'pharmacist', 'doctor'), getDemandForecast);

// Phase 5: Master Data & Procurement
router.post('/inventory', protect, authorize('admin', 'pharmacist'), addInventoryItem);
router.delete('/inventory/:id', protect, authorize('admin'), deleteInventoryItem);
router.get('/suppliers', protect, authorize('admin', 'pharmacist'), getSuppliers);
router.post('/purchase-orders', protect, authorize('admin', 'pharmacist'), createPurchaseOrder);
router.get('/purchase-orders', protect, authorize('admin', 'pharmacist'), getPurchaseOrders);
router.post('/purchase-orders/:id/approve', protect, authorize('admin', 'pharmacist'), approvePurchaseOrder);
router.post('/purchase-orders/:id/reject', protect, authorize('admin', 'pharmacist'), rejectPurchaseOrder);
router.post('/purchase-orders/receive', protect, authorize('admin', 'pharmacist'), receiveStock);

// Reports
router.get('/reports/abc', protect, authorize('admin', 'pharmacist'), getABCAnalysis);
router.get('/reports/expiry', protect, authorize('admin', 'pharmacist'), getExpiryReport);
router.get('/reports/smart-alerts', protect, authorize('admin', 'pharmacist'), getSmartAlerts); // Phase 8

// Refunds (Phase 8)
router.get('/dispenses/recent', protect, authorize('admin', 'pharmacist'), getRecentDispenses);
router.post('/refund', protect, authorize('admin', 'pharmacist'), processRefund);
router.get('/refunds', protect, authorize('admin', 'pharmacist'), getRefundHistory);

// Controlled Substance Log (Admin only - compliance)
router.get('/controlled-log', protect, authorize('admin'), getControlledSubstanceLog);

module.exports = router;


