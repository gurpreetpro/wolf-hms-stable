/**
 * Wolf HMS - Location API Routes
 * 
 * Admin endpoints for staff location data:
 * - GET /trail/:staffId  → GPS trail for route replay
 * - GET /online-staff    → Currently online delivery/collection staff
 */

const express = require('express');
const router = express.Router();
const locationService = require('../services/locationService');

// ====================
// GET /trail/:staffId - Location trail for route replay
// ====================
router.get('/trail/:staffId', async (req, res) => {
    try {
        const { staffId } = req.params;
        const { jobType, jobId, from, to, limit } = req.query;

        const trail = await locationService.getLocationTrail(
            staffId,
            jobType || null,
            jobId || null,
            {
                from: from || null,
                to: to || null,
                limit: Number.parseInt(limit) || 500,
            }
        );

        res.json({
            success: true,
            staffId: Number.parseInt(staffId),
            pointCount: trail.length,
            trail,
        });
    } catch (err) {
        console.error('[LOCATIONS] Trail error:', err);
        res.status(500).json({ error: 'Failed to fetch location trail' });
    }
});

// ====================
// GET /online-staff - Currently online staff
// ====================
router.get('/online-staff', async (req, res) => {
    try {
        const { hospitalId, role } = req.query;

        const staff = await locationService.getOnlineStaff(
            hospitalId ? Number.parseInt(hospitalId) : null,
            role || null
        );

        res.json({
            success: true,
            count: staff.length,
            staff,
        });
    } catch (err) {
        console.error('[LOCATIONS] Online staff error:', err);
        res.status(500).json({ error: 'Failed to fetch online staff' });
    }
});

module.exports = router;
