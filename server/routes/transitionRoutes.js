const express = require('express');
const router = express.Router();
const {
    getDischargePlan,
    updateDischargePlan,
    createHandoff,
    getHandoffs
} = require('../controllers/transitionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Discharge Planning
router.get('/discharge/:admission_id', protect, getDischargePlan);
router.patch('/discharge/:admission_id', protect, authorize('doctor', 'admin'), updateDischargePlan);

// Shift Handoffs
router.get('/handoffs', protect, getHandoffs);
router.post('/handoff', protect, authorize('doctor', 'admin', 'nurse', 'ward_incharge'), createHandoff);

module.exports = router;
