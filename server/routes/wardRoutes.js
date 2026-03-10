const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getWards,
    createWard,
    updateWard,
    deleteWard,
    getBeds,
    createBed,
    updateBed,
    deleteBed,
    getConsumables,
    getCharges,
    requestChange,
    getRequests,
    handleRequest,
    getAssignments,
    getVitals, addVitals, getEMAR, addEMAR
} = require('../controllers/wardController');

// Ward routes - Admin only for CUD
// Root handler for /api/ward (frontend expects this)
router.get('/', protect, getWards);
router.get('/wards', protect, getWards);
router.get('/my-assignments', protect, getAssignments);

// Dashboard endpoint for credibility audit
router.get('/dashboard', protect, async (req, res) => {
    try {
        const wards = await require('../config/db').query(
            'SELECT COUNT(*) as ward_count FROM wards WHERE hospital_id = $1',
            [req.hospital_id || 1]
        );
        const beds = await require('../config/db').query(
            'SELECT status, COUNT(*) as count FROM beds WHERE hospital_id = $1 GROUP BY status',
            [req.hospital_id || 1]
        );
        res.json({ 
            success: true, 
            wards: wards.rows[0]?.ward_count || 0,
            beds: beds.rows
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
router.post('/wards', protect, authorize('admin', 'ward_incharge'), createWard);
router.put('/wards/:id', protect, authorize('admin', 'ward_incharge'), updateWard);
router.delete('/wards/:id', protect, authorize('admin', 'ward_incharge'), deleteWard);

// Bed routes - Admin only for CUD, all for read
router.get('/beds', protect, getBeds);
router.post('/beds', protect, authorize('admin', 'ward_incharge'), createBed);
router.put('/beds/:id', protect, authorize('admin', 'ward_incharge'), updateBed);
router.delete('/beds/:id', protect, authorize('admin', 'ward_incharge'), deleteBed);

// Bed Management (Phase 3)
const { markBedClean } = require('../controllers/wardController');
router.post('/beds/clean', protect, authorize('admin', 'ward_incharge', 'nurse'), markBedClean);

// Consumables & Charges routes
router.get('/consumables', protect, getConsumables);
router.get('/charges', protect, getCharges);
router.post('/change-request', protect, requestChange); // Anyone can request (Conceptually Nurse/Ward Admin)

// Admin Approval Routes
router.get('/requests', protect, authorize('admin'), getRequests);
router.get('/requests', protect, authorize('admin'), getRequests);
router.post('/request/:id/:action', protect, authorize('admin'), handleRequest);

// Clinical Features (Vitals & eMAR)
router.get('/vitals/:admissionId', protect, getVitals);
router.post('/vitals', protect, addVitals);
router.get('/emar/:admissionId', protect, getEMAR);
router.post('/emar', protect, addEMAR);

module.exports = router;
