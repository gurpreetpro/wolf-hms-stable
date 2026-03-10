/**
 * Message Router Service
 * Routes incoming instrument messages to appropriate handlers
 * Manages message queue and processing pipeline
 */

const EventEmitter = require('events');
const pool = require('../config/db');

class MessageRouter extends EventEmitter {
    constructor() {
        super();

        this.messageQueue = [];
        this.processing = false;
        this.retryQueue = new Map(); // messageId -> { attempts, lastAttempt, message }
        this.maxRetries = 3;
        this.retryDelayMs = 5000;

        // Stats
        this.stats = {
            received: 0,
            processed: 0,
            failed: 0,
            retried: 0,
            resultsUploaded: 0
        };

        // Start processing loop
        this.startProcessing();
    }

    /**
     * Add message to processing queue
     * @param {object} message - Parsed message from instrument
     */
    enqueue(message) {
        const queuedMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            ...message
        };

        this.messageQueue.push(queuedMessage);
        this.stats.received++;
        this.emit('message_queued', queuedMessage);

        return queuedMessage.id;
    }

    /**
     * Process messages from queue
     */
    async startProcessing() {
        setInterval(async () => {
            if (this.processing || this.messageQueue.length === 0) return;

            this.processing = true;

            try {
                const message = this.messageQueue.shift();
                await this.processMessage(message);
            } catch (error) {
                console.error('Message processing error:', error);
            } finally {
                this.processing = false;
            }
        }, 100); // Process every 100ms
    }

    /**
     * Process a single message
     */
    async processMessage(message) {
        try {
            const { instrumentId, protocol, parsed } = message;

            // Validate message
            if (!this.validateMessage(parsed)) {
                throw new Error('Invalid message format');
            }

            // Route based on message type
            if (parsed.results && parsed.results.length > 0) {
                await this.handleResults(instrumentId, parsed);
            } else if (parsed.query) {
                await this.handleQuery(instrumentId, parsed);
            } else if (parsed.orders && parsed.orders.length > 0) {
                await this.handleOrderAck(instrumentId, parsed);
            }

            this.stats.processed++;
            this.emit('message_processed', message);

            // Log successful processing
            await this.logMessage(instrumentId, 'IN', message, 'SUCCESS');

        } catch (error) {
            console.error(`Failed to process message ${message.id}:`, error);
            await this.handleFailure(message, error);
        }
    }

    /**
     * Validate message structure
     */
    validateMessage(parsed) {
        if (!parsed) return false;

        // Must have either results, query, or orders
        const hasContent = (
            (parsed.results && parsed.results.length > 0) ||
            (parsed.orders && parsed.orders.length > 0) ||
            parsed.query ||
            parsed.header
        );

        return hasContent;
    }

    /**
     * Handle result messages - map and upload to LIS
     */
    async handleResults(instrumentId, parsed) {
        const { ResultMapper } = require('./resultMapper');
        const mapper = new ResultMapper();

        for (const result of parsed.results) {
            try {
                // Get patient context from parsed message
                const patient = parsed.patients?.[0] || null;
                const order = parsed.orders?.[0] || null;

                // Map result to LIS format
                const mappedResult = await mapper.mapResult(instrumentId, result, patient, order);

                if (mappedResult.matched) {
                    // Upload to lab_requests
                    await this.uploadResult(mappedResult);
                    this.stats.resultsUploaded++;
                    this.emit('result_uploaded', mappedResult);
                } else {
                    // Log unmatched result for manual review
                    await this.logUnmatchedResult(instrumentId, result);
                    this.emit('result_unmatched', { instrumentId, result });
                }

            } catch (error) {
                console.error('Result handling error:', error);
                this.emit('result_error', { instrumentId, result, error: error.message });
            }
        }
    }

    /**
     * Handle query messages (instrument requesting pending orders)
     */
    async handleQuery(instrumentId, parsed) {
        const { OrderSender } = require('./orderSender');
        const sender = new OrderSender();

        // Get pending orders for this instrument
        const pendingOrders = await sender.getPendingOrders(instrumentId);

        if (pendingOrders.length > 0) {
            this.emit('orders_requested', { instrumentId, count: pendingOrders.length });
        }
    }

    /**
     * Handle order acknowledgment from instrument
     */
    async handleOrderAck(instrumentId, parsed) {
        for (const order of parsed.orders) {
            if (order.actionCode === 'A' || order.reportType === 'O') {
                // Order accepted by instrument
                await pool.query(`
                    UPDATE lab_requests 
                    SET status = 'In Progress', 
                        updated_at = NOW()
                    WHERE barcode = $1 OR id::text = $1
                `, [order.specimenId]);

                this.emit('order_acknowledged', { instrumentId, specimenId: order.specimenId });
            }
        }
    }

    /**
     * Upload result to lab_requests
     */
    async uploadResult(mappedResult) {
        const { labRequestId, value, unit, referenceRange, flag, instrumentId, testCode } = mappedResult;

        await pool.query(`
            UPDATE lab_requests 
            SET 
                status = 'Completed',
                result = $1,
                completed_by = 1,
                updated_at = NOW()
            WHERE id = $2
        `, [
            JSON.stringify({
                value,
                unit,
                referenceRange,
                flag,
                source: 'INSTRUMENT_AUTO',
                instrumentId,
                testCode,
                uploadedAt: new Date().toISOString()
            }),
            labRequestId
        ]);

        console.log(`✅ Auto-uploaded result: Request #${labRequestId} = ${value} ${unit}`);
    }

    /**
     * Log unmatched result for manual review
     */
    async logUnmatchedResult(instrumentId, result) {
        await pool.query(`
            INSERT INTO instrument_comm_log 
            (instrument_id, direction, message_type, raw_message, parsed_data, status, error_details)
            VALUES ($1, 'IN', 'UNMATCHED_RESULT', $2, $3, 'PARSE_ERROR', 'No matching lab request found')
        `, [
            instrumentId,
            JSON.stringify(result),
            JSON.stringify({ testCode: result.testCode, value: result.value })
        ]);
    }

    /**
     * Handle processing failure with retry
     */
    async handleFailure(message, error) {
        const retryInfo = this.retryQueue.get(message.id) || { attempts: 0, message };
        retryInfo.attempts++;
        retryInfo.lastAttempt = new Date();
        retryInfo.lastError = error.message;

        if (retryInfo.attempts < this.maxRetries) {
            // Schedule retry
            this.retryQueue.set(message.id, retryInfo);
            this.stats.retried++;

            setTimeout(() => {
                this.retryQueue.delete(message.id);
                this.messageQueue.push(message);
            }, this.retryDelayMs * retryInfo.attempts); // Exponential backoff

            this.emit('message_retry', { messageId: message.id, attempt: retryInfo.attempts });
        } else {
            // Max retries exceeded
            this.stats.failed++;
            await this.logMessage(message.instrumentId, 'IN', message, 'PARSE_ERROR', error.message);
            this.emit('message_failed', { messageId: message.id, error: error.message });
        }
    }

    /**
     * Log message to database
     */
    async logMessage(instrumentId, direction, message, status, errorDetails = null) {
        try {
            await pool.query(`
                INSERT INTO instrument_comm_log 
                (instrument_id, direction, message_type, raw_message, parsed_data, status, error_details, processing_time_ms)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                instrumentId,
                direction,
                message.protocol || 'UNKNOWN',
                message.raw?.substring(0, 5000),
                JSON.stringify(message.parsed || {}),
                status,
                errorDetails,
                Date.now() - new Date(message.timestamp).getTime()
            ]);
        } catch (error) {
            console.error('Failed to log message:', error);
        }
    }

    /**
     * Get current stats
     */
    getStats() {
        return {
            ...this.stats,
            queueLength: this.messageQueue.length,
            retryQueueLength: this.retryQueue.size,
            isProcessing: this.processing
        };
    }

    /**
     * Clear stats
     */
    resetStats() {
        this.stats = {
            received: 0,
            processed: 0,
            failed: 0,
            retried: 0,
            resultsUploaded: 0
        };
    }
}

// Singleton instance
let routerInstance = null;

function getMessageRouter() {
    if (!routerInstance) {
        routerInstance = new MessageRouter();
    }
    return routerInstance;
}

module.exports = { MessageRouter, getMessageRouter };
