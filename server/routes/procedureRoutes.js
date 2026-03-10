const express = require('express');
const router = express.Router();
const { getProcedures, addProcedure, updateProcedure, deleteProcedure } = require('../controllers/procedureController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin', 'doctor'), getProcedures);
router.post('/', protect, authorize('admin'), addProcedure);
router.put('/:id', protect, authorize('admin'), updateProcedure);
router.delete('/:id', protect, authorize('admin'), deleteProcedure);

module.exports = router;
