const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getAvailableSlots,
    getAppointments,
    createAppointment,
    updateAppointmentStatus,
    getTodaysSummary,
    getDoctors
} = require('../controllers/appointmentController');

// Public route - get doctors list (for booking form)
router.get('/doctors', protect, getDoctors);

// Get available time slots for a doctor on a date
router.get('/slots', protect, authorize('admin', 'receptionist', 'doctor'), getAvailableSlots);

// Get all appointments (with optional filters)
router.get('/', protect, authorize('admin', 'receptionist', 'doctor'), getAppointments);

// Get today's summary
router.get('/summary', protect, authorize('admin', 'receptionist', 'doctor'), getTodaysSummary);

// Create a new appointment
router.post('/', protect, authorize('admin', 'receptionist'), createAppointment);

// Update appointment status
router.patch('/:id/status', protect, authorize('admin', 'receptionist', 'doctor'), updateAppointmentStatus);

module.exports = router;
