/**
 * Government Scheme Routes
 * API routes for CGHS, ECHS, CAPF rate lookup and management
 * WOLF HMS
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getSchemePackages,
    getPackageRate,
    getSchemeSpecialties,
    calculateClaim,
    compareSchemeRates,
    getModifiers,
    getSchemeStats,
    getWardEntitlement,
    registerBeneficiary,
    verifyBeneficiary,
    searchBeneficiaries,
    getPatientSchemes,
    getEmpanelment,
    updateEmpanelment
} = require('../controllers/govtSchemeController');

// ============================================
// Rate Lookup Routes (scheme = cghs | echs | capf)
// ============================================
router.get('/:scheme/packages', protect, authorize('admin', 'billing', 'doctor'), getSchemePackages);
router.get('/:scheme/packages/:code', protect, authorize('admin', 'billing', 'doctor'), getPackageRate);
router.get('/:scheme/specialties', protect, authorize('admin', 'billing', 'doctor'), getSchemeSpecialties);
router.post('/:scheme/calculate-claim', protect, authorize('admin', 'billing'), calculateClaim);
router.post('/:scheme/compare-rates', protect, authorize('admin', 'billing'), compareSchemeRates);
router.get('/:scheme/modifiers', protect, authorize('admin', 'billing'), getModifiers);
router.get('/:scheme/stats', protect, authorize('admin', 'billing'), getSchemeStats);

// ============================================
// Ward Entitlement Helper
// ============================================
router.get('/ward-entitlement/:basicPay', protect, getWardEntitlement);

// ============================================
// Beneficiary Management Routes
// ============================================
router.post('/beneficiaries/register', protect, authorize('admin', 'billing', 'receptionist'), registerBeneficiary);
router.post('/beneficiaries/verify', protect, authorize('admin', 'billing', 'receptionist'), verifyBeneficiary);
router.get('/beneficiaries/search', protect, authorize('admin', 'billing', 'receptionist'), searchBeneficiaries);
router.get('/beneficiaries/patient/:patientId', protect, authorize('admin', 'billing', 'doctor'), getPatientSchemes);

// ============================================
// Empanelment Routes
// ============================================
router.get('/empanelment', protect, authorize('admin'), getEmpanelment);
router.post('/empanelment', protect, authorize('admin'), updateEmpanelment);

module.exports = router;
