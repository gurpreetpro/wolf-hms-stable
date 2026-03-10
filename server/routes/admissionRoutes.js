const express = require('express');
const router = express.Router();
const { admitPatient, dischargePatient, transferPatient, getAdmittedPatients, getAvailableBeds, getBedHistory, updateDiet, markRoundSeen } = require('../controllers/admissionController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, sanitize } = require('../middleware/validationMiddleware');

router.get('/available-beds', protect, authorize('receptionist', 'admin', 'doctor', 'ward_incharge'), getAvailableBeds);
router.get('/active', protect, authorize('doctor', 'admin', 'nurse', 'ward_incharge'), getAdmittedPatients);
router.get('/bed-history/:admission_id', protect, getBedHistory);
router.post('/admit', protect, authorize('receptionist', 'admin', 'doctor', 'ward_incharge'), sanitize, validate('admission'), admitPatient);
router.post('/transfer', protect, authorize('admin', 'doctor', 'nurse', 'ward_incharge'), sanitize, transferPatient);
router.post('/discharge', protect, authorize('admin', 'doctor', 'ward_incharge'), sanitize, dischargePatient);

// Phase 4: IPD Upgrades
router.put('/diet', protect, authorize('doctor', 'admin'), updateDiet);
router.post('/rounds/seen', protect, authorize('doctor', 'admin'), markRoundSeen);

module.exports = router;
