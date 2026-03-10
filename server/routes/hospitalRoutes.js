/**
 * Hospital Routes
 * API endpoints for hospital/tenant management
 * Phase 0: Multi-Tenancy Foundation
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const hospitalController = require('../controllers/hospitalController');

// Public endpoints (for mobile apps to get branding)
router.get('/branding/:subdomain', hospitalController.getHospitalBranding);
router.get('/resolve/:subdomain', hospitalController.getHospitalBySubdomain);

// Authenticated user's current hospital context (for mobile apps)
router.get('/current', authenticateToken, hospitalController.getCurrentHospital);

// Protected endpoints (admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), hospitalController.getAllHospitals);
router.get('/stats', authenticateToken, authorizeRoles('admin'), hospitalController.getHospitalStats);
router.get('/:id', authenticateToken, authorizeRoles('admin'), hospitalController.getHospital);
router.post('/', authenticateToken, authorizeRoles('admin'), hospitalController.createHospital);
router.put('/:id', authenticateToken, authorizeRoles('admin'), hospitalController.updateHospital);

module.exports = router;
