const { Queue } = require('bullmq');

// Redis Connection Options
const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
};

// Singleton Map to hold queue instances
const queues = {};

/**
 * Get or Create a Queue
 * @param {string} queueName 
 * @returns {Queue}
 */
const getQueue = (queueName) => {
    if (!queues[queueName]) {
        queues[queueName] = new Queue(queueName, {
            connection: redisOptions,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                },
                removeOnComplete: true, // Auto-cleanup
                removeOnFail: 100 // Keep last 100 failed jobs for debugging
            }
        });
        console.log(`[Queue] Initialized: ${queueName}`);
    }
    return queues[queueName];
};

module.exports = { getQueue };
