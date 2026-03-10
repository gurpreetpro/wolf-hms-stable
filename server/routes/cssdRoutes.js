/**
 * CSSD Routes (Expanded)
 * WOLF HMS — Tier 3 Differentiator
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const cssdController = require('../controllers/cssdController');

// All routes require authentication
router.use(protect);

// Dashboard
router.get('/dashboard', cssdController.getDashboard);

// Sterilization Cycles
router.get('/cycles', cssdController.getCycles);
router.get('/cycles/:id', cssdController.getCycleById);
router.post('/cycles', authorize('admin', 'cssd_tech'), cssdController.createBatch);
router.put('/cycles/:id/complete', authorize('admin', 'cssd_tech'), cssdController.completeBatch);

// Instruments
router.get('/instruments', cssdController.getInstruments);
router.put('/instruments/:id/issue', authorize('admin', 'cssd_tech'), cssdController.issueToDept);
router.put('/instruments/:id/return', authorize('admin', 'cssd_tech', 'nurse'), cssdController.returnInstrument);

// Load Logs
router.get('/load-logs', cssdController.getLoadLogs);
router.post('/load-logs', authorize('admin', 'cssd_tech'), cssdController.createLoadLog);

// Bio-Indicators
router.get('/bio-indicators', cssdController.getBioIndicators);
router.post('/bio-indicators', authorize('admin', 'cssd_tech'), cssdController.logBioIndicator);

// Inventory (legacy)
router.get('/inventory', cssdController.getInventory);
router.post('/log', cssdController.logAction);

// Batches (legacy alias)
router.get('/batches', cssdController.getBatches);
router.post('/batches', authorize('admin', 'cssd_tech'), cssdController.createBatch);
router.put('/batches/:id/complete', authorize('admin', 'cssd_tech'), cssdController.completeBatch);

module.exports = router;
