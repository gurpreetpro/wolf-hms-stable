const express = require('express');
const router = express.Router();
const SelfHealingService = require('../services/SelfHealingService');
const PredictiveAnalytics = require('../services/PredictiveAnalytics');

/**
 * @route   GET /api/selfheal/dashboard
 * @desc    Visual self-healing dashboard
 * @access  Admin only
 */
router.get('/dashboard', async (req, res) => {
    try {
        const status = SelfHealingService.getStatus();
        const history = SelfHealingService.getHistory(10);
        const predictions = PredictiveAnalytics.getPredictions();
        const recommendations = PredictiveAnalytics.getRecommendations();

        const riskColors = {
            low: '#10b981',
            medium: '#f59e0b',
            high: '#ef4444',
            critical: '#dc2626'
        };

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="30">
    <title>WOLF HMS - Self-Healing Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%);
            min-height: 100vh;
            padding: 30px;
            color: #fff;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 {
            text-align: center;
            margin-bottom: 10px;
            background: linear-gradient(90deg, #10b981, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 2.5rem;
        }
        .subtitle {
            text-align: center;
            opacity: 0.6;
            margin-bottom: 30px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 25px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .card-title {
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            opacity: 0.6;
            margin-bottom: 15px;
        }
        .status-indicator {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.5rem;
            font-weight: bold;
        }
        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        .status-dot.active { background: #10b981; }
        .status-dot.inactive { background: #6b7280; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .risk-meter {
            text-align: center;
            padding: 30px;
        }
        .risk-score {
            font-size: 4rem;
            font-weight: bold;
            color: ${riskColors[predictions.overallRisk.level]};
        }
        .risk-label {
            font-size: 1.2rem;
            text-transform: uppercase;
            color: ${riskColors[predictions.overallRisk.level]};
        }
        .threshold-list {
            list-style: none;
        }
        .threshold-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .threshold-label { opacity: 0.7; }
        .threshold-value { color: #3b82f6; font-weight: bold; }
        .history-item {
            padding: 12px;
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
            margin-bottom: 8px;
            border-left: 3px solid;
        }
        .history-item.success { border-color: #10b981; }
        .history-item.failure { border-color: #ef4444; }
        .history-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .history-type { font-weight: bold; }
        .history-time { opacity: 0.5; font-size: 0.8rem; }
        .history-result { font-size: 0.85rem; opacity: 0.7; }
        .prediction-card {
            padding: 15px;
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 4px solid;
        }
        .prediction-card.critical { border-color: #ef4444; background: rgba(239,68,68,0.1); }
        .prediction-card.high { border-color: #f59e0b; background: rgba(245,158,11,0.1); }
        .prediction-card.medium { border-color: #3b82f6; background: rgba(59,130,246,0.1); }
        .recommendation {
            padding: 12px;
            background: rgba(16,185,129,0.1);
            border-radius: 8px;
            margin-bottom: 8px;
            display: flex;
            gap: 10px;
            align-items: flex-start;
        }
        .recommendation-priority {
            background: #10b981;
            color: #000;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
        }
        .btn {
            padding: 12px 25px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            margin-right: 10px;
            margin-top: 10px;
        }
        .btn-primary {
            background: linear-gradient(90deg, #10b981, #059669);
            color: white;
        }
        .btn-danger {
            background: #ef4444;
            color: white;
        }
        .btn-secondary {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .no-data {
            text-align: center;
            padding: 30px;
            opacity: 0.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 Self-Healing System</h1>
        <p class="subtitle">Automatic issue detection and resolution • Auto-refreshes every 30s</p>

        <div class="grid">
            <!-- Status Card -->
            <div class="card">
                <div class="card-title">System Status</div>
                <div class="status-indicator">
                    <span class="status-dot ${status.isRunning ? 'active' : 'inactive'}"></span>
                    ${status.isRunning ? 'Active & Monitoring' : 'Inactive'}
                </div>
                <div style="margin-top: 20px; font-size: 0.9rem; opacity: 0.7;">
                    <div>Last check: ${status.lastCheck ? new Date(status.lastCheck).toLocaleTimeString() : 'Never'}</div>
                    <div>Heals (1hr): ${status.recentHeals}</div>
                    <div>History: ${status.historyCount} records</div>
                </div>
                <div style="margin-top: 20px;">
                    ${status.isRunning
                ? '<button class="btn btn-danger" onclick="fetch(\'/api/selfheal/stop\', {method:\'POST\'}).then(()=>location.reload())">⏹ Stop</button>'
                : '<button class="btn btn-primary" onclick="fetch(\'/api/selfheal/start\', {method:\'POST\'}).then(()=>location.reload())">▶ Start</button>'
            }
                    <button class="btn btn-secondary" onclick="fetch('/api/selfheal/check', {method:'POST'}).then(()=>location.reload())">🔍 Check Now</button>
                </div>
            </div>

            <!-- Risk Meter -->
            <div class="card">
                <div class="card-title">AI Risk Assessment</div>
                <div class="risk-meter">
                    <div class="risk-score">${predictions.overallRisk.score}</div>
                    <div class="risk-label">${predictions.overallRisk.level} Risk</div>
                </div>
            </div>

            <!-- Thresholds -->
            <div class="card">
                <div class="card-title">Auto-Heal Thresholds</div>
                <ul class="threshold-list">
                    <li class="threshold-item">
                        <span class="threshold-label">Memory Usage</span>
                        <span class="threshold-value">${status.thresholds.memoryUsagePercent}%</span>
                    </li>
                    <li class="threshold-item">
                        <span class="threshold-label">CPU Load</span>
                        <span class="threshold-value">${status.thresholds.cpuLoadPercent}%</span>
                    </li>
                    <li class="threshold-item">
                        <span class="threshold-label">Response Time</span>
                        <span class="threshold-value">${status.thresholds.responseTimeMs}ms</span>
                    </li>
                    <li class="threshold-item">
                        <span class="threshold-label">Error Rate</span>
                        <span class="threshold-value">${status.thresholds.errorRatePercent}%</span>
                    </li>
                </ul>
            </div>
        </div>

        <div class="grid">
            <!-- Predictions -->
            <div class="card">
                <div class="card-title">🔮 AI Predictions</div>
                ${predictions.predictions.length > 0 ? predictions.predictions.map(p => `
                <div class="prediction-card ${p.severity}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${p.type.replace('_', ' ').toUpperCase()}</strong>
                        <span style="opacity:0.6;">${(p.confidence * 100).toFixed(0)}% confident</span>
                    </div>
                    <div style="margin-top:8px; font-size:0.9rem; opacity:0.8;">${p.message}</div>
                    ${p.estimatedTime ? `<div style="margin-top:5px; font-size:0.8rem; color:#f59e0b;">⏱ ${p.estimatedTime}</div>` : ''}
                </div>
                `).join('') : '<div class="no-data">✨ No issues predicted</div>'}
            </div>

            <!-- Recommendations -->
            <div class="card">
                <div class="card-title">💡 Recommendations</div>
                ${recommendations.length > 0 ? recommendations.map((r, i) => `
                <div class="recommendation">
                    <span class="recommendation-priority">#${i + 1}</span>
                    <div>
                        <div style="font-weight:bold;">${r.type.replace('_', ' ')}</div>
                        <div style="font-size:0.85rem; opacity:0.8;">${r.action}</div>
                    </div>
                </div>
                `).join('') : '<div class="no-data">All systems optimal</div>'}
            </div>
        </div>

        <!-- Healing History -->
        <div class="card">
            <div class="card-title">📜 Recent Healing Actions</div>
            ${history.length > 0 ? history.map(h => `
            <div class="history-item ${h.success ? 'success' : 'failure'}">
                <div class="history-header">
                    <span class="history-type">${h.issue.toUpperCase()}</span>
                    <span class="history-time">${new Date(h.timestamp).toLocaleString()}</span>
                </div>
                <div class="history-result">
                    ${h.success ? '✅' : '❌'} ${h.result || h.message}
                </div>
            </div>
            `).join('') : '<div class="no-data">No healing actions yet</div>'}
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
 * @route   POST /api/selfheal/start
 * @desc    Start self-healing service
 */
router.post('/start', async (req, res) => {
    try {
        const { interval = 60000 } = req.body;
        SelfHealingService.start(interval);
        res.json({ success: true, message: 'Self-healing started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/selfheal/stop
 * @desc    Stop self-healing service
 */
router.post('/stop', async (req, res) => {
    try {
        SelfHealingService.stop();
        res.json({ success: true, message: 'Self-healing stopped' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/selfheal/check
 * @desc    Run manual health check
 */
router.post('/check', async (req, res) => {
    try {
        const issues = await SelfHealingService.runHealthCheck();
        await PredictiveAnalytics.analyze();
        res.json({ success: true, issues });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/selfheal/status
 * @desc    Get self-healing status
 */
router.get('/status', async (req, res) => {
    try {
        const status = SelfHealingService.getStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/selfheal/history
 * @desc    Get healing history
 */
router.get('/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = SelfHealingService.getHistory(limit);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/selfheal/predictions
 * @desc    Get AI predictions
 */
router.get('/predictions', async (req, res) => {
    try {
        await PredictiveAnalytics.analyze();
        const predictions = PredictiveAnalytics.getPredictions();
        res.json(predictions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   PATCH /api/selfheal/thresholds
 * @desc    Update thresholds
 */
router.patch('/thresholds', async (req, res) => {
    try {
        SelfHealingService.updateThresholds(req.body);
        res.json({ success: true, thresholds: SelfHealingService.thresholds });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
