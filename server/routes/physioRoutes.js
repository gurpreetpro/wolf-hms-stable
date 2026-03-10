/**
 * Physiotherapy Routes
 * WOLF HMS — Tier 2 Allied Health
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const physioController = require('../controllers/physioController');

// All routes require authentication
router.use(protect);

// Dashboard
router.get('/dashboard', physioController.getDashboardStats);

// Patients
router.get('/patients', physioController.getPatients);

// Rehab Plans
router.get('/plans/:id', physioController.getPlanById);
router.post('/plans', authorize('admin', 'physiotherapist', 'doctor'), physioController.createPlan);
router.put('/plans/:id', authorize('admin', 'physiotherapist'), physioController.updatePlan);

// Sessions
router.get('/sessions', physioController.getSessions);
router.post('/sessions', authorize('admin', 'physiotherapist'), physioController.logSession);

// Exercise Library
router.get('/exercises', physioController.getExerciseLibrary);
router.post('/exercises', authorize('admin', 'physiotherapist'), physioController.addExercise);

module.exports = router;
