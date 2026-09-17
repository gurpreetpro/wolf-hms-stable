const os = require('os');
const promClient = require('prom-client');
const logger = require('./Logger');

// Initialize Prometheus Default Metrics (if not already collected)
if (!promClient.register.getSingleMetric('process_cpu_user_seconds_total')) {
    try {
        promClient.collectDefaultMetrics({ register: promClient.register });
    } catch (e) {
        // Ignore if already registered
    }
}

// Prometheus Metrics: Counter & Histogram
let httpRequestsTotal = promClient.register.getSingleMetric('http_requests_total');
if (!httpRequestsTotal) {
    httpRequestsTotal = new promClient.Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests processed by Wolf HMS',
        labelNames: ['method', 'route', 'status']
    });
}

let httpRequestDurationMs = promClient.register.getSingleMetric('http_request_duration_ms');
if (!httpRequestDurationMs) {
    httpRequestDurationMs = new promClient.Histogram({
        name: 'http_request_duration_ms',
        help: 'HTTP request duration in milliseconds for Wolf HMS',
        labelNames: ['method', 'route', 'status'],
        buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    });
}

let dbSlowQueriesTotal = promClient.register.getSingleMetric('db_slow_queries_total');
if (!dbSlowQueriesTotal) {
    dbSlowQueriesTotal = new promClient.Counter({
        name: 'db_slow_queries_total',
        help: 'Total number of database queries exceeding the slow threshold',
        labelNames: ['query_prefix']
    });
}

/**
 * Normalizes HTTP route paths to prevent unbounded Prometheus label cardinality
 * (e.g. /api/patients/3fa85f64-5717-4562-b3fc-2c963f66afa6 -> /api/patients/:id)
 */
function normalizeRoute(path) {
    if (!path) return '/';
    const clean = path.split('?')[0];
    return clean
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
        .replace(/\/\d+(?=\/|$)/g, '/:id');
}

/**
 * Metrics Collector Service
 * Collects and tracks system performance metrics using prom-client and in-memory analytics.
 */
class MetricsCollector {
    static metrics = {
        requests: {
            total: 0,
            success: 0,
            error: 0,
            byEndpoint: {}
        },
        responseTimes: [],
        slowQueries: [],
        startTime: Date.now()
    };

    static maxResponseTimes = 1000;
    static maxSlowQueries = 100;
    static slowQueryThreshold = 500; // ms

    /**
     * Record a request
     */
    static recordRequest(method, path, statusCode, duration) {
        this.metrics.requests.total++;

        if (statusCode >= 200 && statusCode < 400) {
            this.metrics.requests.success++;
        } else {
            this.metrics.requests.error++;
        }

        const normRoute = normalizeRoute(path);
        const endpoint = `${method} ${path.split('?')[0]}`;
        if (!this.metrics.requests.byEndpoint[endpoint]) {
            this.metrics.requests.byEndpoint[endpoint] = { count: 0, totalTime: 0, errors: 0 };
        }
        this.metrics.requests.byEndpoint[endpoint].count++;
        this.metrics.requests.byEndpoint[endpoint].totalTime += duration;
        if (statusCode >= 400) {
            this.metrics.requests.byEndpoint[endpoint].errors++;
        }

        // Track response times (keep last N)
        this.metrics.responseTimes.push({
            timestamp: Date.now(),
            duration,
            endpoint,
            statusCode
        });
        if (this.metrics.responseTimes.length > this.maxResponseTimes) {
            this.metrics.responseTimes.shift();
        }

        // Record in Prometheus metrics
        try {
            const statusStr = String(statusCode);
            httpRequestsTotal.inc({ method, route: normRoute, status: statusStr });
            httpRequestDurationMs.observe({ method, route: normRoute, status: statusStr }, duration);
        } catch (promErr) {
            // Guard against metric collection failures
        }
    }

    /**
     * Record a slow query
     */
    static recordSlowQuery(sql, duration, params = []) {
        if (duration >= this.slowQueryThreshold) {
            this.metrics.slowQueries.push({
                timestamp: Date.now(),
                sql: sql.substring(0, 500),
                duration,
                params: JSON.stringify(params).substring(0, 200)
            });

            if (this.metrics.slowQueries.length > this.maxSlowQueries) {
                this.metrics.slowQueries.shift();
            }

            try {
                const queryPrefix = sql.trim().split(/\s+/)[0]?.toUpperCase() || 'UNKNOWN';
                dbSlowQueriesTotal.inc({ query_prefix: queryPrefix });
            } catch (promErr) {
                // Guard against metric collection failures
            }

            logger.warn(`Slow query detected: ${duration}ms`, { sql: sql.substring(0, 100) });
        }
    }

    /**
     * Calculate error rate percentage over a sliding time window
     * @param {number} windowMs - Window duration in milliseconds (default: 15 minutes)
     * @returns {number} Error rate percentage (0.0 to 100.0)
     */
    static getErrorRateWindow(windowMs = 15 * 60 * 1000) {
        const cutoff = Date.now() - windowMs;
        const recent = this.metrics.responseTimes.filter(r => r.timestamp >= cutoff);
        if (recent.length === 0) return 0;
        const errors = recent.filter(r => r.statusCode >= 400).length;
        return parseFloat(((errors / recent.length) * 100).toFixed(2));
    }

    /**
     * Get Prometheus metrics text output
     * @returns {Promise<string>}
     */
    static async getMetricsText() {
        return await promClient.register.metrics();
    }

    /**
     * Returns the prom-client register
     */
    static getRegister() {
        return promClient.register;
    }

    /**
     * Returns the Content-Type header required for Prometheus scraping
     */
    static getContentType() {
        return promClient.register.contentType;
    }

    /**
     * Get current system metrics
     */
    static getSystemMetrics() {
        const cpus = os.cpus();
        const loadAvg = os.loadavg();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        return {
            cpu: {
                cores: cpus.length,
                model: cpus[0]?.model || 'Unknown',
                loadAvg: {
                    '1min': loadAvg[0].toFixed(2),
                    '5min': loadAvg[1].toFixed(2),
                    '15min': loadAvg[2].toFixed(2)
                },
                usage: ((loadAvg[0] / cpus.length) * 100).toFixed(1)
            },
            memory: {
                total: Math.round(totalMem / 1024 / 1024),
                used: Math.round(usedMem / 1024 / 1024),
                free: Math.round(freeMem / 1024 / 1024),
                usagePercent: ((usedMem / totalMem) * 100).toFixed(1)
            },
            process: {
                uptime: Math.floor(process.uptime()),
                memoryUsage: {
                    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                    rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
                },
                pid: process.pid
            },
            platform: os.platform(),
            hostname: os.hostname()
        };
    }

    /**
     * Get request statistics
     */
    static getRequestStats() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const fiveMinutesAgo = now - 300000;

        const last1Min = this.metrics.responseTimes.filter(r => r.timestamp > oneMinuteAgo);
        const last5Min = this.metrics.responseTimes.filter(r => r.timestamp > fiveMinutesAgo);

        const avgResponseTime = (times) => {
            if (times.length === 0) return 0;
            return Math.round(times.reduce((a, b) => a + b.duration, 0) / times.length);
        };

        const endpointStats = Object.entries(this.metrics.requests.byEndpoint)
            .map(([endpoint, stats]) => ({
                endpoint,
                count: stats.count,
                avgTime: Math.round(stats.totalTime / stats.count),
                errors: stats.errors,
                errorRate: ((stats.errors / stats.count) * 100).toFixed(1)
            }))
            .sort((a, b) => b.avgTime - a.avgTime)
            .slice(0, 10);

        return {
            total: this.metrics.requests.total,
            success: this.metrics.requests.success,
            error: this.metrics.requests.error,
            successRate: this.metrics.requests.total > 0
                ? ((this.metrics.requests.success / this.metrics.requests.total) * 100).toFixed(1)
                : 100,
            last1Min: {
                count: last1Min.length,
                avgResponseTime: avgResponseTime(last1Min)
            },
            last5Min: {
                count: last5Min.length,
                avgResponseTime: avgResponseTime(last5Min)
            },
            topEndpoints: endpointStats
        };
    }

    /**
     * Get slow queries
     */
    static getSlowQueries(limit = 20) {
        return this.metrics.slowQueries
            .slice(-limit)
            .reverse();
    }

    /**
     * Get all metrics summary
     */
    static getAllMetrics() {
        return {
            system: this.getSystemMetrics(),
            requests: this.getRequestStats(),
            slowQueries: this.getSlowQueries(10),
            collectedSince: new Date(this.metrics.startTime).toISOString()
        };
    }

    /**
     * Reset metrics
     */
    static reset() {
        this.metrics = {
            requests: { total: 0, success: 0, error: 0, byEndpoint: {} },
            responseTimes: [],
            slowQueries: [],
            startTime: Date.now()
        };
        try {
            promClient.register.resetMetrics();
        } catch (e) {
            // Guard
        }
    }
}

module.exports = MetricsCollector;
