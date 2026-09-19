const express = require('express');
const router = express.Router();
const {
    generateInvoice,
    getInvoices,
    getInvoiceItems,
    recordPayment,
    getPaymentHistory,
    getBillableItems,
    // Phase 1 KPIs
    getARAgingReport,
    getDenialStats,
    getBillingKPIs,
    // Phase 3 Advanced Reporting
    getDepartmentRevenue,
    getPayerAnalysis,
    getARAgingDetails,
    getRevenueTrend,
    getFinanceDashboard, // [NEW]
    getOutstandingPatients, getPatientLedger, processPatientPayment,
    softDeleteInvoice, createAdjustment,
    getAgedTrialBalance, getDailyRevenueReport,
    // [PHASE 3]
    getAccountingPeriods, createAccountingPeriod, closeAccountingPeriod, reopenAccountingPeriod
} = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/test', (req, res) => res.json({ message: 'Finance Route Works' }));
router.post('/generate', protect, authorize('admin', 'receptionist', 'billing'), generateInvoice);

// [NEW] Dashboard Endpoints (Fixes Crash)
router.get('/dashboard', protect, authorize('admin', 'billing', 'receptionist'), getFinanceDashboard);
router.get('/stats', protect, authorize('admin', 'billing', 'receptionist'), getFinanceDashboard); // Alias

router.get('/invoices', protect, authorize('admin', 'receptionist', 'billing'), getInvoices);
router.post('/invoices', protect, authorize('admin', 'receptionist', 'billing'), generateInvoice);
router.get('/invoices/:id', protect, authorize('admin', 'receptionist', 'billing'), async (req, res) => {
    try {
        const pool = require('../config/db');
        const hospitalId = req.hospital_id || req.user?.hospital_id || 1;
        const result = await pool.query('SELECT * FROM invoices WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [req.params.id, hospitalId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Invoice not found' });
        const items = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
        res.json({ success: true, data: { ...result.rows[0], items: items.rows } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Payment list endpoint for credibility audit
router.get('/payments', protect, authorize('admin', 'receptionist', 'billing'), async (req, res) => {
    try {
        const result = await require('../config/db').query(
            'SELECT * FROM invoice_payments ORDER BY created_at DESC LIMIT 50'
        );
        res.json({ success: true, payments: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
router.post('/payments', protect, authorize('admin', 'receptionist', 'billing'), recordPayment);

router.post('/refunds', protect, authorize('admin', 'billing'), async (req, res) => {
    try {
        const pool = require('../config/db');
        const { invoice_id, amount, reason } = req.body;
        const hospitalId = req.hospital_id || req.user?.hospital_id || 1;
        const result = await pool.query(
            'INSERT INTO invoice_payments (invoice_id, amount, payment_method, notes, hospital_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [invoice_id, -(Math.abs(parseFloat(amount) || 0)), 'Refund', reason || 'Patient Refund', hospitalId]
        );
        res.status(201).json({ success: true, message: 'Refund processed', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/outstanding-patients', protect, authorize('admin', 'receptionist', 'billing'), getOutstandingPatients); // [NEW] Patient-Centric List
router.get('/ledger/:patient_id', protect, authorize('admin', 'receptionist', 'billing'), getPatientLedger); // [NEW] Patient Financial History
// Ledger Phase 1
router.post('/adjustments', protect, authorize('admin', 'billing'), createAdjustment);
router.delete('/invoices/:id', protect, authorize('admin', 'billing'), softDeleteInvoice);
router.post('/payment/patient', protect, authorize('admin', 'receptionist', 'billing'), processPatientPayment); // [NEW] Smart FIFO Payment

router.get('/invoices/:invoice_id/items', protect, authorize('admin', 'receptionist', 'billing'), getInvoiceItems);
router.post('/invoices/:invoice_id/pay', protect, authorize('admin', 'receptionist', 'billing'), recordPayment);
router.post('/invoices/:invoice_id/payments', protect, authorize('admin', 'receptionist', 'billing'), recordPayment);
router.get('/invoices/:invoice_id/payments', protect, authorize('admin', 'receptionist', 'billing'), getPaymentHistory);
router.get('/billable/:admission_id', protect, authorize('admin', 'receptionist', 'doctor', 'billing'), getBillableItems);

// Phase 1: Critical KPIs
router.get('/ar-aging', protect, authorize('admin', 'billing'), getARAgingReport);
router.get('/denials', protect, authorize('admin', 'billing'), getDenialStats);
router.get('/kpis', protect, authorize('admin', 'billing'), getBillingKPIs);

// Phase 3: Advanced Reporting
router.get('/reports/department-revenue', protect, authorize('admin', 'billing'), getDepartmentRevenue);
router.get('/reports/payer-analysis', protect, authorize('admin', 'billing'), getPayerAnalysis);
router.get('/reports/ar-details', protect, authorize('admin', 'billing'), getARAgingDetails);
router.get('/reports/revenue-trend', protect, authorize('admin', 'billing'), getRevenueTrend);

// [PHASE 2] New Reports
router.get('/reports/atb', protect, authorize('admin', 'billing'), getAgedTrialBalance);
router.get('/reports/daily-revenue', protect, authorize('admin', 'billing'), getDailyRevenueReport);

// [PHASE 3] Accounting Periods
router.get('/periods', protect, authorize('admin', 'billing'), getAccountingPeriods);
router.post('/periods', protect, authorize('admin', 'billing'), createAccountingPeriod);
router.post('/periods/:id/close', protect, authorize('admin', 'billing'), closeAccountingPeriod);
router.post('/periods/:id/reopen', protect, authorize('admin', 'billing'), reopenAccountingPeriod);
router.post('/periods/:id/:action', protect, authorize('admin', 'billing'), (req, res, next) => {
    if (req.params.action === 'close') return closeAccountingPeriod(req, res, next);
    if (req.params.action === 'reopen') return reopenAccountingPeriod(req, res, next);
    next();
});

module.exports = router;
