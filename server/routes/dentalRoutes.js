/**
 * Dental Routes
 * WOLF HMS — Horizon 2 Dental Module
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const dentalController = require('../controllers/dentalController');

router.use(protect);

router.post('/visits', authorize('admin', 'dentist', 'oral_surgeon', 'doctor'), dentalController.createDentalVisit);
router.get('/visits', dentalController.getDentalVisits);
router.get('/visits/:id', dentalController.getDentalVisitsById);

router.post('/procedures', authorize('admin', 'dentist', 'oral_surgeon'), dentalController.logDentalProcedure);
router.get('/procedures', dentalController.getProcedures);

router.get('/inventory', dentalController.getInventory);
router.post('/inventory', authorize('admin', 'dentist'), dentalController.addInventoryItem);

router.post('/lab-orders', authorize('admin', 'dentist', 'oral_surgeon', 'doctor'), dentalController.createLabOrder);
router.get('/lab-orders', dentalController.getLabOrders);

module.exports = router;