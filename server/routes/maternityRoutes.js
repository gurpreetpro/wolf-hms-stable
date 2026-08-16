const express = require('express');
const router = express.Router();
const maternityController = require('../controllers/maternityController');
const { protect } = require('../middleware/authMiddleware');

/**
 * 🤰 Maternity / OBGYN Routes
 * Prefixed under /api/maternity
 */

// Antenatal Profile Management
router.post('/antenatal', protect, maternityController.saveAntenatalProfile);
router.get('/antenatal/:patientId', protect, maternityController.getAntenatalProfile);

// Partograph Labor Monitoring Matrix & Algorithmic Distress Alert
router.post('/partograph', protect, maternityController.recordPartographReading);
router.get('/partograph/:patientId', protect, maternityController.getPartographTimeline);

// Delivery Registry & Birth Certificates
router.post('/delivery', protect, maternityController.registerDeliveryOutcome);
router.get('/delivery/:patientId', protect, maternityController.getDeliveryOutcome);

module.exports = router;
