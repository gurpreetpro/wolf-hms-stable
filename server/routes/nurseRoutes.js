const express = require('express');
const router = express.Router();
const {
    createCarePlan,
    getCarePlan,
    updateCarePlan,
    logPainScore,
    getPainScores,
    logFluidBalance,
    getFluidBalance,
    insertIVLine,
    getIVLines,
    removeIVLine,
    getWardOverview,
    recordConsumable,
    getPatientConsumables,
    getShiftHandover,
    saveWoundAssessment,
    getWoundAssessments,
    saveFallRisk,
    getFallRisk,
    recordServiceUsage,
    getPatientServices,
    saveShiftHandoffNote,
    getShiftHandoffNotes,
    saveReadBackConfirmation
} = require('../controllers/nurseController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require nurse/doctor/admin authorization
router.use(protect);
router.use(authorize('nurse', 'doctor', 'admin', 'ward_incharge'));

// Care Plans
router.post('/care-plan', createCarePlan);
router.get('/care-plan/:admission_id', getCarePlan);
router.put('/care-plan/:id', updateCarePlan);

// Pain Scores
router.post('/pain', logPainScore);
router.get('/pain/:admission_id', getPainScores);

// Fluid Balance
router.post('/fluid-balance', logFluidBalance);
router.get('/fluid-balance/:admission_id', getFluidBalance);

// IV Lines
router.post('/iv-line', insertIVLine);
router.get('/iv-line/:admission_id', getIVLines);
router.put('/iv-line/:id/remove', removeIVLine);

// Ward Overview
router.get('/ward-overview', getWardOverview);

// Shift Handover Report — Phase 1 Enterprise
router.get('/shift-handover', getShiftHandover);

// Patient Consumables
router.post('/consumables', recordConsumable);
router.get('/consumables/:admission_id', getPatientConsumables);

// Patient Services (Misc Charges)
router.post('/services', recordServiceUsage);
router.get('/services/:admission_id', getPatientServices);

// BCMA - Medication Administration
const { administerMedication } = require('../controllers/nurseController');
router.post('/medications/administer', administerMedication);

// Wound Assessments - Gold Standard Phase 3
router.get('/wounds/:admission_id', getWoundAssessments);
router.post('/wounds', saveWoundAssessment);

// Digital SBAR - Phase 4
router.get('/handover/notes/:admission_id', getShiftHandoffNotes);
router.post('/handover/notes', saveShiftHandoffNote);

// Read-Back Confirmation — Persisted
router.post('/handover/readback', saveReadBackConfirmation);

module.exports = router;
