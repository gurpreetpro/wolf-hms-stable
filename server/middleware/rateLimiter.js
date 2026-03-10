const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../services/redisClient');

// Fallback memory store if Redis fails
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    // Use Redis store if connected, otherwise default memory store
    store: redisClient.isOpen ? new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    }) : undefined,
    message: {
        status: 429,
        message: "Too many requests, please try again later."
    }
});

module.exports = limiter;
