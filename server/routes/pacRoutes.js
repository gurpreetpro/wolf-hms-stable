const express = require('express');
const router = express.Router();
const pacController = require('../controllers/pacController');

// Get list of potential PAC candidates
router.get('/pending', pacController.getPendingPAC);

// Get assessment for a specific surgery
router.get('/assessment/:surgeryId', pacController.getAssessment);

// Save (Create/Update) assessment
router.post('/save', pacController.saveAssessment);

module.exports = router;
