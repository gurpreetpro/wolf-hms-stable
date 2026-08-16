/**
 * Ophthalmology Routes
 * WOLF HMS — Horizon 2 Ophthalmology Module
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const c = require('../controllers/ophthalmologyController');

router.use(protect);

// Visits
router.get('/visits', c.getVisits);
router.post('/visits', authorize('admin', 'ophthalmologist', 'optometrist', 'doctor'), c.createVisit);
router.get('/visits/:id', c.getVisitById);

// Procedures
router.get('/procedures', c.getProcedures);
router.post('/procedures', authorize('admin', 'ophthalmologist', 'doctor'), c.logProcedure);

// Biometry
router.get('/biometry', c.getBiometry);
router.post('/biometry', authorize('admin', 'ophthalmologist', 'optometrist'), c.addBiometry);

// IOL Inventory
router.get('/inventory', c.getIOLInventory);
router.post('/inventory', authorize('admin', 'ophthalmologist'), c.addIOLInventory);

module.exports = router;