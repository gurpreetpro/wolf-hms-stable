/**
 * API Response Helpers
 * Standardized response format for all API endpoints
 */

/**
 * Success response
 * @param {Response} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

/**
 * Created response (201)
 */
const created = (res, data, message = 'Created successfully') => {
    return success(res, data, message, 201);
};

/**
 * Error response
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {any} details - Additional error details
 */
const error = (res, message = 'Server error', statusCode = 500, details = null) => {
    const response = {
        success: false,
        error: message,
        timestamp: new Date().toISOString()
    };
    if (details) response.details = details;
    return res.status(statusCode).json(response);
};

/**
 * Common error responses
 */
const badRequest = (res, message = 'Bad request', details = null) => 
    error(res, message, 400, details);

const unauthorized = (res, message = 'Unauthorized') => 
    error(res, message, 401);

const forbidden = (res, message = 'Forbidden') => 
    error(res, message, 403);

const notFound = (res, message = 'Not found') => 
    error(res, message, 404);

const conflict = (res, message = 'Conflict') => 
    error(res, message, 409);

const serverError = (res, message = 'Internal server error', details = null) => 
    error(res, message, 500, details);

/**
 * Paginated response
 */
const paginated = (res, data, page, limit, total) => {
    return res.status(200).json({
        success: true,
        data,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
        },
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    success,
    created,
    error,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    conflict,
    serverError,
    paginated
};
