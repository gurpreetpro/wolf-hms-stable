const os = require('os');
const logger = require('./Logger');

/**
 * Metrics Collector Service
 * Collects and tracks system performance metrics
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

        // Track by endpoint
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
            endpoint
        });
        if (this.metrics.responseTimes.length > this.maxResponseTimes) {
            this.metrics.responseTimes.shift();
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

            logger.warn(`Slow query detected: ${duration}ms`, { sql: sql.substring(0, 100) });
        }
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

        // Top 10 slowest endpoints
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
    }
}

module.exports = MetricsCollector;
