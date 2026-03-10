/**
 * Charges Routes - Centralized Billing Module
 * 
 * Routes for managing pending charges across all departments.
 * All billing goes through here; departments create charges, billing confirms.
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const chargesController = require('../controllers/chargesController');

// All routes require authentication
router.use(protect);

// ============================================================
// CHARGE MANAGEMENT
// ============================================================

/**
 * POST /api/charges
 * Create a new pending charge
 * Can be called by any department (lab, pharmacy, opd, etc.)
 */
router.post('/', chargesController.createCharge);

/**
 * GET /api/charges
 * Get all pending charges (billing queue)
 * Supports filtering: ?status=pending&charge_type=lab&patient_id=xxx
 */
router.get('/', chargesController.getPendingCharges);

/**
 * GET /api/charges/summary
 * Get billing queue summary for dashboard cards
 */
router.get('/summary', chargesController.getBillingQueueSummary);

/**
 * GET /api/charges/patient/:patientId
 * Get all charges for a specific patient
 */
router.get('/patient/:patientId', chargesController.getPatientCharges);

// ============================================================
// INVOICE OPERATIONS (Billing staff only)
// ============================================================

/**
 * POST /api/charges/invoice
 * Add pending charges to an invoice
 * Body: { charge_ids: [1,2,3], create_new_invoice: true }
 */
router.post('/invoice', chargesController.addChargesToInvoice);

// ============================================================
// CHARGE STATUS UPDATES
// ============================================================

/**
 * POST /api/charges/:id/cancel
 * Cancel a pending charge
 * Body: { reason: "Patient requested cancellation" }
 */
router.post('/:id/cancel', chargesController.cancelCharge);

/**
 * POST /api/charges/:id/waive
 * Waive a charge (requires admin/billing_manager role)
 * Body: { reason: "Compassionate waiver" }
 */
router.post('/:id/waive', chargesController.waiveCharge);

module.exports = router;
