const express = require('express');
const router = express.Router();
const HealthCheckService = require('../services/HealthCheckService');

/**
 * @route   GET /api/health
 * @desc    Visual HTML health dashboard
 * @access  Public
 */
router.get('/', async (req, res) => {
    // Check if client wants JSON
    if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
        try {
            const health = await HealthCheckService.getHealthStatus();
            const httpStatus = health.status === 'healthy' ? 200 :
                health.status === 'degraded' ? 200 : 503;
            return res.status(httpStatus).json(health);
        } catch (error) {
            return res.status(503).json({ status: 'unhealthy', error: error.message });
        }
    }

    // Return visual HTML dashboard
    try {
        const health = await HealthCheckService.getHealthStatus();

        const statusColors = {
            healthy: '#10b981',
            degraded: '#f59e0b',
            unhealthy: '#ef4444',
            warning: '#f59e0b'
        };

        const statusIcons = {
            healthy: '✅',
            degraded: '⚠️',
            unhealthy: '❌',
            warning: '⚠️'
        };

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WOLF HMS - System Health</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #0a1628 0%, #1a3a4a 100%);
            min-height: 100vh;
            padding: 40px 20px;
            color: #fff;
        }
        .container { max-width: 900px; margin: 0 auto; }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            background: linear-gradient(90deg, #00bcd4, #00897b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .header .subtitle { opacity: 0.7; font-size: 1.1rem; }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 15px 30px;
            border-radius: 50px;
            font-size: 1.5rem;
            font-weight: bold;
            background: ${statusColors[health.status]}20;
            border: 2px solid ${statusColors[health.status]};
            color: ${statusColors[health.status]};
            margin: 20px 0;
        }
        .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .card {
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 25px;
            border: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .card-title {
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.7;
        }
        .card-status {
            font-size: 1.5rem;
        }
        .card-value {
            font-size: 1.8rem;
            font-weight: bold;
            color: #00bcd4;
        }
        .card-detail {
            font-size: 0.85rem;
            opacity: 0.6;
            margin-top: 10px;
        }
        .meta {
            margin-top: 40px;
            padding: 20px;
            background: rgba(255,255,255,0.03);
            border-radius: 12px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            font-size: 0.9rem;
        }
        .meta-item { opacity: 0.7; }
        .meta-value { color: #00bcd4; font-weight: bold; }
        .refresh-btn {
            display: block;
            margin: 30px auto 0;
            padding: 12px 30px;
            background: linear-gradient(90deg, #00897b, #00bcd4);
            border: none;
            border-radius: 30px;
            color: white;
            font-size: 1rem;
            cursor: pointer;
            font-weight: bold;
        }
        .refresh-btn:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🐺 WOLF HMS System Health</h1>
            <p class="subtitle">Real-time system monitoring dashboard</p>
            <div class="status-badge">
                ${statusIcons[health.status]} System ${health.status.toUpperCase()}
            </div>
        </div>

        <div class="cards">
            <div class="card">
                <div class="card-header">
                    <span class="card-title">Database</span>
                    <span class="card-status">${statusIcons[health.checks.database.status]}</span>
                </div>
                <div class="card-value">${health.checks.database.latency || 0}ms</div>
                <div class="card-detail">${health.checks.database.message}</div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span class="card-title">Memory</span>
                    <span class="card-status">${statusIcons[health.checks.memory.status]}</span>
                </div>
                <div class="card-value">${health.checks.memory.details.usedPercent}%</div>
                <div class="card-detail">${health.checks.memory.details.systemFree} free</div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span class="card-title">CPU</span>
                    <span class="card-status">${statusIcons[health.checks.cpu.status]}</span>
                </div>
                <div class="card-value">${health.checks.cpu.details.normalizedLoad}%</div>
                <div class="card-detail">${health.checks.cpu.details.cores} cores</div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span class="card-title">Response</span>
                    <span class="card-status">⚡</span>
                </div>
                <div class="card-value">${health.responseTime}ms</div>
                <div class="card-detail">Health check time</div>
            </div>
        </div>

        <div class="meta">
            <div class="meta-item">Uptime: <span class="meta-value">${Math.floor(health.uptime / 60)}m ${Math.floor(health.uptime % 60)}s</span></div>
            <div class="meta-item">Version: <span class="meta-value">${health.version}</span></div>
            <div class="meta-item">Platform: <span class="meta-value">${health.checks.disk.details.platform}</span></div>
            <div class="meta-item">Arch: <span class="meta-value">${health.checks.disk.details.architecture}</span></div>
        </div>

        <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Status</button>
    </div>
</body>
</html>`;

        res.send(html);
    } catch (error) {
        res.status(503).send(`<h1>Health Check Error</h1><p>${error.message}</p>`);
    }
});

/**
 * @route   GET /api/health/live
 * @desc    Quick liveness check (for load balancers)
 * @access  Public
 */
router.get('/live', async (req, res) => {
    try {
        const result = await HealthCheckService.quickCheck();
        res.status(result.status === 'ok' ? 200 : 503).json(result);
    } catch (error) {
        res.status(503).json({ status: 'error', error: error.message });
    }
});

/**
 * @route   GET /api/health/ready
 * @desc    Readiness check (for Kubernetes)
 * @access  Public
 */
router.get('/ready', async (req, res) => {
    try {
        const health = await HealthCheckService.getHealthStatus();
        const isReady = health.checks.database.status !== 'unhealthy';

        res.status(isReady ? 200 : 503).json({
            ready: isReady,
            timestamp: new Date().toISOString(),
            database: health.checks.database.status
        });
    } catch (error) {
        res.status(503).json({ ready: false, error: error.message });
    }
});

/**
 * @route   GET /api/health/debug-db
 * @desc    Debug database connection and permissions
 * @access  Public
 */
router.get('/debug-db', async (req, res) => {
    try {
        const { pool } = require('../db');
        
        // Get current user
        const userResult = await pool.query('SELECT current_user, current_database()');
        
        // List tables
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        // Check for users table specifically
        const usersCheck = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'users'
        `);

        // Check for app builds table
        const buildsCheck = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'hospital_app_builds'
        `);
        
        // Try direct users query - exactly like setup-developer
        let userQueryResult = null;
        let userQueryError = null;
        try {
            const usersQuery = await pool.query('SELECT id FROM users WHERE username = $1', ['developer']);
            userQueryResult = usersQuery.rows.length;
        } catch (err) {
            userQueryError = err.message;
        }
        
        res.json({
            success: true,
            user: userResult.rows[0],
            hasUsersTable: usersCheck.rows.length > 0,
            hasBuildsTable: buildsCheck.rows.length > 0,
            directUsersQuery: userQueryResult,
            directUsersQuery: userQueryResult,
            queryError: userQueryError,
            tableCount: tablesResult.rows.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

