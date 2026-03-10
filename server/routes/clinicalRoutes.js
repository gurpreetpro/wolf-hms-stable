const express = require('express');
const router = express.Router();
const {
    createCareTask,
    getTasks,
    completeTask,
    acknowledgeTask,
    logVitals,
    getVitalsByPatient,
    prescribe,
    saveConsultation,
    getPatientHistory,
    createSOAPNote,
    getSOAPNotes,
    createRoundNote,
    getRoundNotes,
    orderMedication,
    orderLabTest,
    requestVitals,
    recordProcedure
} = require('../controllers/clinicalController');
const { protect, authorize } = require('../middleware/authMiddleware');

const validateRequest = require('../middleware/validateRequest');
const { logVitalsSchema } = require('../validators/clinical');

router.post('/tasks', protect, authorize('doctor', 'nurse', 'admin'), createCareTask);
router.get('/tasks', protect, getTasks);
router.post('/tasks/complete', protect, authorize('nurse', 'doctor', 'admin'), completeTask);
router.post('/tasks/acknowledge', protect, authorize('nurse', 'ward_incharge', 'admin'), acknowledgeTask);
router.post('/vitals', protect, authorize('nurse', 'doctor', 'admin', 'receptionist', 'ward_incharge'), validateRequest(logVitalsSchema), logVitals);
router.get('/vitals/:patient_id', protect, getVitalsByPatient);
router.post('/prescribe', protect, authorize('doctor', 'admin'), prescribe);
router.post('/consultation', protect, authorize('doctor', 'admin'), saveConsultation);
router.get('/history/:id', protect, getPatientHistory);

router.post('/soap-notes', protect, authorize('doctor', 'admin'), createSOAPNote);
router.get('/soap-notes/:admission_id', protect, getSOAPNotes);

router.post('/round-notes', protect, authorize('doctor', 'admin'), createRoundNote);
router.get('/round-notes/:admission_id', protect, getRoundNotes);

// CPOE - IPD Medication, Lab, and Vital Ordering
router.post('/order-medication', protect, authorize('doctor', 'admin'), orderMedication);
router.post('/order-lab', protect, authorize('doctor', 'admin'), orderLabTest);
router.post('/request-vitals', protect, authorize('doctor', 'admin'), requestVitals);
router.post('/record-procedure', protect, authorize('doctor', 'admin'), recordProcedure);

module.exports = router;

