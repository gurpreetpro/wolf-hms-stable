/**
 * POS Routes
 * Multi-provider POS integration endpoints
 * WOLF HMS
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    // Providers
    getProviders,
    getActiveProviders,
    getProviderCapabilities,

    // Devices
    getDevices,
    getDeviceById,
    registerDevice,
    updateDevice,
    testDeviceConnection,
    deactivateDevice,

    // Transactions
    initiatePayment,
    checkPaymentStatus,
    cancelPayment,
    initiateRefund,
    getTransaction,

    // Settlement
    initiateSettlement,

    // Reports
    getTransactionReport,
    getDailySummary,

    // EMI
    getEMIOffers,

    // Reconciliation
    runReconciliation,
    getDiscrepancies,
    resolveDiscrepancy,
    getReconciliationSummary,

    // Offline Queue
    getOfflineQueueStatus,
    getOfflinePendingItems,
    processOfflineQueue,

    // Webhooks
    handlePineLabsWebhook,
    handlePaytmWebhook,
    handleRazorpayWebhook,
    handlePhonePeWebhook
} = require('../controllers/posController');

// ============================================
// Provider Routes
// ============================================
router.get('/providers', protect, getProviders);
router.get('/providers/active', protect, getActiveProviders);
router.get('/providers/:code/capabilities', protect, getProviderCapabilities);

// ============================================
// Device Routes
// ============================================
router.get('/devices', protect, authorize('admin', 'billing'), getDevices);
router.get('/devices/:id', protect, authorize('admin', 'billing'), getDeviceById);
router.post('/devices', protect, authorize('admin'), registerDevice);
router.put('/devices/:id', protect, authorize('admin'), updateDevice);
router.post('/devices/:id/test', protect, authorize('admin', 'billing'), testDeviceConnection);
router.delete('/devices/:id', protect, authorize('admin'), deactivateDevice);

// ============================================
// Transaction Routes
// ============================================
router.post('/payment/initiate', protect, authorize('admin', 'billing', 'receptionist'), initiatePayment);
router.get('/payment/:txnId/status', protect, checkPaymentStatus);
router.post('/payment/:txnId/cancel', protect, authorize('admin', 'billing'), cancelPayment);
router.post('/payment/:txnId/refund', protect, authorize('admin', 'billing'), initiateRefund);
router.get('/transaction/:txnId', protect, getTransaction);

// ============================================
// Settlement Routes
// ============================================
router.post('/devices/:id/settlement', protect, authorize('admin', 'billing'), initiateSettlement);

// ============================================
// Report Routes
// ============================================
router.get('/reports/transactions', protect, authorize('admin', 'billing'), getTransactionReport);
router.get('/reports/daily-summary', protect, authorize('admin', 'billing'), getDailySummary);

// ============================================
// EMI Routes
// ============================================
router.get('/emi-offers', protect, authorize('admin', 'billing', 'receptionist'), getEMIOffers);

// ============================================
// Reconciliation Routes
// ============================================
router.post('/reconcile', protect, authorize('admin'), runReconciliation);
router.get('/reconcile/discrepancies', protect, authorize('admin', 'billing'), getDiscrepancies);
router.put('/reconcile/discrepancies/:id', protect, authorize('admin'), resolveDiscrepancy);
router.get('/reconcile/summary', protect, authorize('admin', 'billing'), getReconciliationSummary);

// ============================================
// Offline Queue Routes
// ============================================
router.get('/offline-queue/status', protect, authorize('admin', 'billing'), getOfflineQueueStatus);
router.get('/offline-queue/pending', protect, authorize('admin', 'billing'), getOfflinePendingItems);
router.post('/offline-queue/process', protect, authorize('admin'), processOfflineQueue);

// ============================================
// Webhook Routes (No auth - signature verified)
// ============================================
router.post('/webhook/pinelabs', handlePineLabsWebhook);
router.post('/webhook/paytm', handlePaytmWebhook);
router.post('/webhook/razorpay', handleRazorpayWebhook);
router.post('/webhook/phonepe', handlePhonePeWebhook);

module.exports = router;
