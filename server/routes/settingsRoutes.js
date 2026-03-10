const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Hospital Profile - requires authentication for hospital_id context
// Frontend calls /api/settings/hospital-profile
router.get('/hospital-profile', authenticateToken, settingsController.getSettings);
router.post('/hospital-profile', authenticateToken, settingsController.updateSettings);
router.put('/hospital-profile', authenticateToken, settingsController.updateSettings);

// Rate Card
router.get('/services', authenticateToken, settingsController.getServices);
router.put('/services/price', authenticateToken, settingsController.updateServicePrice);

// Payment Settings (Multi-Tenant)
router.get('/payment', authenticateToken, settingsController.getPaymentSettings);
router.put('/payment', authenticateToken, settingsController.updatePaymentSettings);
router.post('/payment', authenticateToken, settingsController.updatePaymentSettings);

// SMS Settings (Multi-Tenant)
router.get('/sms', authenticateToken, settingsController.getSmsSettings);
router.put('/sms', authenticateToken, settingsController.updateSmsSettings);
router.post('/sms', authenticateToken, settingsController.updateSmsSettings);

// Confirmation Settings (Multi-Tenant)
router.get('/confirmation', authenticateToken, settingsController.getConfirmationSettings);
router.put('/confirmation', authenticateToken, settingsController.updateConfirmationSettings);
router.post('/confirmation', authenticateToken, settingsController.updateConfirmationSettings);

// ID Series Settings (UHID & IPD Number Format) - reads/writes to hospitals.settings JSONB
router.get('/id-series', authenticateToken, settingsController.getIdSettings);
router.put('/id-series', authenticateToken, settingsController.updateIdSettings);
router.post('/id-series', authenticateToken, settingsController.updateIdSettings);

module.exports = router;

