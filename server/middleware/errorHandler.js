const { v4: uuidv4 } = require('uuid');
const logger = require('../services/Logger');

/**
 * Global Error Handler Middleware
 * Catches all unhandled errors and returns consistent responses
 */

/**
 * Request ID Middleware
 * Assigns unique ID to each request for tracking
 */
const requestIdMiddleware = (req, res, next) => {
    req.requestId = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-ID', req.requestId);
    next();
};

/**
 * Request Logger Middleware
 * Logs all incoming requests with timing
 */
const requestLoggerMiddleware = (req, res, next) => {
    const startTime = Date.now();

    // Log on response finish
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
        logger.http(message);
    });

    next();
};

/**
 * Error Categories
 */
const ERROR_CATEGORIES = {
    VALIDATION: { code: 'VALIDATION_ERROR', status: 400 },
    AUTHENTICATION: { code: 'AUTH_ERROR', status: 401 },
    AUTHORIZATION: { code: 'FORBIDDEN', status: 403 },
    NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
    CONFLICT: { code: 'CONFLICT', status: 409 },
    DATABASE: { code: 'DATABASE_ERROR', status: 500 },
    EXTERNAL: { code: 'EXTERNAL_SERVICE_ERROR', status: 502 },
    UNKNOWN: { code: 'INTERNAL_ERROR', status: 500 }
};

/**
 * Categorize error based on type/message
 */
const categorizeError = (error) => {
    const message = error.message?.toLowerCase() || '';

    if (error.name === 'ValidationError' || message.includes('validation')) {
        return ERROR_CATEGORIES.VALIDATION;
    }
    if (error.name === 'UnauthorizedError' || message.includes('unauthorized') || message.includes('token')) {
        return ERROR_CATEGORIES.AUTHENTICATION;
    }
    if (message.includes('forbidden') || message.includes('permission')) {
        return ERROR_CATEGORIES.AUTHORIZATION;
    }
    if (message.includes('not found') || error.status === 404) {
        return ERROR_CATEGORIES.NOT_FOUND;
    }
    if (error.code === '23505' || message.includes('duplicate')) {
        return ERROR_CATEGORIES.CONFLICT;
    }
    if (error.code?.startsWith('22') || error.code?.startsWith('23') || message.includes('database')) {
        return ERROR_CATEGORIES.DATABASE;
    }
    if (message.includes('econnrefused') || message.includes('timeout')) {
        return ERROR_CATEGORIES.EXTERNAL;
    }

    return ERROR_CATEGORIES.UNKNOWN;
};

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
    const category = categorizeError(err);
    const isProduction = process.env.NODE_ENV === 'production';

    // Log the error
    logger.error(err.message, {
        requestId: req.requestId,
        category: category.code,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        user: req.user?.id
    });

    // Build response
    const response = {
        success: false,
        error: {
            code: category.code,
            message: err.message
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
    };

    // Include stack trace in development
    if (!isProduction && err.stack) {
        response.error.stack = err.stack.split('\n').slice(0, 5);
    }

    // Send response
    res.status(err.status || category.status).json(response);
};

/**
 * 404 Handler
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
    });
};

/**
 * Async Handler Wrapper
 * Catches async errors and passes to error handler
 */
const asyncHandler = (fn) => (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    requestIdMiddleware,
    requestLoggerMiddleware,
    errorHandler,
    notFoundHandler,
    asyncHandler,
    ERROR_CATEGORIES
};
