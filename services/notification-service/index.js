/**
 * Wolf HMS - Notification Service
 * 
 * Dedicated microservice for all notifications:
 * - SMS (via Twilio, MSG91)
 * - Email (via SendGrid, SES)
 * - Push notifications (Socket.IO)
 * - Emergency broadcasts
 * 
 * Run standalone: node services/notification-service/index.js
 * Port: 5003 (configurable via NOTIFY_PORT)
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Shared utilities
const shared = require('../shared');
const { db, queue, TOPICS, logger } = shared;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const PORT = process.env.NOTIFY_PORT || 5003;

app.use(cors());
app.use(express.json());

// Make io globally available for workers
global.io = io;

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        service: 'wolf-notification',
        status: 'healthy',
        connectedClients: io.engine.clientsCount,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// SOCKET.IO HANDLERS
// ============================================

io.on('connection', (socket) => {
    logger.info('NOTIFY', `Client connected: ${socket.id}`);
    
    // Join hospital room
    socket.on('join_hospital', (hospitalId) => {
        socket.join(`hospital:${hospitalId}`);
        logger.info('NOTIFY', `Socket ${socket.id} joined hospital ${hospitalId}`);
    });
    
    // Join ward room
    socket.on('join_ward', (wardId) => {
        socket.join(`ward:${wardId}`);
    });
    
    // Join user-specific room
    socket.on('join_user', (userId) => {
        socket.join(`user:${userId}`);
    });
    
    socket.on('disconnect', () => {
        logger.info('NOTIFY', `Client disconnected: ${socket.id}`);
    });
});

// ============================================
// NOTIFICATION ROUTES
// ============================================

// Send notification
app.post('/api/notify/send', async (req, res) => {
    try {
        const { type, recipient, message, priority, hospital_id } = req.body;
        
        // Queue notification
        const messageId = await queue.publish(TOPICS.NOTIFICATIONS, {
            type,
            recipient,
            message,
            priority,
            hospital_id
        });
        
        res.json({ success: true, messageId });
    } catch (err) {
        logger.error('NOTIFY', 'Failed to queue notification', err);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// Send push to specific user
app.post('/api/notify/push/:userId', (req, res) => {
    const { userId } = req.params;
    const { message, type, data } = req.body;
    
    io.to(`user:${userId}`).emit('notification', {
        type: type || 'info',
        message,
        data,
        timestamp: new Date()
    });
    
    res.json({ success: true, userId });
});

// Broadcast to hospital
app.post('/api/notify/broadcast/:hospitalId', (req, res) => {
    const { hospitalId } = req.params;
    const { message, type, code } = req.body;
    
    io.to(`hospital:${hospitalId}`).emit('broadcast', {
        type: type || 'info',
        message,
        code,
        timestamp: new Date()
    });
    
    logger.info('NOTIFY', `Broadcast to hospital ${hospitalId}: ${message}`);
    res.json({ success: true, hospitalId });
});

// Emergency broadcast
app.post('/api/notify/emergency', (req, res) => {
    const { hospital_id, code, message, location } = req.body;
    
    // Broadcast to all clients in hospital
    io.to(`hospital:${hospital_id}`).emit('emergency_broadcast', {
        code,
        message,
        location,
        timestamp: new Date()
    });
    
    // Also broadcast globally for critical emergencies
    if (code === 'CODE_BLUE' || code === 'FIRE') {
        io.emit('emergency_broadcast', {
            code,
            message,
            location,
            timestamp: new Date()
        });
    }
    
    logger.info('NOTIFY', `EMERGENCY ${code}: ${message} at ${location}`);
    res.json({ success: true, code });
});

// Clinical update (for real-time dashboards)
app.post('/api/notify/clinical', (req, res) => {
    const { hospital_id, ward_id, type, data } = req.body;
    
    const event = {
        type,
        data,
        timestamp: new Date()
    };
    
    if (ward_id) {
        io.to(`ward:${ward_id}`).emit('clinical_update', event);
    } else {
        io.to(`hospital:${hospital_id}`).emit('clinical_update', event);
    }
    
    res.json({ success: true });
});

// ============================================
// NOTIFICATION WORKER REGISTRATION
// ============================================

function registerNotificationWorker() {
    queue.subscribe(TOPICS.NOTIFICATIONS, async (data) => {
        const { type, recipient, message, priority, hospital_id } = data;
        
        logger.info('NOTIFY', `Processing ${type} notification`);
        
        switch (type) {
            case 'sms':
                // TODO: Integrate with SMS provider
                logger.info('NOTIFY', `[SMS] To: ${recipient}, Message: ${message}`);
                break;
                
            case 'email':
                // TODO: Integrate with email provider
                logger.info('NOTIFY', `[EMAIL] To: ${recipient}`);
                break;
                
            case 'push':
                io.to(`hospital:${hospital_id}`).emit('notification', {
                    type: priority || 'info',
                    message,
                    timestamp: new Date()
                });
                break;
                
            case 'emergency':
                io.emit('emergency_broadcast', {
                    message,
                    code: data.code,
                    location: data.location,
                    timestamp: new Date()
                });
                break;
        }
    });
    
    logger.info('NOTIFY', 'Notification worker registered');
}

// ============================================
// START SERVER
// ============================================

if (require.main === module) {
    registerNotificationWorker();
    
    server.listen(PORT, () => {
        logger.info('NOTIFY', `Service running on port ${PORT}`);
        logger.info('NOTIFY', `Socket.IO ready for connections`);
    });
}

module.exports = { app, server, io };
