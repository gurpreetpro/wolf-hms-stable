const { pool } = require('../db');
const os = require('os');

/**
 * Health Check Service
 * Provides system health monitoring and diagnostics
 */
class HealthCheckService {

    /**
     * Get comprehensive system health status
     */
    static async getHealthStatus() {
        const startTime = Date.now();

        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            checks: {}
        };

        // Database Check
        health.checks.database = await this.checkDatabase();

        // Memory Check
        health.checks.memory = this.checkMemory();

        // CPU Check
        health.checks.cpu = this.checkCPU();

        // Disk Check (basic)
        health.checks.disk = this.checkDisk();

        // Calculate overall status
        const failedChecks = Object.values(health.checks).filter(c => c.status === 'unhealthy');
        const warningChecks = Object.values(health.checks).filter(c => c.status === 'warning');

        if (failedChecks.length > 0) {
            health.status = 'unhealthy';
        } else if (warningChecks.length > 0) {
            health.status = 'degraded';
        }

        health.responseTime = Date.now() - startTime;

        return health;
    }

    /**
     * Check database connectivity
     */
    static async checkDatabase() {
        try {
            const start = Date.now();
            const result = await pool.query('SELECT 1 as check, NOW() as time');
            const latency = Date.now() - start;

            return {
                status: latency < 1000 ? 'healthy' : 'warning',
                latency: latency,
                message: `Connected (${latency}ms)`,
                details: {
                    serverTime: result.rows[0].time,
                    poolTotal: pool.totalCount || 'N/A',
                    poolIdle: pool.idleCount || 'N/A',
                    poolWaiting: pool.waitingCount || 'N/A'
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                latency: null,
                message: 'Database connection failed',
                error: error.message
            };
        }
    }

    /**
     * Check memory usage
     */
    static checkMemory() {
        const used = process.memoryUsage();
        const totalSystem = os.totalmem();
        const freeSystem = os.freemem();
        const usedPercent = ((totalSystem - freeSystem) / totalSystem * 100).toFixed(2);

        let status = 'healthy';
        if (usedPercent > 90) status = 'unhealthy';
        else if (usedPercent > 75) status = 'warning';

        return {
            status,
            message: `${usedPercent}% system memory used`,
            details: {
                heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
                heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
                rss: Math.round(used.rss / 1024 / 1024) + 'MB',
                systemTotal: Math.round(totalSystem / 1024 / 1024) + 'MB',
                systemFree: Math.round(freeSystem / 1024 / 1024) + 'MB',
                usedPercent: parseFloat(usedPercent)
            }
        };
    }

    /**
     * Check CPU load
     */
    static checkCPU() {
        const cpus = os.cpus();
        const loadAvg = os.loadavg();
        const cpuCount = cpus.length;
        const load1min = (loadAvg[0] / cpuCount * 100).toFixed(2);

        let status = 'healthy';
        if (load1min > 90) status = 'unhealthy';
        else if (load1min > 70) status = 'warning';

        return {
            status,
            message: `${load1min}% CPU load (1 min avg)`,
            details: {
                cores: cpuCount,
                model: cpus[0]?.model || 'Unknown',
                loadAvg: {
                    '1min': loadAvg[0].toFixed(2),
                    '5min': loadAvg[1].toFixed(2),
                    '15min': loadAvg[2].toFixed(2)
                },
                normalizedLoad: parseFloat(load1min)
            }
        };
    }

    /**
     * Check disk space (basic)
     */
    static checkDisk() {
        // Note: For detailed disk monitoring on Windows, additional packages needed
        return {
            status: 'healthy',
            message: 'Disk check requires additional monitoring setup',
            details: {
                platform: os.platform(),
                architecture: os.arch()
            }
        };
    }

    /**
     * Quick health check (for load balancer)
     */
    static async quickCheck() {
        try {
            await pool.query('SELECT 1');
            return { status: 'ok', timestamp: new Date().toISOString() };
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }
}

module.exports = HealthCheckService;
