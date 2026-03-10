const express = require('express');
const router = express.Router();
const intraOpController = require('../controllers/intraOpController');

// Start a new record (or fetch existing by surgery_id)
router.post('/start', intraOpController.startCase);

// Log an event (Vitals, Drug, etc.)
router.post('/log', intraOpController.logEvent);

// Get full chart data
router.get('/chart/:recordId', intraOpController.getLiveChart);

// End case
router.put('/end/:recordId', intraOpController.endCase);

module.exports = router;
