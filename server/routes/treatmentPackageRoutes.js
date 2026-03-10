/**
 * Treatment Package Routes
 * API endpoints for hospital treatment packages
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

const {
    getPackages,
    getPackageById,
    getPackagesByCategory,
    createPackage,
    updatePackage,
    deletePackage,
    assignPackage,
    getPatientPackage,
    logExtra,
    completePackage,
    getCategories,
    comparePackages
} = require('../controllers/treatmentPackageController');

// ============================================
// PACKAGE CATALOG
// ============================================

// Get all packages (public for viewing, protected for admin operations)
router.get('/', protect, getPackages);

// Get categories with counts
router.get('/categories', protect, getCategories);

// Compare multiple packages
router.get('/compare', protect, comparePackages);

// Get packages by category
router.get('/category/:category', protect, getPackagesByCategory);

// Get package by ID with items
router.get('/:id', protect, getPackageById);

// Create package (Admin only)
router.post('/', protect, authorize('admin'), createPackage);

// Update package (Admin only)
router.put('/:id', protect, authorize('admin'), updatePackage);

// Delete (deactivate) package (Admin only)
router.delete('/:id', protect, authorize('admin'), deletePackage);

// ============================================
// PATIENT PACKAGE ASSIGNMENT
// ============================================

// Assign package to patient
router.post('/assign', protect, authorize('admin', 'doctor', 'receptionist'), assignPackage);

// Get patient's active package
router.get('/patient/:patient_id', protect, getPatientPackage);

// Log extra charge beyond package
router.post('/extras', protect, authorize('admin', 'doctor', 'nurse', 'pharmacist'), logExtra);

// Complete patient package
router.put('/complete/:id', protect, authorize('admin', 'billing'), completePackage);

module.exports = router;
