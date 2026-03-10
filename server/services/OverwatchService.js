/**
 * AI Overwatch Monitoring Service
 * Centralized monitoring, error tracking, and alerting for WOLF HMS
 */
const Sentry = require('@sentry/node');
const client = require('prom-client');

// ============================================
// SENTRY ERROR TRACKING
// ============================================

const initSentry = (app) => {
    if (!process.env.SENTRY_DSN) {
        console.log('[Overwatch] Sentry DSN not configured, skipping');
        return;
    }

    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 0.1, // 10% of transactions
        sendDefaultPii: true,
    });

    // Setup Express error handler
    if (typeof Sentry.setupExpressErrorHandler === 'function') {
        Sentry.setupExpressErrorHandler(app);
    } else if (Sentry.Handlers && typeof Sentry.Handlers.errorHandler === 'function') {
        app.use(Sentry.Handlers.errorHandler());
    }

    console.log('[Overwatch] ✅ Sentry error tracking initialized');
};

// Capture error manually
const captureError = (error, context = {}) => {
    console.error('[Overwatch Error]:', error.message);
    
    if (process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
            extra: context,
        });
    }

    // Also trigger alert for critical errors
    if (context.severity === 'critical') {
        sendAlert('CRITICAL ERROR', error.message, context);
    }
};

// ============================================
// PROMETHEUS METRICS
// ============================================

// Create a Registry
const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});
register.registerMetric(httpRequestDuration);

const httpRequestTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestTotal);

const activeUsers = new client.Gauge({
    name: 'active_users',
    help: 'Number of currently active users',
});
register.registerMetric(activeUsers);

const errorTotal = new client.Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'severity'],
});
register.registerMetric(errorTotal);

const dbQueryDuration = new client.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries',
    labelNames: ['query_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
register.registerMetric(dbQueryDuration);

// Metrics middleware
const metricsMiddleware = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path || 'unknown';
        const labels = {
            method: req.method,
            route: route,
            status_code: res.statusCode,
        };
        
        httpRequestDuration.observe(labels, duration);
        httpRequestTotal.inc(labels);
    });
    
    next();
};

// Metrics endpoint handler
const getMetrics = async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).end(error.message);
    }
};

// ============================================
// ALERT SYSTEM
// ============================================

const alertQueue = [];
let telegramBot = null;

const initTelegramBot = () => {
    console.log('[Overwatch] Telegram bot disabled (Dep removed for Audit)');
    telegramBot = null;
};

const sendAlert = async (title, message, context = {}) => {
    const alert = {
        timestamp: new Date().toISOString(),
        title,
        message,
        context,
    };
    
    alertQueue.push(alert);
    console.log(`[ALERT] ${title}: ${message}`);

    // Send to Telegram
    if (telegramBot && process.env.TELEGRAM_CHAT_ID) {
        const text = `🚨 *${title}*\n\n${message}\n\n_${alert.timestamp}_`;
        try {
            await telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, text, {
                parse_mode: 'Markdown',
            });
        } catch (error) {
            console.error('[Overwatch] Telegram send failed:', error.message);
        }
    }
};

// ============================================
// HEALTH DASHBOARD DATA
// ============================================

const getHealthDashboard = async (pool) => {
    const health = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        metrics: {},
        recentAlerts: alertQueue.slice(-10),
    };

    // Database check
    try {
        const startDb = Date.now();
        await pool.query('SELECT 1');
        health.database = {
            status: 'connected',
            responseTime: Date.now() - startDb,
        };
    } catch (error) {
        health.database = { status: 'error', error: error.message };
        health.status = 'degraded';
    }

    // Get metric values
    try {
        const metrics = await register.getMetricsAsJSON();
        health.metrics = metrics.reduce((acc, m) => {
            acc[m.name] = m.values;
            return acc;
        }, {});
    } catch (error) {
        health.metrics = { error: error.message };
    }

    return health;
};

// ============================================
// AI ANALYSIS (using existing Gemini)
// ============================================

const analyzeErrors = async (errors = []) => {
    // This would integrate with your existing Gemini AI service
    // For now, return basic analysis
    return {
        errorCount: errors.length,
        patterns: [],
        recommendations: [],
        analyzedAt: new Date().toISOString(),
    };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Sentry
    initSentry,
    captureError,
    Sentry,
    
    // Metrics
    register,
    metricsMiddleware,
    getMetrics,
    httpRequestDuration,
    httpRequestTotal,
    activeUsers,
    errorTotal,
    dbQueryDuration,
    
    // Alerts
    initTelegramBot,
    sendAlert,
    alertQueue,
    
    // Dashboard
    getHealthDashboard,
    
    // AI
    analyzeErrors,
};
