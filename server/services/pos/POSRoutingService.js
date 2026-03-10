/**
 * POS Routing Service
 * Smart device selection based on department, load, and availability
 * WOLF HMS - Multi-Provider POS Integration
 */

const { pool } = require('../../db');

class POSRoutingService {
    constructor(posServiceManager) {
        this.posServiceManager = posServiceManager;
    }

    /**
     * Select optimal device based on routing rules and conditions
     */
    async selectOptimalDevice(department, amount = null, options = {}) {
        // 1. First check for explicit routing rules
        const routingRule = await this.getRoutingRule(department, amount);

        if (routingRule && routingRule.primary_device_id) {
            const primaryDevice = await this.posServiceManager.getDevice(routingRule.primary_device_id);

            // Check if primary device is online and not at limit
            if (primaryDevice && await this.isDeviceAvailable(primaryDevice)) {
                return {
                    device: primaryDevice,
                    reason: 'routing_rule_primary',
                    ruleId: routingRule.id
                };
            }

            // Try fallback device
            if (routingRule.fallback_device_id) {
                const fallbackDevice = await this.posServiceManager.getDevice(routingRule.fallback_device_id);
                if (fallbackDevice && await this.isDeviceAvailable(fallbackDevice)) {
                    return {
                        device: fallbackDevice,
                        reason: 'routing_rule_fallback',
                        ruleId: routingRule.id
                    };
                }
            }
        }

        // 2. Get all active devices for this department
        let devices = await this.posServiceManager.getDevices({
            status: 'active',
            department: department
        });

        // If no department-specific devices, get all active devices
        if (devices.length === 0) {
            devices = await this.posServiceManager.getDevices({ status: 'active' });
        }

        if (devices.length === 0) {
            throw new Error('No active POS devices available');
        }

        // 3. Filter by amount limit if specified
        if (amount) {
            devices = devices.filter(d =>
                !d.single_txn_limit || parseFloat(d.single_txn_limit) >= amount
            );

            if (devices.length === 0) {
                throw new Error('No devices available for this transaction amount');
            }
        }

        // 4. Score devices and select best one
        const scoredDevices = await Promise.all(
            devices.map(async device => ({
                device,
                score: await this.calculateDeviceScore(device, options)
            }))
        );

        // Sort by score (highest first)
        scoredDevices.sort((a, b) => b.score - a.score);

        return {
            device: scoredDevices[0].device,
            reason: 'auto_selected',
            score: scoredDevices[0].score,
            alternatives: scoredDevices.slice(1, 4).map(s => ({
                deviceId: s.device.id,
                deviceName: s.device.device_name,
                score: s.score
            }))
        };
    }

    /**
     * Calculate device score for selection
     */
    async calculateDeviceScore(device, options = {}) {
        let score = 100;

        // 1. Connection status (most important)
        const isOnline = await this.checkDeviceOnline(device);
        if (!isOnline) {
            score -= 50; // Heavy penalty for offline devices
        }

        // 2. Transaction load today (prefer less busy devices)
        const txnCount = await this.getTodayTransactionCount(device.id);
        score -= Math.min(txnCount * 2, 30); // Max 30 point penalty

        // 3. Recent heartbeat (prefer recently active)
        if (device.last_heartbeat) {
            const minutesSinceHeartbeat = (Date.now() - new Date(device.last_heartbeat).getTime()) / 60000;
            if (minutesSinceHeartbeat < 5) {
                score += 10; // Bonus for very recent heartbeat
            } else if (minutesSinceHeartbeat > 60) {
                score -= 20; // Penalty for old heartbeat
            }
        } else {
            score -= 15; // Penalty for no heartbeat
        }

        // 4. Success rate today
        const successRate = await this.getTodaySuccessRate(device.id);
        if (successRate < 80) {
            score -= (100 - successRate) / 5; // Penalty for low success rate
        }

        // 5. Provider preference
        if (options.preferProvider && device.provider_code === options.preferProvider) {
            score += 15;
        }

        // 6. EMI capability (if EMI requested)
        if (options.emi) {
            const capabilities = await this.getProviderCapabilities(device.provider_code);
            if (capabilities?.features?.emi) {
                score += 10;
            } else {
                score -= 100; // Disqualify non-EMI devices
            }
        }

        return Math.max(0, score);
    }

    /**
     * Check if device is available for transactions
     */
    async isDeviceAvailable(device) {
        if (device.status !== 'active') {
            return false;
        }

        // Check daily limit
        if (device.daily_limit) {
            const todayTotal = await this.getTodayTotalAmount(device.id);
            if (todayTotal >= parseFloat(device.daily_limit)) {
                return false;
            }
        }

        // Check if online (within last 10 minutes of heartbeat)
        if (device.last_heartbeat) {
            const minutesSinceHeartbeat = (Date.now() - new Date(device.last_heartbeat).getTime()) / 60000;
            if (minutesSinceHeartbeat > 10) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get routing rule for department/amount
     */
    async getRoutingRule(department, amount = null) {
        try {
            let query = `
                SELECT * FROM pos_routing_rules 
                WHERE is_active = true
                AND (department = $1 OR department IS NULL)
            `;
            const params = [department];

            if (amount) {
                query += ` AND (max_amount IS NULL OR max_amount >= $2)`;
                params.push(amount);
            }

            query += ` ORDER BY department NULLS LAST, priority DESC LIMIT 1`;

            const result = await pool.query(query, params);
            return result.rows[0];
        } catch (error) {
            console.warn('Routing rules table may not exist:', error.message);
            return null;
        }
    }

    /**
     * Get fallback device for a primary device
     */
    async getFallbackDevice(primaryDeviceId) {
        // Check routing rules for explicit fallback
        const rule = await pool.query(`
            SELECT fallback_device_id FROM pos_routing_rules
            WHERE primary_device_id = $1 AND is_active = true
            LIMIT 1
        `, [primaryDeviceId]);

        if (rule.rows[0]?.fallback_device_id) {
            return await this.posServiceManager.getDevice(rule.rows[0].fallback_device_id);
        }

        // Otherwise, find another device in the same department
        const primaryDevice = await this.posServiceManager.getDevice(primaryDeviceId);
        if (!primaryDevice) return null;

        const alternatives = await this.posServiceManager.getDevices({
            status: 'active',
            department: primaryDevice.department
        });

        return alternatives.find(d => d.id !== primaryDeviceId);
    }

    // Helper methods
    async checkDeviceOnline(device) {
        if (!device.last_heartbeat) return false;
        const minutes = (Date.now() - new Date(device.last_heartbeat).getTime()) / 60000;
        return minutes < 10;
    }

    async getTodayTransactionCount(deviceId) {
        const result = await pool.query(`
            SELECT COUNT(*) as count FROM pos_transactions
            WHERE device_id = $1 AND DATE(initiated_at) = CURRENT_DATE
        `, [deviceId]);
        return parseInt(result.rows[0].count) || 0;
    }

    async getTodayTotalAmount(deviceId) {
        const result = await pool.query(`
            SELECT COALESCE(SUM(total_amount), 0) as total FROM pos_transactions
            WHERE device_id = $1 AND DATE(initiated_at) = CURRENT_DATE AND status = 'success'
        `, [deviceId]);
        return parseFloat(result.rows[0].total) || 0;
    }

    async getTodaySuccessRate(deviceId) {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as success
            FROM pos_transactions
            WHERE device_id = $1 AND DATE(initiated_at) = CURRENT_DATE
        `, [deviceId]);
        const { total, success } = result.rows[0];
        return total > 0 ? (success / total) * 100 : 100;
    }

    async getProviderCapabilities(providerCode) {
        try {
            const adapter = this.posServiceManager.getAdapter(providerCode);
            return adapter.getCapabilities();
        } catch {
            return null;
        }
    }

    /**
     * Create or update routing rule
     */
    async setRoutingRule(ruleData) {
        const {
            department, primaryDeviceId, fallbackDeviceId,
            maxAmount, providerPreference, priority = 0
        } = ruleData;

        const result = await pool.query(`
            INSERT INTO pos_routing_rules (
                department, primary_device_id, fallback_device_id,
                max_amount, provider_preference, priority
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (department) DO UPDATE SET
                primary_device_id = $2,
                fallback_device_id = $3,
                max_amount = $4,
                provider_preference = $5,
                priority = $6,
                updated_at = NOW()
            RETURNING *
        `, [department, primaryDeviceId, fallbackDeviceId, maxAmount, providerPreference, priority]);

        return result.rows[0];
    }

    /**
     * Get all routing rules
     */
    async getRoutingRules() {
        try {
            const result = await pool.query(`
                SELECT r.*, 
                    pd.device_name as primary_device_name,
                    fd.device_name as fallback_device_name
                FROM pos_routing_rules r
                LEFT JOIN pos_devices pd ON r.primary_device_id = pd.id
                LEFT JOIN pos_devices fd ON r.fallback_device_id = fd.id
                WHERE r.is_active = true
                ORDER BY r.priority DESC, r.department
            `);
            return result.rows;
        } catch (error) {
            console.warn('Routing rules table may not exist');
            return [];
        }
    }
}

module.exports = POSRoutingService;
