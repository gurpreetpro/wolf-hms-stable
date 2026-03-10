const MetricsCollector = require('../services/MetricsCollector');

/**
 * Metrics Middleware
 * Tracks request performance for monitoring
 */
const metricsMiddleware = (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        MetricsCollector.recordRequest(
            req.method,
            req.originalUrl || req.url,
            res.statusCode,
            duration
        );
    });

    next();
};

/**
 * Query Logger Middleware (for database)
 * Wraps pool.query to track slow queries
 */
const createQueryLogger = (pool) => {
    const originalQuery = pool.query.bind(pool);

    pool.query = async (...args) => {
        const startTime = Date.now();
        try {
            const result = await originalQuery(...args);
            const duration = Date.now() - startTime;

            // Get SQL from first argument
            const sql = typeof args[0] === 'string' ? args[0] : args[0]?.text || 'unknown';
            const params = args[1] || [];

            MetricsCollector.recordSlowQuery(sql, duration, params);

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            const sql = typeof args[0] === 'string' ? args[0] : args[0]?.text || 'unknown';

            MetricsCollector.recordSlowQuery(sql, duration, []);
            throw error;
        }
    };

    return pool;
};

module.exports = { metricsMiddleware, createQueryLogger };
