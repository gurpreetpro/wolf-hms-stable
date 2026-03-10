const express = require('express');
const router = express.Router();
const { 
    ingestVitals, 
    ingestLabResult, 
    updateBedStatus, 
    getDeviceStatus,
    registerDevice 
} = require('../controllers/deviceController');
const { protect } = require('../middleware/authMiddleware');

// Device data ingestion (may use API key auth instead of JWT)
router.post('/ingest', ingestVitals);
router.post('/lab-result', ingestLabResult);
router.post('/bed-status', updateBedStatus);

// Device management (requires authentication)
router.get('/status', protect, getDeviceStatus);
router.post('/register', protect, registerDevice);

module.exports = router;

