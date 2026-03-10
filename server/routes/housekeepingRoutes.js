const express = require('express');
const router = express.Router();
const { createTask, getTasks, updateTaskStatus } = require('../controllers/housekeepingController');
const { protect } = require('../middleware/authMiddleware');

// All housekeeping routes are protected
console.log('🧹 Housekeeping Routes Loaded');
// All housekeeping routes are protected
router.use(protect);

router.post('/', createTask); // Request a cleanup
router.get('/', getTasks); // View tasks (dashboard)
router.put('/:id', updateTaskStatus); // Update status (e.g., mark done)

module.exports = router;
