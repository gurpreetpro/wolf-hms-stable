const express = require('express');
const router = express.Router();
const adminRecoveryController = require('../controllers/adminRecoveryController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// All routes require authentication and admin/super-admin role
const adminOnly = [authenticateToken, authorize('admin', 'super_admin')];

// ===========================================================================
// PATIENT MANAGEMENT
// ===========================================================================

// Get all patients (including deleted)
router.get('/patients', ...adminOnly, adminRecoveryController.getAllPatients);

// Get patient details with history
router.get('/patients/:id', ...adminOnly, adminRecoveryController.getPatientDetails);

// Create patient directly
router.post('/patients', ...adminOnly, adminRecoveryController.createPatient);

// Update patient
router.put('/patients/:id', ...adminOnly, adminRecoveryController.updatePatient);

// Soft delete patient (requires reason)
router.delete('/patients/:id', ...adminOnly, adminRecoveryController.deletePatient);

// Restore deleted patient
router.post('/patients/:id/restore', ...adminOnly, adminRecoveryController.restorePatient);

// Export patient data (Right to Access - DPDP)
router.get('/patients/:id/export', ...adminOnly, adminRecoveryController.exportPatientData);

// Get patient change history
router.get('/patients/:patientId/history', ...adminOnly, adminRecoveryController.getPatientHistory);

// ===========================================================================
// AUDIT LOGS
// ===========================================================================

// Get audit logs
router.get('/audit-logs', ...adminOnly, adminRecoveryController.getAuditLogs);

// ===========================================================================
// DASHBOARD
// ===========================================================================

// Get recovery console stats
router.get('/stats', ...adminOnly, adminRecoveryController.getRecoveryStats);

// ===========================================================================
// MANUAL ENTRY (DISASTER RECOVERY)
// ===========================================================================

// Search patients for manual entry dropdown
router.get('/manual/search-patients', ...adminOnly, adminRecoveryController.searchPatientsForEntry);

// Get all manual entries (invoices + payments)
router.get('/manual/entries', ...adminOnly, adminRecoveryController.getManualEntries);

// Create manual invoice (backdated for disaster recovery)
router.post('/manual/invoice', ...adminOnly, adminRecoveryController.createManualInvoice);

// Create manual payment (backdated for disaster recovery)
router.post('/manual/payment', ...adminOnly, adminRecoveryController.createManualPayment);

module.exports = router;
