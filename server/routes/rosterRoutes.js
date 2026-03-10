const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    assignShift,
    getRoster,
    getMyAssignments,
    getNurses
} = require('../controllers/rosterController');

// All roster routes need authentication
router.use(protect);

// Admin/Incharge routes
router.post('/assign', authorize('admin', 'ward_incharge'), assignShift);
router.get('/roster', getRoster); // Managers read roster
router.get('/nurses', getNurses); // Helper to get nurse list

// Nurse routes
router.get('/my-assignments', getMyAssignments);

module.exports = router;
