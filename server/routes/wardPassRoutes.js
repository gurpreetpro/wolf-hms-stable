const express = require('express');
const router = express.Router();
const wardPassController = require('../controllers/wardPassController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Reception Issues Pass
router.post('/issue', protect, authorize('admin', 'receptionist'), wardPassController.issuePass);

// Guard Scans Pass
router.post('/verify', protect, authorize('admin', 'security_guard'), wardPassController.verifyAccess);

router.get('/stats', protect, authorize('admin', 'doctor', 'nurse', 'receptionist'), wardPassController.getWardStats); // HMS Access

module.exports = router;
