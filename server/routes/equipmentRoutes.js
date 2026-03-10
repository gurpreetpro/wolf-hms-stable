const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getEquipmentTypes,
    getEquipmentType,
    requestAddEquipment,
    requestEditEquipment,
    requestDeleteEquipment,
    getPendingRequests,
    approveRequest,
    denyRequest,
    assignEquipment,
    removeEquipment,
    getPatientEquipment,
    getEquipmentBilling,
    getEquipmentSchema // DEBUG
} = require('../controllers/equipmentController');

// DEBUG: Check Schema
router.get('/debug/schema', protect, authorize('admin'), getEquipmentSchema);

// Equipment types (read for all, write requires approval)
router.get('/types', protect, getEquipmentTypes);
router.get('/types/:id', protect, getEquipmentType);

// Equipment change requests (ward staff submits, admin approves)
router.post('/types/request-add', protect, requestAddEquipment);
router.post('/types/:id/request-edit', protect, requestEditEquipment);
router.post('/types/:id/request-delete', protect, requestDeleteEquipment);

// Admin approval endpoints
router.get('/requests/pending', protect, authorize('admin'), getPendingRequests);
router.post('/requests/:id/approve', protect, authorize('admin'), approveRequest);
router.post('/requests/:id/deny', protect, authorize('admin'), denyRequest);

// Equipment assignments (nurse or doctor)
router.post('/assign', protect, assignEquipment);
router.post('/assignments/:id/remove', protect, removeEquipment);
router.get('/patient/:admissionId', protect, getPatientEquipment);
router.get('/billing/:admissionId', protect, getEquipmentBilling);

// ============================================
// BIOMED EXTENSIONS (Tier 3)
// ============================================
const {
    getBiomedDashboard, getPMSchedules, createPMSchedule, completePM,
    getCalibrations, logCalibration, getAMCContracts, createAMCContract,
} = require('../controllers/equipmentController');

// Biomed Dashboard
router.get('/biomed/dashboard', protect, getBiomedDashboard);

// PM Schedules
router.get('/pm-schedules', protect, getPMSchedules);
router.post('/pm-schedules', protect, authorize('admin', 'biomed_engineer'), createPMSchedule);
router.put('/pm-schedules/:id/complete', protect, authorize('admin', 'biomed_engineer'), completePM);

// Calibration
router.get('/calibrations', protect, getCalibrations);
router.post('/calibrations', protect, authorize('admin', 'biomed_engineer'), logCalibration);

// AMC Contracts
router.get('/amc-contracts', protect, getAMCContracts);
router.post('/amc-contracts', protect, authorize('admin', 'biomed_engineer'), createAMCContract);

module.exports = router;
