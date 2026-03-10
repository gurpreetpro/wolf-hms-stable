/**
 * API Gateway Middleware
 * Centralized request handling: auth verification, validation, analytics
 * Phase 2: API & Integration Layer (Gold Standard HMS)
 */

const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const Joi = require('joi');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

// API Usage tracking (in-memory, flush to DB periodically)
const usageStats = new Map();
let lastFlush = Date.now();
const FLUSH_INTERVAL = 60000; // 1 minute

/**
 * Track API usage per hospital
 */
const trackUsage = (hospitalId, endpoint, method) => {
    const key = `${hospitalId || 'platform'}:${method}:${endpoint}`;
    usageStats.set(key, (usageStats.get(key) || 0) + 1);

    // Flush to DB periodically
    if (Date.now() - lastFlush > FLUSH_INTERVAL) {
        flushUsageStats();
    }
};

/**
 * Flush usage stats to database
 */
const flushUsageStats = async () => {
    if (usageStats.size === 0) return;
    
    const entries = [...usageStats.entries()];
    usageStats.clear();
    lastFlush = Date.now();

    try {
        for (const [key, count] of entries) {
            const [hospitalId, method, endpoint] = key.split(':');
            await pool.query(`
                INSERT INTO api_usage_stats (hospital_id, endpoint, method, count, period_start)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (hospital_id, endpoint, method, period_start)
                DO UPDATE SET count = api_usage_stats.count + $4
            `, [hospitalId === 'platform' ? null : hospitalId, endpoint, method, count]);
        }
    } catch (error) {
        console.error('[Gateway] Failed to flush usage stats:', error.message);
    }
};

/**
 * Common validation schemas
 */
const schemas = {
    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sort: Joi.string().optional(),
        order: Joi.string().valid('asc', 'desc').default('desc')
    }),
    
    uuid: Joi.string().uuid({ version: 'uuidv4' }),
    
    dateRange: Joi.object({
        from: Joi.date().iso(),
        to: Joi.date().iso().greater(Joi.ref('from'))
    })
};

/**
 * Validate request body/query against a Joi schema
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const data = source === 'body' ? req.body : 
                     source === 'query' ? req.query : req.params;
        
        const { error, value } = schema.validate(data, { 
            abortEarly: false,
            stripUnknown: true 
        });
        
        if (error) {
            const details = error.details.map(d => ({
                field: d.path.join('.'),
                message: d.message
            }));
            
            return res.status(400).json({
                error: 'Validation failed',
                details
            });
        }
        
        // Replace with validated/sanitized data
        if (source === 'body') req.body = value;
        else if (source === 'query') req.query = value;
        else req.params = value;
        
        next();
    };
};

/**
 * API Gateway middleware - apply to all /api/v1/ routes
 */
const gatewayMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    // Extract API version
    const versionMatch = req.path.match(/\/api\/(v\d+)/);
    req.apiVersion = versionMatch ? versionMatch[1] : 'v1';
    
    // Add request ID for tracing
    req.requestId = req.headers['x-request-id'] || 
                    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-Id', req.requestId);
    
    // Add deprecation headers for old endpoints
    if (!versionMatch && req.path.startsWith('/api/')) {
        res.setHeader('Deprecation', 'true');
        res.setHeader('Sunset', '2025-06-30');
        res.setHeader('Link', '</api/v1' + req.path.replace('/api', '') + '>; rel="successor-version"');
    }
    
    // Track response time
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Track usage
        const endpoint = req.path.replace(/\/[a-f0-9-]{36}/gi, '/:id')
                              .replace(/\/\d+/g, '/:id');
        trackUsage(req.hospital_id, endpoint, req.method);
        
        // Log slow requests
        if (duration > 1000) {
            console.warn(`[Gateway] Slow request: ${req.method} ${req.path} - ${duration}ms`);
        }
    });
    
    next();
};

/**
 * Create versioned router wrapper
 */
const createVersionedRouter = (version = 'v1') => {
    const express = require('express');
    const router = express.Router();
    
    // Apply gateway middleware to all routes
    router.use(gatewayMiddleware);
    
    return router;
};

/**
 * Get API usage stats for a hospital
 */
const getUsageStats = async (hospitalId, days = 7) => {
    try {
        const result = await pool.query(`
            SELECT endpoint, method, SUM(count) as total_calls,
                   DATE(period_start) as date
            FROM api_usage_stats
            WHERE (hospital_id = $1 OR $1 IS NULL)
              AND period_start > NOW() - INTERVAL '${days} days'
            GROUP BY endpoint, method, DATE(period_start)
            ORDER BY total_calls DESC
        `, [hospitalId]);
        
        return result.rows;
    } catch (error) {
        console.error('[Gateway] Failed to get usage stats:', error.message);
        return [];
    }
};

module.exports = {
    gatewayMiddleware,
    validate,
    schemas,
    createVersionedRouter,
    getUsageStats,
    trackUsage,
    flushUsageStats
};
