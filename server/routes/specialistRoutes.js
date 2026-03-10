// ============================================================================
// specialistRoutes.js
// Routes for Specialist Categories and Visiting Doctor Management
// ============================================================================
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const specialistController = require('../controllers/specialistController');

// Apply protection to all routes
router.use(protect);

// ============================================================================
// SPECIALIST CATEGORIES
// ============================================================================
router.route('/categories')
    .get(specialistController.getCategories)
    .post(authorize('admin'), specialistController.createCategory);

router.route('/categories/:id')
    .get(specialistController.getCategory)
    .put(authorize('admin'), specialistController.updateCategory)
    .delete(authorize('admin'), specialistController.deleteCategory);

// ============================================================================
// VISITING DOCTORS
// ============================================================================
router.route('/doctors')
    .get(specialistController.getVisitingDoctors);

router.route('/doctors/:id')
    .get(specialistController.getVisitingDoctor)
    .put(authorize('admin'), specialistController.updateVisitingDoctor)
    .delete(authorize('admin'), specialistController.removeVisitingDoctor);

router.route('/doctors/:id/consultations')
    .get(specialistController.getDoctorConsultations);

router.route('/doctors/:id/payouts')
    .get(specialistController.getDoctorPayouts);

// ============================================================================
// CONSULTATIONS
// ============================================================================
router.route('/consultations')
    .post(authorize('admin', 'receptionist', 'billing'), specialistController.createConsultation);

// ============================================================================
// PAYOUTS
// ============================================================================
router.route('/payouts')
    .post(authorize('admin', 'billing'), specialistController.generatePayout);

router.route('/payouts/:id')
    .put(authorize('admin', 'billing'), specialistController.updatePayout);

// ============================================================================
// REPORTS
// ============================================================================
router.route('/earnings-summary')
    .get(authorize('admin', 'billing'), specialistController.getEarningsSummary);

module.exports = router;
