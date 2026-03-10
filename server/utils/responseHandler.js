class ResponseHandler {
    static success(res, data, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data
        });
    }

    static error(res, message = 'Internal Server Error', statusCode = 500, error = null) {
        const response = {
            success: false,
            message
        };

        // FAIL-SAFE: Check for 'production' substring to handle variations (e.g. whitespace, suffixes)
        const isProduction = process.env.NODE_ENV && process.env.NODE_ENV.includes('production');

        if (error && !isProduction) {
            response.error = error.message || error;
            response.stack = error.stack;
        } else if (error) {
            // PRODUCTION: Log error internally, return generic message to client
            console.error('[ResponseHandler] Internal Error:', error.message);
            // DO NOT leak error details to client in production
        }

        return res.status(statusCode).json(response);
    }
}

module.exports = ResponseHandler;
