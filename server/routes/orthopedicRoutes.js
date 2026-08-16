/** Orthopedic Routes - WOLF HMS Horizon 2 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/orthopedicController');

router.use(protect);

router.get('/visits', ctrl.getVisits);
router.post('/visits', authorize('admin', 'orthopedic_surgeon', 'orthopedist', 'doctor'), ctrl.createVisit);
router.get('/visits/:id', ctrl.getVisitById);

router.get('/procedures', ctrl.getProcedures);
router.post('/procedures', authorize('admin', 'orthopedic_surgeon', 'orthopedist', 'doctor'), ctrl.logProcedure);

router.get('/implants', ctrl.getImplants);
router.post('/implants', authorize('admin', 'orthopedic_surgeon'), ctrl.addImplant);

router.get('/physio-orders', ctrl.getPhysioOrders);
router.post('/physio-orders', authorize('admin', 'orthopedic_surgeon', 'physiotherapist', 'doctor'), ctrl.createPhysioOrder);

module.exports = router;