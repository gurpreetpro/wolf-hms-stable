const express = require('express');
const router = express.Router();
const { generateWristband, generatePatientCard, generateRegistrationSlip } = require('../controllers/barcodeController');
const { protect: verifyToken } = require('../middleware/authMiddleware');

// Wristband barcode for inpatients (NABH compliance)
router.get('/wristband/:admission_id', verifyToken, generateWristband);

// Patient registration card with UHID barcode
router.get('/patient-card/:patient_id', verifyToken, generatePatientCard);

// [G3.3] Registration slip with QR code
router.get('/registration-slip/:patient_id', verifyToken, generateRegistrationSlip);

module.exports = router;
