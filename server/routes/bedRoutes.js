const express = require('express');
const router = express.Router();
const { getWards, createWard, getBeds, addBed, updateBedStatus, getWardOccupancy } = require('../controllers/bedController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/wards', protect, authorize('admin', 'doctor', 'nurse', 'receptionist'), getWards);
router.post('/wards', protect, authorize('admin'), createWard);
router.get('/wards/:wardId/beds', protect, authorize('admin', 'doctor', 'nurse', 'receptionist'), getBeds);
router.post('/wards/:wardId/beds', protect, authorize('admin'), addBed);
router.get('/occupancy', protect, authorize('admin'), getWardOccupancy);
router.put('/beds/:id/status', protect, authorize('admin', 'nurse'), updateBedStatus);

module.exports = router;
