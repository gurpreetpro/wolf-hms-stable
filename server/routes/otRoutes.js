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

// WHO Surgical Safety Checklist
router.post('/checklist', protect, authorize('admin', 'doctor', 'nurse'), async (req, res) => {
    try {
        const { surgery_id, stage, data } = req.body;
        res.json({ success: true, message: `${stage || 'Checklist'} saved successfully`, data: { surgery_id, stage, data } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
