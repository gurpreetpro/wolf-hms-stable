const { pool } = require('../db');

const jwt = require('jsonwebtoken');

/**
 * Handle Real-Time Socket Events
 * @param {object} io - Socket.IO Server Instance
 */
const socketHandler = (io) => {
    // 1. Authentication Middleware
    io.use((socket, next) => {
        if (socket.handshake.auth && socket.handshake.auth.token) {
            jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) return next(new Error('Authentication error'));
                socket.decoded = decoded;
                socket.hospital_id = decoded.hospital_id || 1; // Default to 1 if missing
                socket.user_id = decoded.id;
                next();
            });
        } else {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] Client connected: ${socket.id} (Hospital: ${socket.hospital_id}, User: ${socket.user_id})`);
        
        // --- Role-Based Room Joining for Targeted Alerts ---
        const userRole = socket.decoded?.role;
        if (userRole) {
            // Join role-specific room (scoped by hospital)
            const roleRoom = `hosp_${socket.hospital_id}_role_${userRole}`;
            socket.join(roleRoom);
            console.log(`[Socket] ${socket.id} joined role room: ${roleRoom}`);
            
            // Also join "all_staff" room for broadcast alerts
            const allStaffRoom = `hosp_${socket.hospital_id}_role_all_staff`;
            socket.join(allStaffRoom);
        }
        
        // --- General Events ---
        socket.on('join', (room) => {
            // STRICT SECURITY: Force hospital prefix to prevent cross-tenant leakage
            const scopedRoom = `hosp_${socket.hospital_id}_${room}`;
            socket.join(scopedRoom);
            console.log(`[Socket] ${socket.id} joined scoped room: ${scopedRoom}`);
        });

        // --- Chat Events (Phase 12) ---
        socket.on('chat:join_room', async ({ room, userId }) => {
            const scopedRoom = `hosp_${socket.hospital_id}_${room}`;
            socket.join(scopedRoom);
            
            // Allow user-specific notifications (already safe as user ID is unique, but good to scope)
            const userRoom = `user:${userId}`;
            socket.join(userRoom);
            console.log(`[Chat] User ${userId} joined ${scopedRoom}`);

            // Send last 50 messages history
            try {
                // Note: We use the scoped room name in the DB to ensure tenant isolation
                const result = await pool.query(
                    `SELECT * FROM chat_messages 
                     WHERE room = $1 
                     ORDER BY created_at DESC LIMIT 50`,
                    [scopedRoom] // [FIX] Use scoped room (e.g. hosp_1_general) for DB lookup
                );
                // Send history reversed (oldest first for scrolling)
                socket.emit('chat:history', result.rows.reverse());
            } catch (err) {
                console.error('[Chat] Failed to fetch history', err);
            }
        });

        socket.on('chat:send_message', async (messageData) => {
            const { room, senderId, senderName, text } = messageData;
            const scopedRoom = `hosp_${socket.hospital_id}_${room}`;
            
            try {
                // 1. Save to DB (Store original room name, but ensuring we might need hospital_id column later)
                const result = await pool.query(
                    `INSERT INTO chat_messages (room, sender_id, sender_name, message_text) 
                     VALUES ($1, $2, $3, $4) RETURNING *`,
                    [scopedRoom, senderId, senderName, text] // [FIX] Store scoped room name
                );
                
                const savedMsg = result.rows[0];

                // 2. Broadcast to SCOPED Room
                io.to(scopedRoom).emit('chat:new_message', savedMsg);
                
            } catch (err) {
                console.error('[Chat] Failed to save message', err);
                socket.emit('chat:error', { message: 'Failed to send message' });
            }
        });

        // --- Guard Location Events (Existing) ---
        // (If we move location logic here in future, for now it's mostly via REST + Emit)
        
        socket.on('disconnect', () => {
             console.log(`[Socket] Client disconnected: ${socket.id}`);
        });
    });
};

module.exports = socketHandler;
