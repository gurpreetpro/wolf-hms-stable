const Logger = require('../services/Logger');

const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Log response on finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - ${req.ip}`;
        
        if (res.statusCode >= 500) {
            Logger.error(message);
        } else if (res.statusCode >= 400) {
            Logger.warn(message);
        } else {
            Logger.http(message);
        }
    });

    next();
};

module.exports = requestLogger;
