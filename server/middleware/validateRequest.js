const { z } = require('zod');

/**
 * Middleware factory to validate request body against a Zod schema.
 * @param {z.ZodSchema} schema - The Zod schema to validate against.
 * @returns {Function} Express middleware.
 */
const validateRequest = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        const issues = error.issues || error.errors;
        if (error instanceof z.ZodError || (issues && Array.isArray(issues))) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request data',
                errors: (issues || []).map(e => ({
                    field: (e.path || []).join('.'),
                    message: e.message || 'Invalid value'
                }))
            });
        }
        next(error);
    }
};

module.exports = validateRequest;
