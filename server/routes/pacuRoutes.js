const express = require('express');
const router = express.Router();
const pacuController = require('../controllers/pacuController');

router.get('/dashboard', pacuController.getDashboard);
router.post('/admit', pacuController.admitPatient);
router.post('/score', pacuController.saveAldreteScore);
router.post('/discharge', pacuController.dischargePatient);

module.exports = router;
