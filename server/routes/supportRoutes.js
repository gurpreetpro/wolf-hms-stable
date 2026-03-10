const express = require('express');
const router = express.Router();
const RemoteAccessService = require('../services/RemoteAccessService');

/**
 * @route   GET /api/support/dashboard
 * @desc    Visual support dashboard
 * @access  Admin
 */
router.get('/dashboard', async (req, res) => {
    try {
        const stats = await RemoteAccessService.getTicketStats();
        const tickets = await RemoteAccessService.getTickets({ page: 1, limit: 10 });

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WOLF HMS - Support Portal</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            min-height: 100vh;
            padding: 30px;
            color: #fff;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 {
            text-align: center;
            margin-bottom: 10px;
            font-size: 2.5rem;
        }
        .subtitle {
            text-align: center;
            opacity: 0.7;
            margin-bottom: 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            backdrop-filter: blur(10px);
        }
        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
        }
        .stat-label {
            opacity: 0.7;
            font-size: 0.85rem;
            margin-top: 5px;
        }
        .open .stat-value { color: #fbbf24; }
        .progress .stat-value { color: #3b82f6; }
        .resolved .stat-value { color: #10b981; }
        .critical .stat-value { color: #ef4444; }
        .card {
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 25px;
            margin-bottom: 20px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .card-title {
            font-size: 1.2rem;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .ticket-list { list-style: none; }
        .ticket-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 4px solid #3b82f6;
        }
        .ticket-item.critical { border-left-color: #ef4444; }
        .ticket-item.high { border-left-color: #f59e0b; }
        .ticket-info h4 { margin-bottom: 5px; }
        .ticket-meta { font-size: 0.8rem; opacity: 0.6; }
        .badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge-open { background: #fbbf2420; color: #fbbf24; }
        .badge-in_progress { background: #3b82f620; color: #3b82f6; }
        .badge-resolved { background: #10b98120; color: #10b981; }
        .badge-critical { background: #ef444420; color: #ef4444; }
        .no-tickets {
            text-align: center;
            padding: 40px;
            opacity: 0.5;
        }
        .action-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 20px;
        }
        .btn {
            padding: 12px 25px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .btn-primary {
            background: linear-gradient(90deg, #3b82f6, #2563eb);
            color: white;
        }
        .btn-secondary {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .diagnostics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .diag-item {
            background: rgba(255,255,255,0.03);
            padding: 15px;
            border-radius: 8px;
        }
        .diag-label { font-size: 0.8rem; opacity: 0.6; }
        .diag-value { font-size: 1.2rem; font-weight: bold; color: #3b82f6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎧 Support Portal</h1>
        <p class="subtitle">WOLF HMS Remote Support & Troubleshooting</p>

        <div class="stats-grid">
            <div class="stat-card open">
                <div class="stat-value">${stats?.open_count || 0}</div>
                <div class="stat-label">Open Tickets</div>
            </div>
            <div class="stat-card progress">
                <div class="stat-value">${stats?.in_progress_count || 0}</div>
                <div class="stat-label">In Progress</div>
            </div>
            <div class="stat-card resolved">
                <div class="stat-value">${stats?.resolved_count || 0}</div>
                <div class="stat-label">Resolved</div>
            </div>
            <div class="stat-card critical">
                <div class="stat-value">${stats?.critical_open || 0}</div>
                <div class="stat-label">Critical Open</div>
            </div>
        </div>

        <div class="card">
            <div class="card-title">📋 Recent Tickets</div>
            ${tickets.length > 0 ? `
            <ul class="ticket-list">
                ${tickets.map(t => `
                <li class="ticket-item ${t.priority}">
                    <div class="ticket-info">
                        <h4>${t.ticket_number}: ${t.subject}</h4>
                        <div class="ticket-meta">
                            ${t.category} | Created: ${new Date(t.created_at).toLocaleDateString()}
                            ${t.created_by_name ? `| By: ${t.created_by_name}` : ''}
                        </div>
                    </div>
                    <span class="badge badge-${t.status}">${t.status.replace('_', ' ')}</span>
                </li>
                `).join('')}
            </ul>
            ` : '<div class="no-tickets">✨ No tickets yet - System running smoothly!</div>'}
        </div>

        <div class="card">
            <div class="card-title">🔧 Quick Actions</div>
            <div class="action-buttons">
                <a href="/api/support/diagnostics" class="btn btn-primary">📊 Run Diagnostics</a>
                <a href="/api/health" class="btn btn-secondary">💓 Health Check</a>
                <a href="/api/metrics/dashboard" class="btn btn-secondary">📈 Performance</a>
                <a href="/api/alerts/dashboard" class="btn btn-secondary">🚨 Alerts</a>
            </div>
        </div>

        <div class="card">
            <div class="card-title">🔐 Remote Access</div>
            <p style="opacity: 0.7; margin-bottom: 15px;">
                Grant secure temporary access to support team for troubleshooting.
            </p>
            <div class="diagnostics-grid">
                <div class="diag-item">
                    <div class="diag-label">Access Duration</div>
                    <div class="diag-value">60 min</div>
                </div>
                <div class="diag-item">
                    <div class="diag-label">Encryption</div>
                    <div class="diag-value">AES-256</div>
                </div>
                <div class="diag-item">
                    <div class="diag-label">Session Logging</div>
                    <div class="diag-value">Enabled</div>
                </div>
                <div class="diag-item">
                    <div class="diag-label">2FA Required</div>
                    <div class="diag-value">Yes</div>
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
 * @route   GET /api/support/tickets
 * @desc    Get all tickets
 */
router.get('/tickets', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const userId = req.user?.role === 'Admin' ? null : req.user?.id;

        const tickets = await RemoteAccessService.getTickets({
            userId,
            status,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json(tickets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/support/tickets/:id
 * @desc    Get ticket details
 */
router.get('/tickets/:id', async (req, res) => {
    try {
        const ticket = await RemoteAccessService.getTicketDetails(req.params.id);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/support/tickets
 * @desc    Create new ticket
 */
router.post('/tickets', async (req, res) => {
    try {
        const { category, priority, subject, description, remoteAccessRequested } = req.body;
        const userId = req.user?.id || 1;

        const ticket = await RemoteAccessService.createTicket({
            userId,
            category,
            priority: priority || 'medium',
            subject,
            description,
            remoteAccessRequested
        });

        res.status(201).json(ticket);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/support/tickets/:id/message
 * @desc    Add message to ticket
 */
router.post('/tickets/:id/message', async (req, res) => {
    try {
        const { message, isInternal } = req.body;
        const userId = req.user?.id || 1;

        const msg = await RemoteAccessService.addTicketMessage(
            req.params.id,
            userId,
            message,
            isInternal
        );

        res.json(msg);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   PATCH /api/support/tickets/:id/status
 * @desc    Update ticket status
 */
router.patch('/tickets/:id/status', async (req, res) => {
    try {
        const { status, resolutionNotes } = req.body;
        const ticket = await RemoteAccessService.updateTicketStatus(
            req.params.id,
            status,
            resolutionNotes
        );
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/support/tickets/:id/remote-access
 * @desc    Grant remote access for ticket
 */
router.post('/tickets/:id/remote-access', async (req, res) => {
    try {
        const { duration = 60 } = req.body;
        const result = await RemoteAccessService.grantRemoteAccess(req.params.id, duration);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   DELETE /api/support/tickets/:id/remote-access
 * @desc    Revoke remote access
 */
router.delete('/tickets/:id/remote-access', async (req, res) => {
    try {
        await RemoteAccessService.revokeRemoteAccess(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/support/diagnostics
 * @desc    Get system diagnostics for remote support
 */
router.get('/diagnostics', async (req, res) => {
    try {
        const diagnostics = await RemoteAccessService.getDiagnostics();

        // Check if browser wants HTML
        if (!req.headers.accept?.includes('application/json')) {
            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>WOLF HMS - Diagnostics Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            padding: 30px;
        }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { color: #38bdf8; margin-bottom: 20px; }
        .section {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 1.1rem;
            color: #94a3b8;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .item {
            background: #0f172a;
            padding: 15px;
            border-radius: 8px;
        }
        .label { font-size: 0.8rem; color: #64748b; }
        .value { font-size: 1.2rem; font-weight: bold; color: #38bdf8; }
        .healthy { color: #22c55e; }
        .warning { color: #eab308; }
        .unhealthy { color: #ef4444; }
        pre {
            background: #0f172a;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.85rem;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #38bdf8;
            color: #0f172a;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 System Diagnostics Report</h1>
        <p style="color: #64748b; margin-bottom: 30px;">Generated: ${diagnostics.timestamp}</p>

        <div class="section">
            <div class="section-title">System Health</div>
            <div class="grid">
                <div class="item">
                    <div class="label">Overall Status</div>
                    <div class="value ${diagnostics.health.status}">${diagnostics.health.status.toUpperCase()}</div>
                </div>
                <div class="item">
                    <div class="label">Database</div>
                    <div class="value ${diagnostics.health.checks.database.status}">${diagnostics.health.checks.database.latency}ms</div>
                </div>
                <div class="item">
                    <div class="label">Memory</div>
                    <div class="value ${diagnostics.health.checks.memory.status}">${diagnostics.health.checks.memory.details.usedPercent}%</div>
                </div>
                <div class="item">
                    <div class="label">CPU Load</div>
                    <div class="value ${diagnostics.health.checks.cpu.status}">${diagnostics.health.checks.cpu.details.normalizedLoad}%</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Request Statistics</div>
            <div class="grid">
                <div class="item">
                    <div class="label">Total Requests</div>
                    <div class="value">${diagnostics.metrics.requests.total}</div>
                </div>
                <div class="item">
                    <div class="label">Success Rate</div>
                    <div class="value">${diagnostics.metrics.requests.successRate}%</div>
                </div>
                <div class="item">
                    <div class="label">Avg Response (1min)</div>
                    <div class="value">${diagnostics.metrics.requests.last1Min.avgResponseTime}ms</div>
                </div>
                <div class="item">
                    <div class="label">Errors</div>
                    <div class="value" style="color: #ef4444;">${diagnostics.metrics.requests.error}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Environment</div>
            <div class="grid">
                <div class="item">
                    <div class="label">Node.js</div>
                    <div class="value">${diagnostics.environment.nodeVersion}</div>
                </div>
                <div class="item">
                    <div class="label">Platform</div>
                    <div class="value">${diagnostics.environment.platform}</div>
                </div>
                <div class="item">
                    <div class="label">Uptime</div>
                    <div class="value">${Math.floor(diagnostics.environment.uptime / 60)}m</div>
                </div>
                <div class="item">
                    <div class="label">PID</div>
                    <div class="value">${diagnostics.environment.pid}</div>
                </div>
            </div>
        </div>

        <a href="/api/support/dashboard" class="btn">← Back to Support Portal</a>
    </div>
</body>
</html>`;
            return res.send(html);
        }

        res.json(diagnostics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/support/stats
 * @desc    Get ticket statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await RemoteAccessService.getTicketStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
