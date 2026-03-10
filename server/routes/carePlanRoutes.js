const express = require('express');
const router = express.Router();
const {
    getCarePlanTemplates,
    assignCarePlan,
    getPatientCarePlans,
    updateCarePlanProgress
} = require('../controllers/carePlanController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/templates', protect, getCarePlanTemplates);
router.post('/assign', protect, authorize('doctor', 'admin'), assignCarePlan);
router.get('/patient/:admission_id', protect, getPatientCarePlans);
router.patch('/:id/progress', protect, authorize('doctor', 'admin'), updateCarePlanProgress);

module.exports = router;
