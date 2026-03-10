/**
 * Webhook Routes
 * API endpoints for webhook management
 * Phase 2: API & Integration Layer (Gold Standard HMS)
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');
const webhookService = require('../services/webhookService');
const { validate, schemas } = require('../middleware/gatewayMiddleware');
const Joi = require('joi');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// All routes require admin access
router.use(protect);
router.use(authorize('admin'));

/**
 * GET /api/webhooks
 * List all webhooks for the hospital
 */
router.get('/', asyncHandler(async (req, res) => {
    const result = await pool.query(`
        SELECT id, name, url, events, is_active, 
               success_count, failure_count, last_triggered_at,
               created_at
        FROM webhooks
        WHERE hospital_id = $1
        ORDER BY created_at DESC
    `, [req.hospital_id]);
    
    ResponseHandler.success(res, { webhooks: result.rows });
}));

/**
 * GET /api/webhooks/events
 * Get available event types
 */
router.get('/events', asyncHandler(async (req, res) => {
    const events = await webhookService.getEventTypes();
    ResponseHandler.success(res, { events });
}));

// Validation schema for webhook creation
const webhookSchema = Joi.object({
    name: Joi.string().required().max(100),
    url: Joi.string().uri().required(),
    secret: Joi.string().optional(),
    events: Joi.array().items(Joi.string()).min(1).required(),
    headers: Joi.object().optional()
});

/**
 * POST /api/webhooks
 * Create a new webhook
 */
router.post('/', validate(webhookSchema), asyncHandler(async (req, res) => {
    const { name, url, secret, events, headers } = req.body;
    
    const result = await pool.query(`
        INSERT INTO webhooks (hospital_id, name, url, secret, events, headers)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, url, events, is_active, created_at
    `, [req.hospital_id, name, url, secret, events, headers || {}]);
    
    ResponseHandler.success(res, { 
        message: 'Webhook created successfully',
        webhook: result.rows[0]
    }, 'Webhook created successfully', 201);
}));

/**
 * PUT /api/webhooks/:id
 * Update a webhook
 */
router.put('/:id', validate(webhookSchema), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, url, secret, events, headers } = req.body;
    
    const result = await pool.query(`
        UPDATE webhooks 
        SET name = $1, url = $2, secret = COALESCE($3, secret), 
            events = $4, headers = $5, updated_at = NOW()
        WHERE id = $6 AND hospital_id = $7
        RETURNING id, name, url, events, is_active
    `, [name, url, secret, events, headers || {}, id, req.hospital_id]);
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Webhook not found', 404);
    }
    
    ResponseHandler.success(res, { 
        message: 'Webhook updated successfully',
        webhook: result.rows[0]
    });
}));

/**
 * DELETE /api/webhooks/:id
 * Delete a webhook
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const result = await pool.query(`
        DELETE FROM webhooks WHERE id = $1 AND hospital_id = $2
        RETURNING id
    `, [req.params.id, req.hospital_id]);
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Webhook not found', 404);
    }
    
    ResponseHandler.success(res, { message: 'Webhook deleted successfully' });
}));

/**
 * POST /api/webhooks/:id/toggle
 * Enable/disable a webhook
 */
router.post('/:id/toggle', asyncHandler(async (req, res) => {
    const result = await pool.query(`
        UPDATE webhooks SET is_active = NOT is_active, updated_at = NOW()
        WHERE id = $1 AND hospital_id = $2
        RETURNING id, is_active
    `, [req.params.id, req.hospital_id]);
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Webhook not found', 404);
    }
    
    ResponseHandler.success(res, { 
        message: result.rows[0].is_active ? 'Webhook enabled' : 'Webhook disabled',
        is_active: result.rows[0].is_active
    });
}));

/**
 * POST /api/webhooks/:id/test
 * Send a test webhook
 */
router.post('/:id/test', asyncHandler(async (req, res) => {
    const testPayload = {
        test: true,
        message: 'This is a test webhook from Wolf HMS',
        timestamp: new Date().toISOString()
    };
    
    const success = await webhookService.deliverWebhook(
        req.params.id, 
        'test.event', 
        testPayload
    );
    
    ResponseHandler.success(res, { 
        message: success ? 'Test webhook sent successfully' : 'Test webhook failed',
        success
    });
}));

/**
 * GET /api/webhooks/:id/deliveries
 * Get delivery history for a webhook
 */
router.get('/:id/deliveries', asyncHandler(async (req, res) => {
    const result = await pool.query(`
        SELECT id, event_type, status, response_code, 
               error_message, created_at, delivered_at, attempts
        FROM webhook_deliveries
        WHERE webhook_id = $1
        ORDER BY created_at DESC
        LIMIT 50
    `, [req.params.id]);
    
    ResponseHandler.success(res, { deliveries: result.rows });
}));

module.exports = router;
