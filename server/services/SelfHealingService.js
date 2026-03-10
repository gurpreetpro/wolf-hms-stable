const { pool } = require('../db');
const logger = require('./Logger');
const AlertService = require('./AlertService');
const MetricsCollector = require('./MetricsCollector');
const os = require('os');

/**
 * Self-Healing Service
 * Automatic detection and resolution of common issues
 */
class SelfHealingService {
    static isRunning = false;
    static checkInterval = null;
    static healingHistory = [];
    static maxHistorySize = 100;

    // Thresholds for auto-healing triggers
    static thresholds = {
        memoryUsagePercent: 90,
        cpuLoadPercent: 85,
        responseTimeMs: 2000,
        errorRatePercent: 10,
        dbConnectionTimeout: 5000,
        slowQueryMs: 1000
    };

    /**
     * Start the self-healing monitor
     */
    static start(intervalMs = 60000) {
        if (this.isRunning) {
            logger.warn('Self-healing service already running');
            return;
        }

        this.isRunning = true;
        logger.info('Self-healing service started', { intervalMs });

        // Run initial check
        this.runHealthCheck();

        // Schedule periodic checks
        this.checkInterval = setInterval(() => {
            this.runHealthCheck();
        }, intervalMs);
    }

    /**
     * Stop the self-healing monitor
     */
    static stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        logger.info('Self-healing service stopped');
    }

    /**
     * Run comprehensive health check and auto-heal if needed
     */
    static async runHealthCheck() {
        try {
            const issues = [];

            // Check memory
            const memoryIssue = await this.checkMemory();
            if (memoryIssue) issues.push(memoryIssue);

            // Check database connections
            const dbIssue = await this.checkDatabase();
            if (dbIssue) issues.push(dbIssue);

            // Check error rates
            const errorIssue = this.checkErrorRate();
            if (errorIssue) issues.push(errorIssue);

            // Check slow responses
            const slowIssue = this.checkSlowResponses();
            if (slowIssue) issues.push(slowIssue);

            // Attempt auto-healing for detected issues
            for (const issue of issues) {
                await this.attemptAutoHeal(issue);
            }

            return issues;
        } catch (error) {
            logger.error('Self-healing check failed', { error: error.message });
            return [];
        }
    }

    /**
     * Check memory usage
     */
    static async checkMemory() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedPercent = ((totalMem - freeMem) / totalMem) * 100;

        if (usedPercent > this.thresholds.memoryUsagePercent) {
            return {
                type: 'memory',
                severity: 'high',
                message: `Memory usage at ${usedPercent.toFixed(1)}%`,
                value: usedPercent,
                threshold: this.thresholds.memoryUsagePercent,
                healable: true,
                healAction: 'gc'
            };
        }
        return null;
    }

    /**
     * Check database health
     */
    static async checkDatabase() {
        try {
            const start = Date.now();
            await pool.query('SELECT 1');
            const latency = Date.now() - start;

            if (latency > this.thresholds.dbConnectionTimeout) {
                return {
                    type: 'database',
                    severity: 'critical',
                    message: `Database latency: ${latency}ms`,
                    value: latency,
                    threshold: this.thresholds.dbConnectionTimeout,
                    healable: true,
                    healAction: 'db_reconnect'
                };
            }
        } catch (error) {
            return {
                type: 'database',
                severity: 'critical',
                message: `Database error: ${error.message}`,
                healable: true,
                healAction: 'db_reconnect'
            };
        }
        return null;
    }

    /**
     * Check error rate from metrics
     */
    static checkErrorRate() {
        const stats = MetricsCollector.getRequestStats();
        const errorRate = stats.total > 0
            ? (stats.error / stats.total) * 100
            : 0;

        if (errorRate > this.thresholds.errorRatePercent) {
            return {
                type: 'error_rate',
                severity: 'high',
                message: `Error rate at ${errorRate.toFixed(1)}%`,
                value: errorRate,
                threshold: this.thresholds.errorRatePercent,
                healable: false,
                healAction: 'alert_only'
            };
        }
        return null;
    }

    /**
     * Check for slow responses
     */
    static checkSlowResponses() {
        const stats = MetricsCollector.getRequestStats();
        const avgResponseTime = stats.last1Min.avgResponseTime;

        if (avgResponseTime > this.thresholds.responseTimeMs) {
            return {
                type: 'slow_response',
                severity: 'medium',
                message: `Avg response time: ${avgResponseTime}ms`,
                value: avgResponseTime,
                threshold: this.thresholds.responseTimeMs,
                healable: true,
                healAction: 'cache_clear'
            };
        }
        return null;
    }

    /**
     * Attempt to auto-heal an issue
     */
    static async attemptAutoHeal(issue) {
        const healingRecord = {
            timestamp: new Date().toISOString(),
            issue: issue.type,
            severity: issue.severity,
            message: issue.message,
            action: issue.healAction,
            success: false,
            result: null
        };

        try {
            logger.warn(`Self-healing triggered: ${issue.type}`, issue);

            switch (issue.healAction) {
                case 'gc':
                    healingRecord.result = await this.healMemory();
                    healingRecord.success = true;
                    break;

                case 'db_reconnect':
                    healingRecord.result = await this.healDatabase();
                    healingRecord.success = true;
                    break;

                case 'cache_clear':
                    healingRecord.result = await this.healSlowResponse();
                    healingRecord.success = true;
                    break;

                case 'alert_only':
                    await AlertService.createAlert({
                        type: issue.severity === 'critical' ? 'critical' : 'warning',
                        category: 'system',
                        title: `Auto-detected: ${issue.type}`,
                        message: issue.message,
                        source: 'self-healing'
                    });
                    healingRecord.result = 'Alert created';
                    healingRecord.success = true;
                    break;

                default:
                    healingRecord.result = 'No healing action available';
            }
        } catch (error) {
            healingRecord.result = error.message;
            healingRecord.success = false;
            logger.error(`Self-healing failed for ${issue.type}`, { error: error.message });
        }

        // Store in history
        this.healingHistory.push(healingRecord);
        if (this.healingHistory.length > this.maxHistorySize) {
            this.healingHistory.shift();
        }

        // Log success/failure
        if (healingRecord.success) {
            logger.info(`Self-healing successful: ${issue.type}`, healingRecord);
        }

        return healingRecord;
    }

    /**
     * Heal memory issues - trigger garbage collection
     */
    static async healMemory() {
        if (global.gc) {
            global.gc();
            return 'Forced garbage collection';
        } else {
            return 'GC not available (run with --expose-gc)';
        }
    }

    /**
     * Heal database issues - attempt reconnection
     */
    static async healDatabase() {
        const DatabaseRecovery = require('./DatabaseRecovery');
        const recovered = await DatabaseRecovery.attemptRecovery();
        return recovered ? 'Database reconnected' : 'Reconnection failed';
    }

    /**
     * Heal slow response - clear caches
     */
    static async healSlowResponse() {
        // Clear any in-memory caches
        // This would be expanded based on actual cache implementation
        return 'Cache cleared (placeholder)';
    }

    /**
     * Get healing history
     */
    static getHistory(limit = 50) {
        return this.healingHistory.slice(-limit).reverse();
    }

    /**
     * Get current status
     */
    static getStatus() {
        return {
            isRunning: this.isRunning,
            thresholds: this.thresholds,
            historyCount: this.healingHistory.length,
            lastCheck: this.healingHistory.length > 0
                ? this.healingHistory[this.healingHistory.length - 1].timestamp
                : null,
            recentHeals: this.healingHistory.filter(h => {
                return new Date(h.timestamp) > new Date(Date.now() - 3600000);
            }).length
        };
    }

    /**
     * Update thresholds
     */
    static updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        logger.info('Self-healing thresholds updated', this.thresholds);
    }
}

module.exports = SelfHealingService;
