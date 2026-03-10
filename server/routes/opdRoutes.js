const express = require('express');
const router = express.Router();
const { registerOPD, getQueue, createDemoPatient, resetDemo, getAppointments, uploadDocument } = require('../controllers/opdController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { cache } = require('../middleware/cacheMiddleware');
const { documentUpload, preFetchHospitalCode } = require('../middleware/tenantUpload');

// Updated to allow more roles for demo compatibility
router.post('/register', protect, authorize('receptionist', 'admin', 'administrator', 'doctor', 'nurse'), registerOPD);
router.post('/cancel', protect, authorize('receptionist', 'admin', 'administrator'), require('../controllers/opdController').cancelVisit);
router.post('/reschedule', protect, authorize('receptionist', 'admin', 'administrator'), require('../controllers/opdController').rescheduleVisit);
router.get('/queue', protect, getQueue);
router.get('/appointments', protect, cache(30), getAppointments);

// Document upload with tenant isolation
router.post('/upload-document', protect, preFetchHospitalCode, documentUpload.single('document'), uploadDocument);

// Demo routes
router.post('/demo-patient', protect, createDemoPatient);
router.post('/demo-reset', protect, resetDemo);

module.exports = router;
