const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createCorporateContract,
    getCorporateContracts,
    generateBatchInvoice,
    getB2BInvoices,
    logB2BPayment,
    disputeInvoiceItem
} = require('../controllers/corporateController');

// Corporate Contracts (Empanelment)
router.post('/contracts', protect, authorize('admin', 'finance'), createCorporateContract);
router.get('/contracts', protect, authorize('admin', 'finance'), getCorporateContracts);

// B2B Batch Billing Engine
router.post('/batch-billing', protect, authorize('admin', 'finance'), generateBatchInvoice);
router.get('/invoices', protect, authorize('admin', 'finance'), getB2BInvoices);

// Payments & Disputes
router.post('/b2b-payments', protect, authorize('admin', 'finance'), logB2BPayment);
router.post('/invoices/:id/dispute', protect, authorize('admin', 'finance'), disputeInvoiceItem);

module.exports = router;
