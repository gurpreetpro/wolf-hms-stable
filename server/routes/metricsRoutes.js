const express = require('express');
const router = express.Router();
const MetricsCollector = require('../services/MetricsCollector');

/**
 * @route   GET /api/metrics
 * @desc    Get all metrics (JSON)
 * @access  Admin only
 */
router.get('/', async (req, res) => {
    try {
        const metrics = MetricsCollector.getAllMetrics();
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/metrics/dashboard
 * @desc    Visual performance dashboard
 * @access  Admin only
 */
router.get('/dashboard', async (req, res) => {
    try {
        const metrics = MetricsCollector.getAllMetrics();
        const sys = metrics.system;
        const req_stats = metrics.requests;

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="10">
    <title>WOLF HMS - Performance Monitor</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
            min-height: 100vh;
            padding: 30px;
            color: #fff;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 {
            text-align: center;
            margin-bottom: 10px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 2.5rem;
        }
        .subtitle {
            text-align: center;
            opacity: 0.6;
            margin-bottom: 30px;
            font-size: 0.9rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 25px;
            border: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
        }
        .card-title {
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            opacity: 0.6;
            margin-bottom: 15px;
        }
        .big-number {
            font-size: 3rem;
            font-weight: bold;
            background: linear-gradient(90deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .stat-label { opacity: 0.7; }
        .stat-value { font-weight: bold; color: #667eea; }
        .progress-bar {
            height: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        .progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.5s ease;
        }
        .green { background: linear-gradient(90deg, #10b981, #34d399); }
        .yellow { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
        .red { background: linear-gradient(90deg, #ef4444, #f87171); }
        .purple { background: linear-gradient(90deg, #667eea, #764ba2); }
        .endpoint-table {
            width: 100%;
            font-size: 0.85rem;
        }
        .endpoint-table th {
            text-align: left;
            padding: 10px 5px;
            opacity: 0.6;
            font-weight: normal;
            text-transform: uppercase;
            font-size: 0.7rem;
            letter-spacing: 1px;
        }
        .endpoint-table td {
            padding: 8px 5px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .badge {
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 0.7rem;
            font-weight: bold;
        }
        .badge-fast { background: #10b98120; color: #10b981; }
        .badge-medium { background: #f59e0b20; color: #f59e0b; }
        .badge-slow { background: #ef444420; color: #ef4444; }
        .live-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            animation: pulse 2s infinite;
            margin-right: 8px;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .section-title {
            margin: 30px 0 15px;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Performance Monitor</h1>
        <p class="subtitle"><span class="live-dot"></span>Auto-refreshes every 10 seconds | Since: ${new Date(metrics.collectedSince).toLocaleString()}</p>

        <div class="grid">
            <div class="card">
                <div class="card-title">CPU Usage</div>
                <div class="big-number">${sys.cpu.usage}%</div>
                <div class="progress-bar">
                    <div class="progress-fill ${parseFloat(sys.cpu.usage) > 80 ? 'red' : parseFloat(sys.cpu.usage) > 50 ? 'yellow' : 'green'}" 
                         style="width: ${sys.cpu.usage}%"></div>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Cores</span>
                    <span class="stat-value">${sys.cpu.cores}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Load (1m)</span>
                    <span class="stat-value">${sys.cpu.loadAvg['1min']}</span>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Memory</div>
                <div class="big-number">${sys.memory.usagePercent}%</div>
                <div class="progress-bar">
                    <div class="progress-fill ${parseFloat(sys.memory.usagePercent) > 90 ? 'red' : parseFloat(sys.memory.usagePercent) > 75 ? 'yellow' : 'green'}" 
                         style="width: ${sys.memory.usagePercent}%"></div>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Used</span>
                    <span class="stat-value">${sys.memory.used} MB</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Free</span>
                    <span class="stat-value">${sys.memory.free} MB</span>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Request Stats</div>
                <div class="big-number">${req_stats.total}</div>
                <div class="progress-bar">
                    <div class="progress-fill green" style="width: ${req_stats.successRate}%"></div>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Success Rate</span>
                    <span class="stat-value">${req_stats.successRate}%</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Errors</span>
                    <span class="stat-value" style="color: #ef4444;">${req_stats.error}</span>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Response Time</div>
                <div class="big-number">${req_stats.last1Min.avgResponseTime}ms</div>
                <div class="stat-row">
                    <span class="stat-label">Last 1 min requests</span>
                    <span class="stat-value">${req_stats.last1Min.count}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Last 5 min avg</span>
                    <span class="stat-value">${req_stats.last5Min.avgResponseTime}ms</span>
                </div>
            </div>
        </div>

        <div class="grid">
            <div class="card" style="grid-column: span 2;">
                <div class="card-title">🔥 Top Endpoints by Response Time</div>
                <table class="endpoint-table">
                    <thead>
                        <tr>
                            <th>Endpoint</th>
                            <th>Requests</th>
                            <th>Avg Time</th>
                            <th>Errors</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${req_stats.topEndpoints.length > 0 ? req_stats.topEndpoints.map(ep => `
                        <tr>
                            <td>${ep.endpoint}</td>
                            <td>${ep.count}</td>
                            <td>
                                <span class="badge ${ep.avgTime < 100 ? 'badge-fast' : ep.avgTime < 500 ? 'badge-medium' : 'badge-slow'}">
                                    ${ep.avgTime}ms
                                </span>
                            </td>
                            <td>${ep.errors} (${ep.errorRate}%)</td>
                        </tr>
                        `).join('') : '<tr><td colspan="4" style="text-align:center; opacity:0.5;">No data yet</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-title">🐢 Slow Queries (>${MetricsCollector.slowQueryThreshold}ms)</div>
                ${metrics.slowQueries.length > 0 ? metrics.slowQueries.slice(0, 5).map(q => `
                <div class="stat-row">
                    <span class="stat-label" style="font-size:0.75rem; word-break:break-all;">${q.sql.substring(0, 50)}...</span>
                    <span class="stat-value" style="color: #ef4444;">${q.duration}ms</span>
                </div>
                `).join('') : '<div style="opacity:0.5; text-align:center; padding:20px;">No slow queries 🎉</div>'}
            </div>
        </div>

        <div class="card" style="margin-top: 20px;">
            <div class="card-title">System Info</div>
            <div class="grid" style="grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 15px;">
                <div class="stat-row" style="flex-direction: column; border: none;">
                    <span class="stat-label">Uptime</span>
                    <span class="stat-value">${Math.floor(sys.process.uptime / 60)}m ${sys.process.uptime % 60}s</span>
                </div>
                <div class="stat-row" style="flex-direction: column; border: none;">
                    <span class="stat-label">Heap Used</span>
                    <span class="stat-value">${sys.process.memoryUsage.heapUsed} MB</span>
                </div>
                <div class="stat-row" style="flex-direction: column; border: none;">
                    <span class="stat-label">Platform</span>
                    <span class="stat-value">${sys.platform}</span>
                </div>
                <div class="stat-row" style="flex-direction: column; border: none;">
                    <span class="stat-label">Hostname</span>
                    <span class="stat-value">${sys.hostname}</span>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

        res.send(html);
    } catch (error) {
        res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
    }
});

/**
 * @route   GET /api/metrics/slow-queries
 * @desc    Get slow queries
 * @access  Admin only
 */
router.get('/slow-queries', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const queries = MetricsCollector.getSlowQueries(limit);
        res.json(queries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/metrics/reset
 * @desc    Reset all metrics
 * @access  Admin only
 */
router.post('/reset', async (req, res) => {
    try {
        MetricsCollector.reset();
        res.json({ success: true, message: 'Metrics reset' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
