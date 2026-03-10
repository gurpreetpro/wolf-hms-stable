/**
 * Medical Records (HIM) Routes
 * WOLF HMS — Tier 3 Differentiator
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const himController = require('../controllers/medicalRecordsController');

// All routes require authentication
router.use(protect);

// Dashboard
router.get('/dashboard', himController.getDashboardStats);

// Records
router.get('/records', himController.getRecords);
router.patch('/records/:id', authorize('admin', 'medical_records'), himController.updateRecordStatus);

// Requests
router.get('/requests', himController.getRequests);
router.post('/requests', himController.createRequest);
router.patch('/requests/:id', authorize('admin', 'medical_records'), himController.updateRequestStatus);

// ICD Coding
router.get('/coding', himController.getCodingQueue);
router.post('/coding', authorize('admin', 'medical_records'), himController.submitCoding);

// MLC Cases
router.get('/mlc', himController.getMLCCases);

// Audit Trail
router.get('/audit', authorize('admin', 'medical_records'), himController.getAuditTrail);

module.exports = router;
