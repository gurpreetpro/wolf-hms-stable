/**
 * setupRoutes.js — Gated Database Setup, Diagnostic & Maintenance Endpoints
 * 
 * Modularized from server-cloud.js as part of Phase 3 hardening.
 * All setup endpoints strictly require valid SETUP_KEY.
 * All debug/inspection endpoints require protect + super_admin/platform_owner authorization.
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getSecrets } = require('../config/secrets');
const { resetAndSeedCloud } = require('../controllers/setupController');
const { fullSchemaSync } = require('../controllers/schemaSyncController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Middleware to gate endpoints by SETUP_KEY
const gateWithSetupKey = (req, res, next) => {
    const configuredKey = getSecrets().SETUP_KEY || process.env.SETUP_KEY;
    if (!configuredKey) {
        return res.status(403).json({ error: 'Setup endpoints disabled: SETUP_KEY not configured in environment.' });
    }
    const providedKey = req.body?.setupKey || req.headers['x-setup-key'];
    if (!providedKey || providedKey !== configuredKey) {
        return res.status(403).json({ error: 'Invalid or missing setup key.' });
    }
    next();
};

// ==========================================
// 1. Setup & Schema Synchronization (Gated by SETUP_KEY)
// ==========================================

router.post('/setup/reset-and-seed', gateWithSetupKey, resetAndSeedCloud);
router.post('/setup/schema-sync', gateWithSetupKey, fullSchemaSync);

// ==========================================
// 2. Debug & Environment Diagnostics (Gated by Auth + Roles)
// ==========================================

router.get('/debug/env', protect, authorize('super_admin', 'platform_owner'), (req, res) => {
    res.json({
        DB_HOST: process.env.DB_HOST,
        DB_USER: process.env.DB_USER,
        DB_NAME: process.env.DB_NAME,
        DB_PORT: process.env.DB_PORT,
        NODE_ENV: process.env.NODE_ENV
    });
});

/**
 * @route   GET /api/debug/sentry-trigger
 * @desc    Test trigger for Sentry error pipeline verification
 * @access  Protected (super_admin only, non-production only)
 */
router.get('/debug/sentry-trigger', protect, authorize('super_admin'), (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Sentry test trigger is disabled in production environment.' });
    }

    const testError = new Error('Wolf HMS Test Sentry Error: Triggered by super_admin via /api/debug/sentry-trigger');

    try {
        const Sentry = require('@sentry/node');
        if (process.env.SENTRY_DSN) {
            Sentry.captureException(testError);
        }
    } catch (e) {
        // Graceful handling
    }

    throw testError;
});

router.get('/debug/fs', protect, authorize('super_admin', 'platform_owner'), (req, res) => {
    try {
        const fs = require('fs');
        const root = fs.existsSync('/cloudsql') ? fs.readdirSync('/cloudsql') : ['/cloudsql not found'];
        let instance = [];
        try {
            if (fs.existsSync('/cloudsql/wolf-tech-hms:asia-south1:wolf-hms-db')) {
                instance = fs.readdirSync('/cloudsql/wolf-tech-hms:asia-south1:wolf-hms-db');
            } else {
                instance = ['Instance dir not found'];
            }
        } catch (e) { 
            instance = [e.message]; 
        }
        
        res.json({ root, instance });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// User audit list (admin-only)
router.get('/debug/users', protect, authorize('admin', 'super_admin', 'platform_owner'), async (req, res) => {
    try {
        const usersResult = await pool.query('SELECT id, username, email, role, is_active FROM users ORDER BY id');
        res.json({ users: usersResult.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bed synchronization maintenance
router.get('/test/sync-beds', protect, authorize('admin', 'super_admin', 'platform_owner'), async (req, res) => {
    try {
        const occupiedBeds = await pool.query(`
            SELECT b.id, b.bed_number, b.status, w.name as ward_name
            FROM beds b
            JOIN wards w ON w.id = b.ward_id
            WHERE b.status = 'Occupied'
        `);
        
        let fixed = 0;
        const details = [];
        
        for (const bed of occupiedBeds.rows) {
            const activeAdmission = await pool.query(`
                SELECT id, status 
                FROM admissions 
                WHERE bed_number = $1 AND LOWER(TRIM(ward)) = LOWER(TRIM($2)) AND status = 'Admitted'
                LIMIT 1
            `, [bed.bed_number, bed.ward_name]);
            
            if (activeAdmission.rows.length === 0) {
                await pool.query(`
                    UPDATE beds 
                    SET status = 'Available'
                    WHERE id = $1
                `, [bed.id]);
                
                fixed++;
                details.push({
                    bed: bed.bed_number,
                    ward: bed.ward_name,
                    action: 'Cleared - no active admission found'
                });
            }
        }
        
        res.json({ 
            success: true, 
            message: `Synced ${fixed} beds - cleared orphaned occupied status`, 
            fixed,
            details 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = { router, gateWithSetupKey };
