const express = require('express');
const router = express.Router();
const otController = require('../controllers/otController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get all rooms
router.get('/rooms', protect, otController.getOTRooms);

// Get scheduling calendar
router.get('/schedule', protect, otController.getSchedule);

// Book new surgery
router.post('/book', protect, authorize('admin', 'doctor'), otController.bookSurgery);

// Update status
router.put('/:id/status', protect, authorize('admin', 'doctor', 'nurse'), otController.updateStatus);

module.exports = router;
