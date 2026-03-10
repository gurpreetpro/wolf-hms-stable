const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Valid roles: admin, security_guard, receptionist (if added later)
// For now guards handle reception duty as per user prompt logic
const ROLES = ['admin', 'security_guard'];

router.post('/log', protect, authorize(...ROLES), visitorController.logVisitor);
router.get('/active', protect, authorize(...ROLES), visitorController.getActiveVisitors);
router.put('/checkout/:id', protect, authorize(...ROLES), visitorController.checkoutVisitor);
router.post('/invite', protect, authorize(...ROLES), visitorController.createInvite);
router.get('/invites', protect, authorize(...ROLES), visitorController.getInvites);
router.get('/search-patients', protect, authorize(...ROLES), visitorController.searchPatients);

module.exports = router;
