/**
 * securityCompatRoutes.js — Tactical Dispatch Aliases, Super-Admin Analytics & Security Compatibility Shims
 * 
 * Modularized from server-cloud.js as part of Phase 3 hardening.
 * Provides backwards-compatible endpoints and aliases for Wolf Guard & Tactical Overwatch.
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getHospitalId } = require('../utils/tenantHelper');

// ==========================================
// 1. Tactical Dispatch Aliases
// ==========================================

/**
 * @route   GET /api/dispatch/emergencies, /api/dispatch/active
 * @desc    Fetch active emergency events for dispatch console
 */
const getActiveDispatchEmergencies = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req) || 1;
        const result = await pool.query(`
            SELECT id, code, location, status, triggered_by, triggered_at, patient_id, notes
            FROM emergency_logs
            WHERE hospital_id = $1 AND status = 'Active'
            ORDER BY triggered_at DESC
        `, [hospitalId]);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

router.get('/dispatch/emergencies', protect, getActiveDispatchEmergencies);
router.get('/dispatch/active', protect, getActiveDispatchEmergencies);

/**
 * @route   GET /api/dispatch/active-incidents
 * @desc    Fetch open security incidents
 */
router.get('/dispatch/active-incidents', protect, async (req, res) => {
    try {
        const hospitalId = getHospitalId(req) || 1;
        const result = await pool.query(`
            SELECT id, incident_type, severity, location, status, description, reported_by, reported_at
            FROM security_incidents
            WHERE hospital_id = $1 AND status != 'Resolved'
            ORDER BY reported_at DESC
            LIMIT 50
        `, [hospitalId]).catch(() => ({ rows: [] }));
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   GET /api/dispatch/nearby
 * @desc    Fetch available guards / responders near a given location
 */
router.get('/dispatch/nearby', protect, async (req, res) => {
    try {
        const hospitalId = getHospitalId(req) || 1;
        const result = await pool.query(`
            SELECT DISTINCT ON (gl.user_id)
                gl.user_id, u.username, u.full_name, gl.latitude, gl.longitude, 
                gl.floor_number, gl.battery_level, gl.timestamp
            FROM guard_locations gl
            JOIN users u ON gl.user_id = u.id
            WHERE gl.hospital_id = $1
            ORDER BY gl.user_id, gl.timestamp DESC
            LIMIT 25
        `, [hospitalId]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   GET /api/dispatch/recent-alerts
 * @desc    Fetch recent emergency alerts for ticker / notification feed
 */
router.get('/dispatch/recent-alerts', protect, async (req, res) => {
    try {
        const hospitalId = getHospitalId(req) || 1;
        const result = await pool.query(`
            SELECT id, code, location, status, triggered_at, resolved_at
            FROM emergency_logs
            WHERE hospital_id = $1
            ORDER BY triggered_at DESC
            LIMIT 20
        `, [hospitalId]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   GET /api/dispatch/emergency-logs/export
 * @desc    Export emergency logs for compliance audits
 */
router.get('/dispatch/emergency-logs/export', protect, authorize('admin', 'super_admin', 'platform_owner'), async (req, res) => {
    try {
        const hospitalId = getHospitalId(req) || 1;
        const result = await pool.query(`
            SELECT el.id, el.code, el.location, el.status, el.triggered_at, el.resolved_at,
                   el.notes, el.resolution_notes, u.username as triggered_by_username
            FROM emergency_logs el
            LEFT JOIN users u ON el.triggered_by = u.id
            WHERE el.hospital_id = $1
            ORDER BY el.triggered_at DESC
            LIMIT 1000
        `, [hospitalId]);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 2. Super-Admin Emergency Analytics
// ==========================================

/**
 * @route   GET /api/super-admin/emergency-analytics
 * @desc    Aggregated analytics on emergency response times & frequency
 */
router.get('/super-admin/emergency-analytics', protect, authorize('admin', 'super_admin', 'platform_owner'), async (req, res) => {
    try {
        const hospitalId = getHospitalId(req) || 1;
        const codeCounts = await pool.query(`
            SELECT code, COUNT(*) as count
            FROM emergency_logs
            WHERE hospital_id = $1
            GROUP BY code
            ORDER BY count DESC
        `, [hospitalId]);

        const statusCounts = await pool.query(`
            SELECT status, COUNT(*) as count
            FROM emergency_logs
            WHERE hospital_id = $1
            GROUP BY status
        `, [hospitalId]);

        res.json({
            success: true,
            analytics: {
                by_code: codeCounts.rows,
                by_status: statusCounts.rows
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 3. Security Compatibility Shims
// ==========================================

/**
 * @route   POST /api/security/compat/firebase-sync
 * @desc    Firebase-free local sync fallback for mobile clients
 */
router.post('/security/compat/firebase-sync', protect, (req, res) => {
    res.json({ success: true, synced: true, timestamp: new Date().toISOString() });
});

/**
 * @route   GET /api/security/compat/staff-activity
 * @desc    Staff activity debug alias
 */
router.get('/security/compat/staff-activity', protect, async (req, res) => {
    try {
        const hospitalId = getHospitalId(req) || 1;
        const result = await pool.query(`
            SELECT id, username, role, is_active, updated_at
            FROM users
            WHERE hospital_id = $1 AND is_active = true
            ORDER BY updated_at DESC NULLS LAST
            LIMIT 50
        `, [hospitalId]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
