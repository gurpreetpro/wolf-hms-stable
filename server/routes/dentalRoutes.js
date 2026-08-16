/**
 * Dental Routes
 * WOLF HMS — Horizon 2 Dental Module
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const dentalController = require('../controllers/dentalController');

router.use(protect);

router.route('/visits')
  .post(authorize('admin', 'dentist', 'oral_surgeon', 'doctor'), dentalController.createDentalVisit)
  .get(dentalController.getDentalVisits);

router.get('/visits/:id', dentalController.getDentalVisitsById);

router.route('/procedures')
  .post(authorize('admin', 'dentist', 'oral_surgeon'), dentalController.logDentalProcedure)
  .get(dentalController.getProcedures);

router.route('/inventory')
  .get(dentalController.getInventory)
  .post(authorize('admin', 'dentist'), dentalController.addInventoryItem);

router.route('/lab-orders')
  .post(authorize('admin', 'dentist', 'oral_surgeon', 'doctor'), dentalController.createLabOrder)
  .get(dentalController.getLabOrders);

module.exports = router;