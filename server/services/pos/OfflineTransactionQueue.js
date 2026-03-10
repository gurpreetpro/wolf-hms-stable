/**
 * Offline Transaction Queue
 * Store & Forward for POS transactions when devices are offline
 * WOLF HMS - Multi-Provider POS Integration
 */

const { pool } = require('../../db');

class OfflineTransactionQueue {
    constructor(posServiceManager) {
        this.posServiceManager = posServiceManager;
        this.syncInterval = null;
        this.isSyncing = false;
    }

    /**
     * Start background sync process
     */
    startBackgroundSync(intervalMs = 60000) {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(() => {
            this.processQueue().catch(err =>
                console.error('[OfflineQueue] Background sync error:', err.message)
            );
        }, intervalMs);

        console.log('[OfflineQueue] Background sync started, interval:', intervalMs, 'ms');
    }

    /**
     * Stop background sync
     */
    stopBackgroundSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('[OfflineQueue] Background sync stopped');
        }
    }

    /**
     * Queue a transaction for later processing
     */
    async queueTransaction(transactionData) {
        const {
            invoiceId, deviceId, amount, paymentMode = 'card',
            customerPhone, customerName, department,
            emi, emiTenure, emiBank, createdBy
        } = transactionData;

        const queueId = `QUEUE${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        const result = await pool.query(`
            INSERT INTO pos_offline_queue (
                queue_id, invoice_id, device_id, amount, total_amount,
                payment_mode, customer_phone, customer_name, department,
                is_emi, emi_tenure, emi_bank, created_by
            ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            queueId, invoiceId, deviceId, amount,
            paymentMode, customerPhone, customerName, department,
            !!emi, emiTenure, emiBank, createdBy
        ]);

        console.log('[OfflineQueue] Transaction queued:', queueId);
        return result.rows[0];
    }

    /**
     * Process all pending transactions in queue
     */
    async processQueue() {
        if (this.isSyncing) {
            console.log('[OfflineQueue] Sync already in progress, skipping');
            return { processed: 0, skipped: true };
        }

        this.isSyncing = true;
        let processed = 0;
        let failed = 0;

        try {
            // Get all pending transactions
            const pending = await pool.query(`
                SELECT * FROM pos_offline_queue
                WHERE status IN ('queued', 'failed')
                AND retry_count < max_retries
                ORDER BY created_at ASC
                LIMIT 50
            `);

            console.log(`[OfflineQueue] Processing ${pending.rows.length} pending transactions`);

            for (const item of pending.rows) {
                try {
                    await this.processQueueItem(item);
                    processed++;
                } catch (error) {
                    failed++;
                    console.error(`[OfflineQueue] Failed to process ${item.queue_id}:`, error.message);
                }
            }

            return { processed, failed, total: pending.rows.length };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Process a single queue item
     */
    async processQueueItem(item) {
        // Update status to processing
        await pool.query(`
            UPDATE pos_offline_queue 
            SET status = 'processing', last_retry_at = NOW(), retry_count = retry_count + 1
            WHERE id = $1
        `, [item.id]);

        try {
            // Check if device is available
            const device = await this.posServiceManager.getDevice(item.device_id);
            if (!device || device.status !== 'active') {
                throw new Error('Device not available');
            }

            // Test connection before processing
            const connectionTest = await this.posServiceManager.testConnection(item.device_id);
            if (!connectionTest.success) {
                throw new Error('Device offline');
            }

            // Initiate the actual payment
            const paymentOptions = {
                paymentMode: item.payment_mode,
                customerPhone: item.customer_phone,
                department: item.department,
                initiatedBy: item.created_by
            };

            if (item.is_emi) {
                paymentOptions.emi = true;
                paymentOptions.emiTenure = item.emi_tenure;
                paymentOptions.emiBank = item.emi_bank;
            }

            const result = await this.posServiceManager.initiatePayment(
                item.device_id,
                item.invoice_id,
                parseFloat(item.amount),
                paymentOptions
            );

            // Mark as synced
            await pool.query(`
                UPDATE pos_offline_queue 
                SET status = 'synced', 
                    synced_transaction_id = $1, 
                    synced_at = NOW(),
                    error_message = NULL
                WHERE id = $2
            `, [result.transactionId, item.id]);

            console.log(`[OfflineQueue] Synced ${item.queue_id} -> ${result.transactionId}`);
            return result;

        } catch (error) {
            // Mark as failed with error
            await pool.query(`
                UPDATE pos_offline_queue 
                SET status = 'failed', error_message = $1
                WHERE id = $2
            `, [error.message, item.id]);

            throw error;
        }
    }

    /**
     * Get queue status summary
     */
    async getQueueStatus() {
        const result = await pool.query(`
            SELECT 
                status,
                COUNT(*) as count,
                SUM(amount) as total_amount
            FROM pos_offline_queue
            GROUP BY status
        `);

        const summary = {
            queued: 0,
            processing: 0,
            synced: 0,
            failed: 0,
            totalAmount: 0
        };

        result.rows.forEach(row => {
            summary[row.status] = parseInt(row.count);
            if (row.status !== 'synced') {
                summary.totalAmount += parseFloat(row.total_amount) || 0;
            }
        });

        summary.pending = summary.queued + summary.failed;
        return summary;
    }

    /**
     * Get pending queue items
     */
    async getPendingItems(limit = 50) {
        const result = await pool.query(`
            SELECT q.*, d.device_name, d.location, p.name as provider_name
            FROM pos_offline_queue q
            LEFT JOIN pos_devices d ON q.device_id = d.id
            LEFT JOIN pos_providers p ON d.provider_id = p.id
            WHERE q.status IN ('queued', 'failed')
            ORDER BY q.created_at ASC
            LIMIT $1
        `, [limit]);

        return result.rows;
    }

    /**
     * Cancel a queued transaction
     */
    async cancelQueueItem(queueId) {
        const result = await pool.query(`
            UPDATE pos_offline_queue 
            SET status = 'cancelled', updated_at = NOW()
            WHERE queue_id = $1 AND status IN ('queued', 'failed')
            RETURNING *
        `, [queueId]);

        return result.rows[0];
    }

    /**
     * Retry a specific failed item
     */
    async retryItem(queueId) {
        const result = await pool.query(`
            UPDATE pos_offline_queue 
            SET status = 'queued', retry_count = 0, error_message = NULL
            WHERE queue_id = $1 AND status = 'failed'
            RETURNING *
        `, [queueId]);

        if (result.rows[0]) {
            // Try to process immediately
            await this.processQueueItem(result.rows[0]);
        }

        return result.rows[0];
    }

    /**
     * Clean up old synced/cancelled items
     */
    async cleanupOldItems(daysOld = 30) {
        const result = await pool.query(`
            DELETE FROM pos_offline_queue
            WHERE status IN ('synced', 'cancelled')
            AND created_at < NOW() - INTERVAL '${daysOld} days'
        `);

        console.log(`[OfflineQueue] Cleaned up ${result.rowCount} old items`);
        return result.rowCount;
    }
}

module.exports = OfflineTransactionQueue;
