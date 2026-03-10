/**
 * Dietary Routes (Expanded)
 * WOLF HMS — Tier 2 Allied Health
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const dietaryController = require('../controllers/dietaryController');

// All dietary routes protected
router.use(protect);

// Dashboard
router.get('/dashboard', dietaryController.getDashboard);

// Orders (existing + enhanced)
router.route('/')
    .post(dietaryController.createOrder)
    .get(dietaryController.getOrders);
router.put('/:id', dietaryController.updateStatus);

// Meal Plans
router.get('/plans', dietaryController.getMealPlans);
router.post('/plans', authorize('admin', 'dietitian', 'doctor'), dietaryController.createMealPlan);
router.put('/plans/:id', authorize('admin', 'dietitian'), dietaryController.updateMealPlan);

// Patient Allergies
router.get('/allergies', dietaryController.getAllergies);
router.post('/allergies', authorize('admin', 'dietitian', 'doctor', 'nurse'), dietaryController.addAllergy);

// Nutrition Tracking
router.get('/nutrition', dietaryController.getNutritionLogs);
router.post('/nutrition', authorize('admin', 'dietitian', 'nurse'), dietaryController.logNutrition);

module.exports = router;
