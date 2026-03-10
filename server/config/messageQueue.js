/**
 * Wolf HMS Message Queue
 * 
 * Provides async message processing for high-scale operation:
 * - In-memory queue for development/small deployments
 * - Cloud Pub/Sub for production (1,000+ beds)
 * 
 * Topics:
 * - wolf-billing: Charge calculations, invoice generation
 * - wolf-lab-orders: LIMS integration, instrument dispatch
 * - wolf-notifications: SMS, Email, Push notifications
 * - wolf-inventory: Stock updates, low-stock alerts
 */

const EventEmitter = require('events');

// Message Queue Topics
const TOPICS = {
    BILLING: 'wolf-billing',
    LAB_ORDERS: 'wolf-lab-orders',
    NOTIFICATIONS: 'wolf-notifications',
    INVENTORY: 'wolf-inventory',
    CLINICAL: 'wolf-clinical',
};

// In-memory queue using EventEmitter
class MemoryQueue extends EventEmitter {
    constructor() {
        super();
        this.queues = {};
        this.processing = {};
        this.stats = {
            published: 0,
            processed: 0,
            failed: 0
        };
    }

    async publish(topic, message) {
        if (!this.queues[topic]) {
            this.queues[topic] = [];
        }

        const envelope = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            topic,
            data: message,
            timestamp: new Date().toISOString(),
            retries: 0
        };

        this.queues[topic].push(envelope);
        this.stats.published++;
        
        // Emit event for immediate processing
        this.emit(topic, envelope);
        
        return envelope.id;
    }

    subscribe(topic, handler) {
        this.on(topic, async (envelope) => {
            try {
                this.processing[envelope.id] = true;
                await handler(envelope.data, envelope);
                this.stats.processed++;
                delete this.processing[envelope.id];
                
                // Remove from queue after successful processing
                const idx = this.queues[topic]?.findIndex(m => m.id === envelope.id);
                if (idx > -1) {
                    this.queues[topic].splice(idx, 1);
                }
            } catch (error) {
                console.error(`[QUEUE] Error processing ${topic}:`, error.message);
                this.stats.failed++;
                envelope.retries++;
                
                // Retry up to 3 times with exponential backoff
                if (envelope.retries < 3) {
                    setTimeout(() => {
                        this.emit(topic, envelope);
                    }, Math.pow(2, envelope.retries) * 1000);
                }
            }
        });
        
        console.log(`[QUEUE] Subscribed to topic: ${topic}`);
    }

    getStats() {
        return {
            ...this.stats,
            pending: Object.values(this.queues).reduce((acc, q) => acc + q.length, 0),
            topics: Object.keys(this.queues)
        };
    }
}

// Cloud Pub/Sub wrapper
class PubSubQueue {
    constructor() {
        this.pubsub = null;
        this.subscriptions = {};
        this._init();
    }

    async _init() {
        try {
            const { PubSub } = require('@google-cloud/pubsub');
            this.pubsub = new PubSub();
            console.log('[QUEUE] Cloud Pub/Sub initialized');
        } catch (error) {
            console.log('[QUEUE] Pub/Sub not available, will use memory queue');
        }
    }

    async publish(topic, message) {
        if (!this.pubsub) {
            throw new Error('Pub/Sub not initialized');
        }

        const topicHandle = this.pubsub.topic(topic);
        const messageBuffer = Buffer.from(JSON.stringify(message));
        const messageId = await topicHandle.publishMessage({ data: messageBuffer });
        return messageId;
    }

    async subscribe(topic, handler) {
        if (!this.pubsub) {
            throw new Error('Pub/Sub not initialized');
        }

        const subscriptionName = `${topic}-sub`;
        const subscription = this.pubsub.subscription(subscriptionName);
        
        subscription.on('message', async (message) => {
            try {
                const data = JSON.parse(message.data.toString());
                await handler(data, message);
                message.ack();
            } catch (error) {
                console.error(`[PUBSUB] Error processing ${topic}:`, error.message);
                message.nack();
            }
        });

        subscription.on('error', (error) => {
            console.error(`[PUBSUB] Subscription error ${topic}:`, error.message);
        });

        this.subscriptions[topic] = subscription;
        console.log(`[PUBSUB] Subscribed to: ${subscriptionName}`);
    }
}

// MessageQueue Manager (auto-selects backend)
class MessageQueue {
    constructor() {
        this.backend = null;
        this.usePubSub = process.env.USE_PUBSUB === 'true';
        this._init();
    }

    _init() {
        if (this.usePubSub) {
            try {
                this.backend = new PubSubQueue();
                console.log('[QUEUE] Using Cloud Pub/Sub');
            } catch (error) {
                console.log('[QUEUE] Pub/Sub failed, falling back to memory queue');
                this.backend = new MemoryQueue();
            }
        } else {
            this.backend = new MemoryQueue();
            console.log('[QUEUE] Using in-memory message queue');
        }
    }

    async publish(topic, message) {
        return this.backend.publish(topic, message);
    }

    subscribe(topic, handler) {
        return this.backend.subscribe(topic, handler);
    }

    getStats() {
        return this.backend.getStats?.() || {};
    }
}

// Singleton instance
const queue = new MessageQueue();

// Export
module.exports = queue;
module.exports.TOPICS = TOPICS;
module.exports.MessageQueue = MessageQueue;
