/**
 * Wolf HMS - Chat Routes (Expanded)
 * 
 * Full messaging API for patient-doctor communication
 * Supports Wolf Care patient app real-time chat
 * 
 * Endpoints:
 * - GET  /api/chat/threads           - Get doctor's chat threads
 * - POST /api/chat/threads           - Start new thread
 * - GET  /api/chat/threads/:id       - Get thread messages
 * - POST /api/chat/send              - Send message
 * - POST /api/chat/read              - Mark messages as read
 * - GET  /api/chat/unread            - Get unread count
 * - PUT  /api/chat/threads/:id/close - Close thread
 * - GET  /api/chat/quick-replies     - Get quick reply templates
 * - POST /api/chat/quick-replies     - Add quick reply
 * 
 * Socket.IO Events:
 * - join_thread, send_message, typing, mark_read
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken } = require('../services/otpAuthService');

// ====================
// Middleware: Patient Auth (for Wolf Care app)
// ====================
const authenticatePatient = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        req.patient = decoded;
        req.userType = 'patient';
        next();
    } catch (err) {
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// ====================
// GET /threads - Get chat threads (for doctor dashboard)
// ====================
router.get('/threads', async (req, res) => {
    try {
        const doctorId = req.query.doctor_id || req.user?.id;
        const { status = 'active', limit = 50 } = req.query;
        
        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID required' });
        }
        
        const result = await pool.query(`
            SELECT 
                ct.id, ct.patient_id, ct.doctor_id, ct.subject, ct.status,
                ct.last_message_at, ct.unread_doctor, ct.created_at,
                p.name as patient_name, p.phone as patient_phone,
                (SELECT content FROM chat_messages WHERE thread_id = ct.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM chat_threads ct
            JOIN patients p ON ct.patient_id = p.id
            WHERE ct.doctor_id = $1 AND ($2 = 'all' OR ct.status = $2)
            ORDER BY ct.last_message_at DESC NULLS LAST, ct.created_at DESC
            LIMIT $3
        `, [doctorId, status, limit]);
        
        res.json({
            success: true,
            threads: result.rows
        });
        
    } catch (err) {
        console.error('[CHAT] Get threads error:', err);
        res.status(500).json({ error: 'Failed to fetch threads' });
    }
});

// ====================
// POST /threads - Start new thread
// ====================
router.post('/threads', authenticatePatient, async (req, res) => {
    try {
        const { doctor_id, appointment_id, subject, initial_message } = req.body;
        const patientId = req.patient.id;
        const hospitalId = req.patient.hospital_id || 1;
        
        if (!doctor_id) {
            return res.status(400).json({ error: 'Doctor ID required' });
        }
        
        // Check for existing active thread
        const existing = await pool.query(`
            SELECT id FROM chat_threads 
            WHERE patient_id = $1 AND doctor_id = $2 AND status = 'active'
        `, [patientId, doctor_id]);
        
        if (existing.rows.length > 0) {
            return res.json({
                success: true,
                thread_id: existing.rows[0].id,
                message: 'Existing thread found'
            });
        }
        
        // Create new thread
        const thread = await pool.query(`
            INSERT INTO chat_threads (patient_id, doctor_id, appointment_id, subject, hospital_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [patientId, doctor_id, appointment_id, subject, hospitalId]);
        
        const threadId = thread.rows[0].id;
        
        // Add initial message if provided
        if (initial_message) {
            await pool.query(`
                INSERT INTO chat_messages (thread_id, sender_type, sender_id, content)
                VALUES ($1, 'patient', $2, $3)
            `, [threadId, patientId, initial_message]);
        }
        
        // Emit Socket.IO event for real-time notification
        if (req.io) {
            req.io.to(`doctor_${doctor_id}`).emit('new_thread', {
                thread_id: threadId,
                patient_id: patientId,
                subject
            });
        }
        
        res.json({
            success: true,
            thread_id: threadId,
            message: 'Thread created successfully'
        });
        
    } catch (err) {
        console.error('[CHAT] Create thread error:', err);
        res.status(500).json({ error: 'Failed to create thread' });
    }
});

// ====================
// GET /threads/:id - Get thread messages
// ====================
router.get('/threads/:id', async (req, res) => {
    try {
        const threadId = req.params.id;
        const { limit = 100, before } = req.query;
        
        // Get thread info
        const thread = await pool.query(`
            SELECT ct.*, p.name as patient_name, u.username as doctor_name
            FROM chat_threads ct
            JOIN patients p ON ct.patient_id = p.id
            JOIN users u ON ct.doctor_id = u.id
            WHERE ct.id = $1
        `, [threadId]);
        
        if (thread.rows.length === 0) {
            return res.status(404).json({ error: 'Thread not found' });
        }
        
        // Get messages
        let messagesQuery = `
            SELECT id, sender_type, sender_id, content, message_type, 
                   attachment_url, attachment_name, is_read, created_at
            FROM chat_messages
            WHERE thread_id = $1
        `;
        const params = [threadId];
        
        if (before) {
            messagesQuery += ` AND created_at < $2`;
            params.push(before);
        }
        
        messagesQuery += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        
        const messages = await pool.query(messagesQuery, params);
        
        res.json({
            success: true,
            thread: thread.rows[0],
            messages: messages.rows.reverse() // Chronological order
        });
        
    } catch (err) {
        console.error('[CHAT] Get messages error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// ====================
// POST /send - Send message
// ====================
router.post('/send', async (req, res) => {
    try {
        const { thread_id, content, message_type = 'text', attachment_url, attachment_name } = req.body;
        
        // Determine sender from auth
        let senderType, senderId;
        
        if (req.patient) {
            senderType = 'patient';
            senderId = req.patient.id;
        } else if (req.user) {
            senderType = 'doctor';
            senderId = req.user.id;
        } else {
            // Try to get from request body (for admin testing)
            senderType = req.body.sender_type;
            senderId = req.body.sender_id;
        }
        
        if (!thread_id || !content) {
            return res.status(400).json({ error: 'Thread ID and content required' });
        }
        
        // Verify thread exists
        const thread = await pool.query('SELECT * FROM chat_threads WHERE id = $1', [thread_id]);
        if (thread.rows.length === 0) {
            return res.status(404).json({ error: 'Thread not found' });
        }
        
        // Insert message
        const message = await pool.query(`
            INSERT INTO chat_messages 
            (thread_id, sender_type, sender_id, content, message_type, attachment_url, attachment_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [thread_id, senderType, senderId, content, message_type, attachment_url, attachment_name]);
        
        // Emit Socket.IO event
        if (req.io) {
            const recipientRoom = senderType === 'patient' 
                ? `doctor_${thread.rows[0].doctor_id}` 
                : `patient_${thread.rows[0].patient_id}`;
            
            req.io.to(`thread_${thread_id}`).emit('new_message', {
                ...message.rows[0],
                thread_id
            });
        }
        
        res.json({
            success: true,
            message: message.rows[0]
        });
        
    } catch (err) {
        console.error('[CHAT] Send message error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// ====================
// POST /read - Mark messages as read
// ====================
router.post('/read', async (req, res) => {
    try {
        const { thread_id, reader_type } = req.body;
        
        if (!thread_id) {
            return res.status(400).json({ error: 'Thread ID required' });
        }
        
        // Determine reader type
        const readerType = reader_type || (req.patient ? 'patient' : 'doctor');
        const oppositeType = readerType === 'patient' ? 'doctor' : 'patient';
        
        // Mark unread messages from the opposite party as read
        const result = await pool.query(`
            UPDATE chat_messages 
            SET is_read = true, read_at = NOW()
            WHERE thread_id = $1 AND sender_type = $2 AND is_read = false
            RETURNING id
        `, [thread_id, oppositeType]);
        
        // Reset unread counter
        const counterColumn = readerType === 'patient' ? 'unread_patient' : 'unread_doctor';
        await pool.query(`
            UPDATE chat_threads SET ${counterColumn} = 0 WHERE id = $1
        `, [thread_id]);
        
        // Emit read receipt
        if (req.io) {
            req.io.to(`thread_${thread_id}`).emit('messages_read', {
                thread_id,
                reader_type: readerType,
                count: result.rowCount
            });
        }
        
        res.json({
            success: true,
            marked_read: result.rowCount
        });
        
    } catch (err) {
        console.error('[CHAT] Mark read error:', err);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

// ====================
// GET /unread - Get unread count
// ====================
router.get('/unread', async (req, res) => {
    try {
        const doctorId = req.query.doctor_id || req.user?.id;
        const patientId = req.query.patient_id || req.patient?.id;
        
        let result;
        
        if (doctorId) {
            result = await pool.query(`
                SELECT COALESCE(SUM(unread_doctor), 0) as total_unread,
                       COUNT(*) FILTER (WHERE unread_doctor > 0) as threads_with_unread
                FROM chat_threads
                WHERE doctor_id = $1 AND status = 'active'
            `, [doctorId]);
        } else if (patientId) {
            result = await pool.query(`
                SELECT COALESCE(SUM(unread_patient), 0) as total_unread,
                       COUNT(*) FILTER (WHERE unread_patient > 0) as threads_with_unread
                FROM chat_threads
                WHERE patient_id = $1 AND status = 'active'
            `, [patientId]);
        } else {
            return res.status(400).json({ error: 'Doctor ID or Patient ID required' });
        }
        
        res.json({
            success: true,
            ...result.rows[0]
        });
        
    } catch (err) {
        console.error('[CHAT] Unread count error:', err);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

// ====================
// PUT /threads/:id/close - Close thread
// ====================
router.put('/threads/:id/close', async (req, res) => {
    try {
        const threadId = req.params.id;
        
        const result = await pool.query(`
            UPDATE chat_threads 
            SET status = 'closed', updated_at = NOW()
            WHERE id = $1 AND status = 'active'
            RETURNING id
        `, [threadId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Thread not found or already closed' });
        }
        
        res.json({
            success: true,
            message: 'Thread closed'
        });
        
    } catch (err) {
        console.error('[CHAT] Close thread error:', err);
        res.status(500).json({ error: 'Failed to close thread' });
    }
});

// ====================
// GET /quick-replies - Get quick reply templates
// ====================
router.get('/quick-replies', async (req, res) => {
    try {
        const doctorId = req.query.doctor_id || req.user?.id;
        
        const result = await pool.query(`
            SELECT id, text, category FROM chat_quick_replies
            WHERE is_global = true OR doctor_id = $1
            ORDER BY sort_order, created_at
        `, [doctorId || 0]);
        
        res.json({
            success: true,
            quick_replies: result.rows
        });
        
    } catch (err) {
        console.error('[CHAT] Quick replies error:', err);
        res.status(500).json({ error: 'Failed to fetch quick replies' });
    }
});

// ====================
// POST /quick-replies - Add custom quick reply
// ====================
router.post('/quick-replies', async (req, res) => {
    try {
        const { text, category } = req.body;
        const doctorId = req.user?.id || req.body.doctor_id;
        const hospitalId = req.user?.hospital_id || 1;
        
        if (!text) {
            return res.status(400).json({ error: 'Text required' });
        }
        
        const result = await pool.query(`
            INSERT INTO chat_quick_replies (doctor_id, text, category, hospital_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [doctorId, text, category, hospitalId]);
        
        res.json({
            success: true,
            quick_reply: result.rows[0]
        });
        
    } catch (err) {
        console.error('[CHAT] Add quick reply error:', err);
        res.status(500).json({ error: 'Failed to add quick reply' });
    }
});

// ====================
// Patient endpoints (for Wolf Care app)
// ====================

// GET /patient/threads - Get patient's chat threads
router.get('/patient/threads', authenticatePatient, async (req, res) => {
    try {
        const patientId = req.patient.id;
        
        const result = await pool.query(`
            SELECT 
                ct.id, ct.doctor_id, ct.subject, ct.status,
                ct.last_message_at, ct.unread_patient, ct.created_at,
                u.username as doctor_name, u.department,
                (SELECT content FROM chat_messages WHERE thread_id = ct.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM chat_threads ct
            JOIN users u ON ct.doctor_id = u.id
            WHERE ct.patient_id = $1 AND ct.status = 'active'
            ORDER BY ct.last_message_at DESC NULLS LAST
        `, [patientId]);
        
        res.json({
            success: true,
            threads: result.rows
        });
        
    } catch (err) {
        console.error('[CHAT] Patient threads error:', err);
        res.status(500).json({ error: 'Failed to fetch threads' });
    }
});

module.exports = router;
