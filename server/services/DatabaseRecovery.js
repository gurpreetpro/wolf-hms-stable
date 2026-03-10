const { Pool } = require('pg');
const logger = require('./Logger');
const AlertService = require('./AlertService');

/**
 * Database Recovery Service
 * Handles automatic database connection recovery and health monitoring
 */
class DatabaseRecovery {
    static pool = null;
    static isRecovering = false;
    static retryCount = 0;
    static maxRetries = 5;
    static retryDelay = 5000; // 5 seconds

    /**
     * Initialize with the database pool
     */
    static init(dbPool) {
        this.pool = dbPool;
        this.setupErrorHandlers();
        logger.info('Database recovery service initialized');
    }

    /**
     * Setup error handlers on the pool
     */
    static setupErrorHandlers() {
        if (!this.pool) return;

        this.pool.on('error', async (err) => {
            logger.error('Database pool error', { error: err.message });

            await AlertService.dbError(
                'Database Connection Error',
                `Pool error: ${err.message}`,
                { code: err.code, stack: err.stack }
            );

            // Attempt recovery for connection errors
            if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === '57P01') {
                this.attemptRecovery();
            }
        });

        this.pool.on('connect', () => {
            if (this.isRecovering) {
                logger.info('Database connection recovered');
                this.isRecovering = false;
                this.retryCount = 0;
            }
        });
    }

    /**
     * Attempt to recover database connection
     */
    static async attemptRecovery() {
        if (this.isRecovering) return;

        this.isRecovering = true;
        this.retryCount = 0;

        logger.warn('Starting database recovery process');

        while (this.retryCount < this.maxRetries && this.isRecovering) {
            this.retryCount++;

            try {
                // Test connection
                await this.pool.query('SELECT 1');

                logger.info('Database connection restored', {
                    attempts: this.retryCount
                });

                this.isRecovering = false;
                this.retryCount = 0;

                await AlertService.createAlert({
                    type: 'info',
                    category: 'database',
                    title: 'Database Connection Restored',
                    message: `Connection restored after ${this.retryCount} attempts`
                });

                return true;
            } catch (error) {
                logger.warn(`Recovery attempt ${this.retryCount}/${this.maxRetries} failed`, {
                    error: error.message
                });

                if (this.retryCount >= this.maxRetries) {
                    await AlertService.critical(
                        'Database Recovery Failed',
                        `Failed to restore database connection after ${this.maxRetries} attempts`,
                        { lastError: error.message }
                    );
                    this.isRecovering = false;
                    return false;
                }

                // Wait before retry with exponential backoff
                const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return false;
    }

    /**
     * Execute query with automatic retry
     */
    static async queryWithRetry(sql, params = [], maxRetries = 3) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.pool.query(sql, params);
                return result;
            } catch (error) {
                lastError = error;

                // Only retry on connection errors
                if (!this.isRetryableError(error)) {
                    throw error;
                }

                logger.warn(`Query retry ${attempt}/${maxRetries}`, {
                    error: error.message,
                    sql: sql.substring(0, 100)
                });

                if (attempt < maxRetries) {
                    await new Promise(resolve =>
                        setTimeout(resolve, 1000 * attempt)
                    );
                }
            }
        }

        throw lastError;
    }

    /**
     * Check if error is retryable
     */
    static isRetryableError(error) {
        const retryableCodes = [
            'ECONNREFUSED',
            'ENOTFOUND',
            'ETIMEDOUT',
            'ECONNRESET',
            '57P01', // admin shutdown
            '57P02', // crash shutdown
            '57P03', // cannot connect now
            '08000', // connection exception
            '08003', // connection does not exist
            '08006'  // connection failure
        ];

        return retryableCodes.includes(error.code);
    }

    /**
     * Get connection pool status
     */
    static getPoolStatus() {
        if (!this.pool) return null;

        return {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
            isRecovering: this.isRecovering,
            retryCount: this.retryCount
        };
    }

    /**
     * Force pool refresh
     */
    static async refreshPool() {
        logger.info('Forcing pool refresh');

        try {
            // End all clients
            await this.pool.end();

            // Create new pool (requires reinitializing from db.js)
            // This is a placeholder - in production, you'd recreate the pool
            logger.warn('Pool ended - requires server restart for full refresh');

            return true;
        } catch (error) {
            logger.error('Failed to refresh pool', { error: error.message });
            return false;
        }
    }
}

module.exports = DatabaseRecovery;
