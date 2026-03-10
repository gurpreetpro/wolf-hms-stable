const { createClient } = require('redis');

// Default to local if not provided (e.g. dev mode without docker)
// In Docker, this will be 'redis://redis:6379'
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const client = createClient({
    url: REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 20) {
                console.error('[Redis] Max retries reached. Giving up.');
                return new Error('Redis connection failed');
            }
            // Exponential backoff: 500ms, 1000ms, 2000ms... up to 3s cap
            const delay = Math.min(retries * 500, 3000); 
            console.log(`[Redis] Reconnecting in ${delay}ms...`);
            return delay;
        }
    }
});

client.on('error', (err) => console.error('[Redis Client Error]', err));
client.on('connect', () => console.log('[Redis] Connected to Redis'));

// Connect immediately
// Connect immediately
// (async () => {
//     try {
//         await client.connect();
//     } catch (err) {
//         console.error('[Redis] Initial connection compilation failed', err);
//     }
// })();

module.exports = client;
