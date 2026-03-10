const redisClient = require('../services/redisClient');

/**
 * Cache Middleware
 * @param {number} durationSeconds - How long to cache the response (default: 60s)
 */
const cache = (durationSeconds = 60) => {
    return async (req, res, next) => {
        // Skip caching if Redis is not ready
        if (!redisClient.isOpen) {
            return next();
        }

        // Create a unique key based on the request URL
        const key = `cache:${req.originalUrl || req.url}`;

        try {
            const cachedData = await redisClient.get(key);

            if (cachedData) {
                // Return cached response
                return res.json(JSON.parse(cachedData));
            } else {
                // Hook into res.json to capture the response
                const originalJson = res.json;
                res.json = (body) => {
                    // Start async cache set (don't await to avoid blocking response)
                    redisClient.set(key, JSON.stringify(body), {
                        EX: durationSeconds
                    }).catch(err => console.error('[Cache Set Error]', err));

                    // Send the response
                    originalJson.call(res, body);
                };
                next();
            }
        } catch (err) {
            console.error('[Cache Get Error]', err);
            next();
        }
    };
};

module.exports = { cache };
