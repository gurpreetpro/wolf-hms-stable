/**
 * Overwatch Routes
 * Monitoring dashboard and metrics endpoints
 */
const express = require('express');
const router = express.Router();
const Overwatch = require('../services/OverwatchService');

// Prometheus metrics endpoint (for Grafana/Prometheus scraping)
router.get('/metrics', Overwatch.getMetrics);

// Health dashboard endpoint
router.get('/dashboard', async (req, res) => {
    try {
        const pool = req.app.get('pool');
        const dashboard = await Overwatch.getHealthDashboard(pool);
        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent alerts
router.get('/alerts', (req, res) => {
    res.json({
        alerts: Overwatch.alertQueue.slice(-50),
        count: Overwatch.alertQueue.length,
    });
});

// Test alert endpoint (dev only)
router.post('/test-alert', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not available in production' });
    }

    const { title = 'Test Alert', message = 'This is a test alert' } = req.body;
    await Overwatch.sendAlert(title, message, { source: 'test' });
    res.json({ success: true, message: 'Alert sent' });
});

// Manual error report
router.post('/report-error', (req, res) => {
    const { error, context } = req.body;
    Overwatch.captureError(new Error(error), context);
    res.json({ success: true });
});

// System stats
router.get('/stats', async (req, res) => {
    try {
        const pool = req.app.get('pool');
        
        // Get various stats
        const stats = {
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                unit: 'MB',
            },
            database: {},
            api: {},
        };

        // Database stats
        try {
            const dbStats = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM patients) as patients,
                    (SELECT COUNT(*) FROM staff) as staff,
                    (SELECT COUNT(*) FROM appointments WHERE created_at > NOW() - INTERVAL '24 hours') as appointments_today,
                    (SELECT COUNT(*) FROM lab_orders WHERE created_at > NOW() - INTERVAL '24 hours') as lab_orders_today
            `);
            stats.database = dbStats.rows[0];
        } catch (e) {
            stats.database = { error: e.message };
        }

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
