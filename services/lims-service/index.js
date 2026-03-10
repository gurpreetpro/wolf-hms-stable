/**
 * Wolf HMS - LIMS Service
 * 
 * Dedicated microservice for Laboratory Information Management:
 * - TCP listener for lab instruments (HL7, ASTM)
 * - Lab order processing
 * - Result validation and posting
 * 
 * Run standalone: node services/lims-service/index.js
 * Port: 5001 (configurable via LIMS_PORT)
 */

const express = require('express');
const cors = require('cors');
const net = require('net');

// Shared utilities
const shared = require('../shared');
const { db, queue, TOPICS, logger } = shared;

const app = express();
const PORT = process.env.LIMS_PORT || 5001;
const TCP_PORT = process.env.LIMS_TCP_PORT || 5501;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        service: 'wolf-lims',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// LAB ORDER ROUTES
// ============================================

// Get pending lab orders
app.get('/api/lims/orders', async (req, res) => {
    try {
        const result = await db.replicaPool.query(`
            SELECT lr.*, p.name as patient_name, ltt.name as test_name
            FROM lab_requests lr
            JOIN patients p ON lr.patient_id = p.id
            JOIN lab_test_types ltt ON lr.test_id = ltt.id
            WHERE lr.status = 'Pending'
            ORDER BY lr.requested_at DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) {
        logger.error('LIMS', 'Failed to fetch orders', err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Receive result from instrument
app.post('/api/lims/results', async (req, res) => {
    const { request_id, test_code, results, instrument_id } = req.body;
    
    try {
        // Insert result
        await db.primaryPool.query(`
            INSERT INTO lab_results (request_id, result_value, result_unit, instrument_id, created_at)
            VALUES ($1, $2, $3, $4, NOW())
        `, [request_id, JSON.stringify(results), results.unit, instrument_id]);
        
        // Update request status
        await db.primaryPool.query(`
            UPDATE lab_requests SET status = 'Completed', completed_at = NOW()
            WHERE id = $1
        `, [request_id]);
        
        // Queue notification
        await queue.publish(TOPICS.NOTIFICATIONS, {
            type: 'push',
            priority: 'info',
            message: `Lab result ready: ${test_code}`
        });
        
        logger.info('LIMS', `Result posted for request ${request_id}`);
        res.json({ success: true, request_id });
    } catch (err) {
        logger.error('LIMS', 'Failed to post result', err);
        res.status(500).json({ error: 'Failed to post result' });
    }
});

// ============================================
// TCP LISTENER FOR INSTRUMENTS
// ============================================

const tcpServer = net.createServer((socket) => {
    logger.info('LIMS', `Instrument connected: ${socket.remoteAddress}`);
    
    let buffer = '';
    
    socket.on('data', (data) => {
        buffer += data.toString();
        
        // Check for complete message (HL7 uses \r as delimiter)
        if (buffer.includes('\r')) {
            const messages = buffer.split('\r');
            buffer = messages.pop(); // Keep incomplete message
            
            messages.forEach(async (msg) => {
                if (msg.trim()) {
                    await processInstrumentMessage(msg, socket);
                }
            });
        }
    });
    
    socket.on('error', (err) => {
        logger.error('LIMS', 'Socket error', err);
    });
    
    socket.on('close', () => {
        logger.info('LIMS', 'Instrument disconnected');
    });
});

async function processInstrumentMessage(message, socket) {
    logger.info('LIMS', `Received: ${message.substring(0, 50)}...`);
    
    try {
        // Parse HL7/ASTM message (simplified)
        if (message.startsWith('MSH|')) {
            // HL7 message
            const segments = message.split('|');
            const messageType = segments[8]; // MSH-9
            
            if (messageType === 'ORU^R01') {
                // Observation Result
                await handleHL7Result(message);
            }
            
            // Send ACK
            socket.write('MSH|^~\\&|WOLFHMS|ACK|' + new Date().toISOString() + '\r');
        } else if (message.startsWith('H|')) {
            // ASTM message
            await handleASTMMessage(message);
            socket.write('ACK\r');
        }
    } catch (err) {
        logger.error('LIMS', 'Message processing error', err);
    }
}

async function handleHL7Result(message) {
    // Parse HL7 OBX segments for results
    const lines = message.split('\n');
    const obxLines = lines.filter(l => l.startsWith('OBX|'));
    
    for (const obx of obxLines) {
        const fields = obx.split('|');
        const testCode = fields[3];
        const value = fields[5];
        const unit = fields[6];
        const status = fields[11];
        
        logger.info('LIMS', `HL7 Result: ${testCode} = ${value} ${unit}`);
        
        // Queue for processing
        await queue.publish(TOPICS.LAB_ORDERS, {
            action: 'result_received',
            test_code: testCode,
            value,
            unit,
            status,
            source: 'HL7'
        });
    }
}

async function handleASTMMessage(message) {
    logger.info('LIMS', 'ASTM message received');
    // Implement ASTM parsing as needed
}

// ============================================
// START SERVERS
// ============================================

if (require.main === module) {
    // HTTP API Server
    app.listen(PORT, () => {
        logger.info('LIMS', `HTTP API running on port ${PORT}`);
    });
    
    // TCP Instrument Server
    tcpServer.listen(TCP_PORT, () => {
        logger.info('LIMS', `TCP Instrument listener on port ${TCP_PORT}`);
    });
}

module.exports = { app, tcpServer };
