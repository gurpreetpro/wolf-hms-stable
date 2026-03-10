const { pool } = require('../db');
const logger = require('./Logger');

/**
 * Alert Service
 * Manages system alerts, notifications, and alert lifecycle
 */
class AlertService {
    static ALERT_TYPES = {
        CRITICAL: 'critical',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    };

    static CATEGORIES = {
        DATABASE: 'database',
        PERFORMANCE: 'performance',
        SECURITY: 'security',
        SYSTEM: 'system',
        INTEGRATION: 'integration'
    };

    /**
     * Create a new alert
     */
    static async createAlert({ type, category, title, message, details = {}, source = 'system', requestId = null }) {
        try {
            const result = await pool.query(`
                INSERT INTO system_alerts 
                (alert_type, category, title, message, details, source, request_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [type, category, title, message, JSON.stringify(details), source, requestId]);

            const alert = result.rows[0];

            // Log the alert
            logger.log(type === 'critical' ? 'CRITICAL' : type.toUpperCase(), title, {
                alertId: alert.id,
                category,
                source,
                requestId
            });

            // Emit real-time notification (if Socket.IO is available)
            if (global.io) {
                global.io.emit('system-alert', {
                    id: alert.id,
                    type,
                    category,
                    title,
                    message,
                    createdAt: alert.created_at
                });
            }

            // Send email for critical alerts
            if (type === this.ALERT_TYPES.CRITICAL || type === this.ALERT_TYPES.ERROR) {
                await this.sendAlertEmail(alert);
            }

            return alert;
        } catch (error) {
            logger.error('Failed to create alert', { error: error.message, title });
            return null;
        }
    }

    /**
     * Send email notification for alert
     */
    static async sendAlertEmail(alert) {
        try {
            // Get admin users with email preferences
            const result = await pool.query(`
                SELECT u.email, u.username 
                FROM users u
                LEFT JOIN alert_preferences ap ON u.id = ap.user_id
                WHERE u.role = 'Admin' AND u.is_active = true
                AND (ap.email_critical = true OR ap.id IS NULL)
            `);

            if (result.rows.length === 0) {
                logger.info('No admin users to notify for alert');
                return;
            }

            // Note: Email sending requires nodemailer setup
            // For now, log that email would be sent
            logger.info('Alert email would be sent', {
                alertId: alert.id,
                recipients: result.rows.map(r => r.email),
                type: alert.alert_type
            });

            // TODO: Implement actual email sending with nodemailer
            // const transporter = nodemailer.createTransport({...});
            // await transporter.sendMail({...});

        } catch (error) {
            logger.error('Failed to send alert email', { error: error.message });
        }
    }

    /**
     * Get all alerts with pagination and filtering
     */
    static async getAlerts({ page = 1, limit = 20, type = null, resolved = null, category = null }) {
        try {
            const offset = (page - 1) * limit;
            let query = 'SELECT * FROM system_alerts WHERE 1=1';
            let countQuery = 'SELECT COUNT(*) FROM system_alerts WHERE 1=1';
            const params = [];
            let paramIndex = 1;

            if (type) {
                query += ` AND alert_type = $${paramIndex}`;
                countQuery += ` AND alert_type = $${paramIndex}`;
                params.push(type);
                paramIndex++;
            }

            if (resolved !== null) {
                query += ` AND resolved = $${paramIndex}`;
                countQuery += ` AND resolved = $${paramIndex}`;
                params.push(resolved);
                paramIndex++;
            }

            if (category) {
                query += ` AND category = $${paramIndex}`;
                countQuery += ` AND category = $${paramIndex}`;
                params.push(category);
                paramIndex++;
            }

            query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);

            const [alertsResult, countResult] = await Promise.all([
                pool.query(query, params),
                pool.query(countQuery, params.slice(0, -2))
            ]);

            return {
                alerts: alertsResult.rows,
                total: parseInt(countResult.rows[0].count),
                page,
                totalPages: Math.ceil(countResult.rows[0].count / limit)
            };
        } catch (error) {
            logger.error('Failed to get alerts', { error: error.message });
            throw error;
        }
    }

    /**
     * Acknowledge an alert
     */
    static async acknowledgeAlert(alertId, userId) {
        try {
            const result = await pool.query(`
                UPDATE system_alerts 
                SET acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW()
                WHERE id = $2
                RETURNING *
            `, [userId, alertId]);

            return result.rows[0];
        } catch (error) {
            logger.error('Failed to acknowledge alert', { error: error.message, alertId });
            throw error;
        }
    }

    /**
     * Resolve an alert
     */
    static async resolveAlert(alertId, userId, notes = '') {
        try {
            const result = await pool.query(`
                UPDATE system_alerts 
                SET resolved = true, resolved_by = $1, resolved_at = NOW(), 
                    resolution_notes = $2, acknowledged = true,
                    acknowledged_by = COALESCE(acknowledged_by, $1),
                    acknowledged_at = COALESCE(acknowledged_at, NOW())
                WHERE id = $3
                RETURNING *
            `, [userId, notes, alertId]);

            return result.rows[0];
        } catch (error) {
            logger.error('Failed to resolve alert', { error: error.message, alertId });
            throw error;
        }
    }

    /**
     * Get alert statistics
     */
    static async getStats() {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE alert_type = 'critical' AND NOT resolved) as critical_unresolved,
                    COUNT(*) FILTER (WHERE alert_type = 'error' AND NOT resolved) as error_unresolved,
                    COUNT(*) FILTER (WHERE alert_type = 'warning' AND NOT resolved) as warning_unresolved,
                    COUNT(*) FILTER (WHERE NOT resolved) as total_unresolved,
                    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
                    COUNT(*) as total
                FROM system_alerts
            `);

            return result.rows[0];
        } catch (error) {
            logger.error('Failed to get alert stats', { error: error.message });
            return null;
        }
    }

    /**
     * Quick alert creators
     */
    static async critical(title, message, details = {}) {
        return this.createAlert({
            type: this.ALERT_TYPES.CRITICAL,
            category: this.CATEGORIES.SYSTEM,
            title, message, details
        });
    }

    static async error(title, message, details = {}) {
        return this.createAlert({
            type: this.ALERT_TYPES.ERROR,
            category: this.CATEGORIES.SYSTEM,
            title, message, details
        });
    }

    static async warning(title, message, details = {}) {
        return this.createAlert({
            type: this.ALERT_TYPES.WARNING,
            category: this.CATEGORIES.SYSTEM,
            title, message, details
        });
    }

    static async dbError(title, message, details = {}) {
        return this.createAlert({
            type: this.ALERT_TYPES.CRITICAL,
            category: this.CATEGORIES.DATABASE,
            title, message, details
        });
    }
}

module.exports = AlertService;
