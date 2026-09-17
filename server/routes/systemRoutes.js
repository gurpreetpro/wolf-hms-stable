/**
 * systemRoutes.js — System Health, Branding, Telemetry & Real-Time Notification Routes
 * 
 * Modularized from server-cloud.js as part of Phase 3 hardening.
 */

const express = require('express');
const router = express.Router();
const HealthCheckService = require('../services/HealthCheckService');
const MetricsCollector = require('../services/MetricsCollector');
const { protect, authorize } = require('../middleware/authMiddleware');
const pool = require('../config/db');

// ==========================================
// 1. Health & Readiness Endpoints
// ==========================================

/**
 * @route   GET /api/health
 * @desc    Standard API health check
 */
router.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * @route   GET /api/health/live
 * @desc    Quick liveness check for orchestrators / load balancers
 */
router.get('/health/live', async (req, res) => {
    try {
        const result = await HealthCheckService.quickCheck();
        res.status(result.status === 'ok' ? 200 : 503).json(result);
    } catch (error) {
        res.status(503).json({ status: 'error', error: error.message });
    }
});

/**
 * @route   GET /api/health/ready
 * @desc    Readiness check for container lifecycle management
 */
router.get('/health/ready', async (req, res) => {
    try {
        const health = await HealthCheckService.getHealthStatus();
        const isReady = health.checks?.database?.status !== 'unhealthy';
        res.status(isReady ? 200 : 503).json({
            ready: isReady,
            timestamp: new Date().toISOString(),
            database: health.checks?.database?.status || 'unknown'
        });
    } catch (error) {
        res.status(503).json({ ready: false, error: error.message });
    }
});

/**
 * @route   GET /api/metrics
 * @desc    Prometheus metrics scrape endpoint
 * @access  Protected (super_admin, platform_owner, admin)
 */
router.get('/metrics', protect, authorize('super_admin', 'platform_owner', 'admin'), async (req, res) => {
    try {
        res.setHeader('Content-Type', MetricsCollector.getContentType() || 'text/plain; version=0.0.4');
        const metrics = await MetricsCollector.getMetricsText();
        res.send(metrics);
    } catch (err) {
        console.error('[Metrics] Failed to scrape metrics:', err);
        res.status(500).send('# Error collecting metrics');
    }
});

/**
 * @route   GET /api/health/obs
 * @desc    Aggregate observability health and runtime telemetry contract
 * @access  Protected (super_admin, platform_owner, admin)
 */
router.get('/health/obs', protect, authorize('super_admin', 'platform_owner', 'admin'), async (req, res) => {
    try {
        let dbPoolStats = { totalCount: 0, idleCount: 0, waitingCount: 0 };
        try {
            const { primaryPool } = require('../config/dbPools');
            if (primaryPool) {
                dbPoolStats = {
                    totalCount: primaryPool.totalCount || 0,
                    idleCount: primaryPool.idleCount || 0,
                    waitingCount: primaryPool.waitingCount || 0
                };
            }
        } catch (e) {
            // Guard
        }

        const activeSockets = req.io?.engine?.clientsCount ?? (req.io?.sockets?.sockets?.size || 0);

        res.json({
            status: 'OK',
            uptimeSeconds: Math.floor(process.uptime()),
            requests: {
                total: MetricsCollector.metrics.requests.total,
                success: MetricsCollector.metrics.requests.success,
                error: MetricsCollector.metrics.requests.error
            },
            errorRateWindow: MetricsCollector.getErrorRateWindow(15 * 60 * 1000),
            activeSockets,
            dbPool: dbPoolStats
        });
    } catch (error) {
        res.status(500).json({ status: 'error', error: error.message });
    }
});

/**
 * @route   GET /api/db-check
 * @desc    Database diagnostic endpoint
 */
router.get('/db-check', async (req, res) => {
    try {
        const timeResult = await pool.query('SELECT NOW() as time');
        const userCountResult = await pool.query('SELECT COUNT(*) as count FROM users');
        const usersResult = await pool.query('SELECT username, role, is_active FROM users LIMIT 3');
        
        res.json({
            status: 'OK',
            database: 'Connected',
            dbTime: timeResult.rows[0].time,
            userCount: userCountResult.rows[0].count,
            sampleUsers: usersResult.rows,
            envCheck: {
                DB_HOST: process.env.DB_HOST ? 'SET' : 'NOT SET',
                DB_USER: process.env.DB_USER ? 'SET' : 'NOT SET',
                DB_NAME: process.env.DB_NAME ? 'SET' : 'NOT SET',
                DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'NOT SET',
                JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            database: 'Failed',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/debug/ping
 * @desc    Deployment verification ping
 */
router.get('/debug/ping', (req, res) => {
    res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

// ==========================================
// 2. Hospital Profile & Branding
// ==========================================

/**
 * @route   GET /api/hospitals/branding/:code
 * @desc    Public branding endpoint for mobile apps & portals
 */
router.get('/hospitals/branding/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const result = await pool.query(`
            SELECT 
                id, code, name, subdomain, logo_url, 
                primary_color, secondary_color, settings
            FROM hospitals 
            WHERE (subdomain = $1 OR custom_domain = $1 OR code = $1) AND is_active = true
        `, [code]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    id: 1,
                    name: 'Wolf HMS',
                    subdomain: 'app',
                    logo_url: null,
                    primary_color: '#0d6efd',
                    secondary_color: '#6c757d',
                    settings: { in_person_fee: 200, video_call_fee: 300 }
                }
            });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[Hospital Branding] Error:', error.message);
        res.json({
            success: true,
            data: {
                id: 1,
                name: 'Wolf HMS',
                subdomain: 'app',
                logo_url: null,
                primary_color: '#0d6efd',
                secondary_color: '#6c757d',
                settings: { in_person_fee: 200, video_call_fee: 300 }
            }
        });
    }
});

// ==========================================
// 3. Jitsi Teleconsultation Notifications
// ==========================================

/**
 * @route   POST /api/notifications/video-call
 * @desc    Send Jitsi teleconsultation call notification to patient via Socket.IO
 */
router.post('/notifications/video-call', (req, res) => {
    try {
        const { patientId, patientPhone, appointmentId, jitsiRoom, jitsiUrl, doctorName } = req.body;

        if (!jitsiRoom || !jitsiUrl) {
            return res.status(400).json({ success: false, error: 'Missing Jitsi room information' });
        }

        const io = req.app.get('io') || req.io;
        if (io) {
            const videoNamespace = io.of('/video');
            videoNamespace.emit('jitsi-call', {
                patientPhone,
                patientId,
                jitsiRoom,
                jitsiUrl,
                doctorName,
                appointmentId,
                timestamp: new Date().toISOString()
            });
        }

        res.json({ 
            success: true, 
            message: 'Notification sent',
            jitsiUrl
        });
    } catch (error) {
        console.error('[Jitsi Notify] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to send notification' });
    }
});

// ==========================================
// 4. Geofence & Location Telemetry Helpers
// ==========================================

/**
 * @route   GET /api/location/resolve-tenant
 * @desc    Tenant resolution fallback helper for edge devices
 */
router.get('/location/resolve-tenant', (req, res) => {
    const hospitalId = req.hospital_id || req.headers['x-hospital-id'] || 1;
    res.json({ success: true, hospital_id: parseInt(hospitalId, 10) });
});

/**
 * @route   GET /api/geofence/check-battery
 * @desc    Battery status health query for deployed guard fleet
 */
router.get('/geofence/check-battery', async (req, res) => {
    try {
        const hospitalId = req.hospital_id || 1;
        const result = await pool.query(`
            SELECT DISTINCT ON (user_id) 
                user_id, battery_level, timestamp
            FROM guard_locations
            WHERE hospital_id = $1
            ORDER BY user_id, timestamp DESC
            LIMIT 50
        `, [hospitalId]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   GET /api/geofence/nearby
 * @desc    Find active geofences near coordinates
 */
router.get('/geofence/nearby', async (req, res) => {
    try {
        const hospitalId = req.hospital_id || 1;
        const result = await pool.query(
            'SELECT * FROM security_geofences WHERE hospital_id = $1 AND is_active = true',
            [hospitalId]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 5. Interactive OpenAPI Documentation (Redoc)
// ==========================================

const fs = require('fs');
const path = require('path');

/**
 * @route   GET /api/docs/openapi.yaml
 * @desc    Serve OpenAPI 3.1 specification YAML
 */
router.get('/docs/openapi.yaml', protect, authorize('admin', 'super_admin', 'platform_owner'), (req, res) => {
    const yamlPath = path.resolve(__dirname, '../../docs/openapi.yaml');
    if (fs.existsSync(yamlPath)) {
        res.setHeader('Content-Type', 'text/yaml');
        res.sendFile(yamlPath);
    } else {
        res.status(404).json({ error: 'OpenAPI specification not found' });
    }
});

/**
 * @route   GET /api/docs
 * @desc    Serve Redoc standalone interactive UI
 */
router.get('/docs', protect, authorize('admin', 'super_admin', 'platform_owner'), (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>Wolf HMS API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>body { margin: 0; padding: 0; }</style>
  </head>
  <body>
    <redoc spec-url="/api/docs/openapi.yaml"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>`);
});

module.exports = router;

