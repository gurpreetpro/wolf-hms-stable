const { Worker } = require('bullmq');

const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
};

/**
 * Initialize Email Worker
 */
const initEmailWorker = () => {
    const worker = new Worker('emailQueue', async job => {
        console.log(`[Worker] Processing email job: ${job.id}`);
        const { to, subject, body } = job.data;

        // Simulate email sending (replace with Nodemailer/SendGrid later)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`[Worker] Email sent to ${to} (${subject})`);
        return { sent: true, timestamp: Date.now() };

    }, {
        connection: redisOptions,
        concurrency: 5 // Process 5 emails in parallel
    });

    worker.on('completed', job => {
        console.log(`[Worker] Job ${job.id} completed!`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[Worker] Job ${job.id} failed: ${err.message}`);
    });

    worker.on('error', err => {
        console.error('[Worker] Redis connection error:', err.message);
        // Do not crash, just log. BullMQ will try to reconnect.
    });

    console.log('[Worker] Email Worker listening for jobs...');
    return worker;
};

// Start worker immediately if run directly
if (require.main === module) {
    initEmailWorker();
}

module.exports = { initEmailWorker };
