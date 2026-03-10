/**
 * Auth Cache Middleware
 * 
 * Caches user session data to reduce database lookups
 * during JWT token verification.
 */

const cache = require('../config/cache');
const { TTL, PREFIX } = cache;

/**
 * Cache key for user session
 */
const sessionKey = (userId) => `${PREFIX.SESSION}${userId}`;

/**
 * Get cached user data
 */
const getCachedUser = async (userId) => {
    return cache.get(sessionKey(userId));
};

/**
 * Cache user data after successful authentication
 */
const cacheUser = async (user) => {
    const userData = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        hospital_id: user.hospital_id,
        hospital_name: user.hospital_name,
        department: user.department,
        staff_id: user.staff_id,
        cached_at: new Date().toISOString()
    };
    await cache.set(sessionKey(user.id), userData, TTL.SESSION);
    return userData;
};

/**
 * Invalidate user session cache (on logout or profile update)
 */
const invalidateUser = async (userId) => {
    await cache.del(sessionKey(userId));
};

/**
 * Invalidate all sessions for a hospital (for admin operations)
 */
const invalidateHospitalSessions = async (hospitalId) => {
    const pattern = `${PREFIX.SESSION}*`;
    // Note: This is expensive on Redis with many keys
    // Consider using Redis keyspace notifications or separate hospital session lists
    await cache.delPattern(pattern);
};

module.exports = {
    getCachedUser,
    cacheUser,
    invalidateUser,
    invalidateHospitalSessions
};
