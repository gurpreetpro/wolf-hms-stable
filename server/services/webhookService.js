/**
 * Webhook Service
 * Manages webhook registration, delivery, and retries
 * Phase 2: API & Integration Layer (Gold Standard HMS)
 */

const pool = require('../config/db');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

/**
 * Generate HMAC signature for payload
 */
const generateSignature = (payload, secret) => {
    return crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
};

/**
 * Send webhook to URL
 */
const deliverWebhook = async (webhookId, eventType, payload) => {
    // Get webhook config
    const webhookResult = await pool.query(
        'SELECT * FROM webhooks WHERE id = $1 AND is_active = TRUE',
        [webhookId]
    );
    
    if (webhookResult.rows.length === 0) {
        console.warn(`[Webhook] Webhook ${webhookId} not found or inactive`);
        return false;
    }
    
    const webhook = webhookResult.rows[0];
    
    // Create delivery record
    const deliveryResult = await pool.query(`
        INSERT INTO webhook_deliveries (webhook_id, event_type, payload)
        VALUES ($1, $2, $3)
        RETURNING id
    `, [webhookId, eventType, payload]);
    
    const deliveryId = deliveryResult.rows[0].id;
    
    try {
        // Prepare request
        const url = new URL(webhook.url);
        const isHttps = url.protocol === 'https:';
        const transport = isHttps ? https : http;
        
        const body = JSON.stringify({
            event: eventType,
            timestamp: new Date().toISOString(),
            data: payload
        });
        
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'X-Webhook-Event': eventType,
            'X-Webhook-Delivery': deliveryId,
            ...(webhook.headers || {})
        };
        
        // Add signature if secret is configured
        if (webhook.secret) {
            headers['X-Webhook-Signature'] = generateSignature(payload, webhook.secret);
        }
        
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method: 'POST',
            headers,
            timeout: 10000
        };
        
        // Make request
        const responseCode = await new Promise((resolve, reject) => {
            const req = transport.request(options, (res) => {
                let responseBody = '';
                res.on('data', chunk => responseBody += chunk);
                res.on('end', async () => {
                    // Update delivery record
                    await pool.query(`
                        UPDATE webhook_deliveries 
                        SET status = $1, response_code = $2, response_body = $3, 
                            delivered_at = NOW(), attempts = attempts + 1
                        WHERE id = $4
                    `, [res.statusCode < 300 ? 'success' : 'failed', res.statusCode, responseBody.substring(0, 1000), deliveryId]);
                    
                    resolve(res.statusCode);
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Request timeout')));
            req.write(body);
            req.end();
        });
        
        // Update webhook stats
        if (responseCode < 300) {
            await pool.query(`
                UPDATE webhooks SET success_count = success_count + 1, last_triggered_at = NOW()
                WHERE id = $1
            `, [webhookId]);
            return true;
        } else {
            await pool.query(`
                UPDATE webhooks SET failure_count = failure_count + 1
                WHERE id = $1
            `, [webhookId]);
            return false;
        }
        
    } catch (error) {
        // Log failure
        await pool.query(`
            UPDATE webhook_deliveries 
            SET status = 'failed', error_message = $1, attempts = attempts + 1
            WHERE id = $2
        `, [error.message, deliveryId]);
        
        await pool.query(`
            UPDATE webhooks SET failure_count = failure_count + 1
            WHERE id = $1
        `, [webhookId]);
        
        console.error(`[Webhook] Delivery failed: ${error.message}`);
        return false;
    }
};

/**
 * Fire webhooks for an event
 */
const fireEvent = async (hospitalId, eventType, payload) => {
    try {
        // Find all active webhooks for this event and hospital
        const result = await pool.query(`
            SELECT id FROM webhooks 
            WHERE hospital_id = $1 
              AND is_active = TRUE 
              AND $2 = ANY(events)
        `, [hospitalId, eventType]);
        
        const promises = result.rows.map(row => 
            deliverWebhook(row.id, eventType, payload)
        );
        
        await Promise.allSettled(promises);
        
        console.log(`[Webhook] Fired ${result.rows.length} webhooks for ${eventType}`);
    } catch (error) {
        console.error(`[Webhook] Failed to fire event ${eventType}:`, error.message);
    }
};

/**
 * Retry failed deliveries
 */
const retryFailedDeliveries = async () => {
    try {
        const result = await pool.query(`
            SELECT wd.id, wd.webhook_id, wd.event_type, wd.payload
            FROM webhook_deliveries wd
            JOIN webhooks w ON wd.webhook_id = w.id
            WHERE wd.status = 'failed' 
              AND wd.attempts < w.max_retries
              AND wd.created_at > NOW() - INTERVAL '24 hours'
        `);
        
        for (const delivery of result.rows) {
            await deliverWebhook(delivery.webhook_id, delivery.event_type, delivery.payload);
        }
        
        console.log(`[Webhook] Retried ${result.rows.length} failed deliveries`);
    } catch (error) {
        console.error('[Webhook] Retry failed:', error.message);
    }
};

/**
 * Get webhook event types
 */
const getEventTypes = async () => {
    const result = await pool.query('SELECT * FROM webhook_event_types ORDER BY event_name');
    return result.rows;
};

module.exports = {
    fireEvent,
    deliverWebhook,
    retryFailedDeliveries,
    getEventTypes,
    generateSignature
};
