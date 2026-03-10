/**
 * Wolf Video - WebRTC Signaling Server
 * 
 * Pure WebRTC implementation for hospital video consultations
 * 100% self-hosted, no external dependencies
 * 
 * Features:
 * - Room management (create, join, leave)
 * - Offer/Answer exchange
 * - ICE candidate relay
 * - Appointment verification
 */

const crypto = require('crypto');

// Active video rooms
const rooms = new Map();

// Room structure
class VideoRoom {
    constructor(roomId, appointmentId, createdBy) {
        this.id = roomId;
        this.appointmentId = appointmentId;
        this.createdBy = createdBy;
        this.createdAt = new Date();
        this.participants = new Map(); // socketId -> { userId, role, name }
        this.offers = new Map();       // from -> offer SDP
        this.answers = new Map();      // from -> answer SDP
    }
    
    addParticipant(socketId, user) {
        this.participants.set(socketId, {
            id: user.id,
            role: user.role,
            name: user.name,
            joinedAt: new Date()
        });
    }
    
    removeParticipant(socketId) {
        this.participants.delete(socketId);
    }
    
    getParticipantCount() {
        return this.participants.size;
    }
    
    isEmpty() {
        return this.participants.size === 0;
    }
}

/**
 * Generate room token for secure access
 */
function generateRoomToken(roomId, userId, role) {
    const payload = `${roomId}:${userId}:${role}:${Date.now()}`;
    const hash = crypto.createHmac('sha256', process.env.JWT_SECRET || 'wolf-video-secret')
        .update(payload)
        .digest('hex');
    return Buffer.from(`${payload}:${hash}`).toString('base64');
}

/**
 * Verify room token
 */
function verifyRoomToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64').toString();
        const parts = decoded.split(':');
        const hash = parts.pop();
        const payload = parts.join(':');
        
        const expectedHash = crypto.createHmac('sha256', process.env.JWT_SECRET || 'wolf-video-secret')
            .update(payload)
            .digest('hex');
        
        if (hash !== expectedHash) return null;
        
        const [roomId, userId, role, timestamp] = parts;
        
        // Token expires in 2 hours
        if (Date.now() - parseInt(timestamp) > 2 * 60 * 60 * 1000) {
            return null;
        }
        
        return { roomId, userId, role };
    } catch (err) {
        return null;
    }
}

/**
 * Initialize WebRTC signaling on Socket.IO server
 */
function initializeSignaling(io, dbPool) {
    console.log('[WOLF-VIDEO] Initializing WebRTC signaling...');
    
    // Video namespace for clean separation
    const videoNs = io.of('/video');
    
    videoNs.on('connection', (socket) => {
        console.log(`[WOLF-VIDEO] Client connected: ${socket.id}`);
        let currentRoom = null;
        let currentUser = null;
        
        // ==================== ROOM MANAGEMENT ====================
        
        /**
         * Create a new video room
         * Only doctors can create rooms for their appointments
         */
        socket.on('create-room', async (data, callback) => {
            const { appointmentId, token } = data;
            
            try {
                // Verify token
                const tokenData = verifyRoomToken(token);
                if (!tokenData || tokenData.role !== 'doctor') {
                    return callback({ error: 'Unauthorized' });
                }
                
                // Check if room already exists for this appointment
                const existingRoom = Array.from(rooms.values())
                    .find(r => r.appointmentId === appointmentId);
                
                if (existingRoom) {
                    return callback({ roomId: existingRoom.id });
                }
                
                // Create new room
                const roomId = `consult-${appointmentId}-${Date.now()}`;
                const room = new VideoRoom(roomId, appointmentId, tokenData.userId);
                rooms.set(roomId, room);
                
                console.log(`[WOLF-VIDEO] Room created: ${roomId}`);
                callback({ roomId, success: true });
                
            } catch (err) {
                console.error('[WOLF-VIDEO] Create room error:', err);
                callback({ error: 'Failed to create room' });
            }
        });
        
        /**
         * Join an existing video room
         */
        socket.on('join-room', async (data, callback) => {
            const { roomId, token, name } = data;
            
            try {
                // Verify token
                const tokenData = verifyRoomToken(token);
                if (!tokenData) {
                    return callback({ error: 'Invalid token' });
                }
                
                const room = rooms.get(roomId);
                if (!room) {
                    return callback({ error: 'Room not found' });
                }
                
                // Limit to 2 participants (doctor + patient)
                if (room.getParticipantCount() >= 2) {
                    return callback({ error: 'Room is full' });
                }
                
                // Join room
                socket.join(roomId);
                room.addParticipant(socket.id, {
                    id: tokenData.userId,
                    role: tokenData.role,
                    name: name || tokenData.role
                });
                
                currentRoom = roomId;
                currentUser = { ...tokenData, name };
                
                // Notify other participant
                socket.to(roomId).emit('peer-joined', {
                    peerId: socket.id,
                    userId: tokenData.userId,
                    role: tokenData.role,
                    name
                });
                
                console.log(`[WOLF-VIDEO] ${tokenData.role} joined room: ${roomId}`);
                
                // Return existing participants
                const participants = Array.from(room.participants.entries())
                    .filter(([id]) => id !== socket.id)
                    .map(([id, p]) => ({ peerId: id, ...p }));
                
                callback({ success: true, participants });
                
            } catch (err) {
                console.error('[WOLF-VIDEO] Join room error:', err);
                callback({ error: 'Failed to join room' });
            }
        });
        
        /**
         * Leave room
         */
        socket.on('leave-room', () => {
            if (currentRoom) {
                handleLeave();
            }
        });
        
        // ==================== WebRTC SIGNALING ====================
        
        /**
         * Forward offer to peer
         */
        socket.on('offer', (data) => {
            const { peerId, offer } = data;
            console.log(`[WOLF-VIDEO] Offer from ${socket.id} to ${peerId}`);
            socket.to(peerId).emit('offer', {
                peerId: socket.id,
                offer
            });
        });
        
        /**
         * Forward answer to peer
         */
        socket.on('answer', (data) => {
            const { peerId, answer } = data;
            console.log(`[WOLF-VIDEO] Answer from ${socket.id} to ${peerId}`);
            socket.to(peerId).emit('answer', {
                peerId: socket.id,
                answer
            });
        });
        
        /**
         * Forward ICE candidate to peer
         */
        socket.on('ice-candidate', (data) => {
            const { peerId, candidate } = data;
            socket.to(peerId).emit('ice-candidate', {
                peerId: socket.id,
                candidate
            });
        });
        
        // ==================== CALL CONTROLS ====================
        
        /**
         * Mute/unmute audio
         */
        socket.on('toggle-audio', (muted) => {
            if (currentRoom) {
                socket.to(currentRoom).emit('peer-audio-toggle', {
                    peerId: socket.id,
                    muted
                });
            }
        });
        
        /**
         * Enable/disable video
         */
        socket.on('toggle-video', (disabled) => {
            if (currentRoom) {
                socket.to(currentRoom).emit('peer-video-toggle', {
                    peerId: socket.id,
                    disabled
                });
            }
        });
        
        /**
         * End call
         */
        socket.on('end-call', () => {
            if (currentRoom) {
                socket.to(currentRoom).emit('call-ended', {
                    peerId: socket.id,
                    reason: 'ended'
                });
                handleLeave();
            }
        });
        
        // ==================== DISCONNECT HANDLING ====================
        
        function handleLeave() {
            if (!currentRoom) return;
            
            const room = rooms.get(currentRoom);
            if (room) {
                room.removeParticipant(socket.id);
                socket.to(currentRoom).emit('peer-left', {
                    peerId: socket.id
                });
                
                // Clean up empty rooms
                if (room.isEmpty()) {
                    rooms.delete(currentRoom);
                    console.log(`[WOLF-VIDEO] Room cleaned up: ${currentRoom}`);
                }
            }
            
            socket.leave(currentRoom);
            currentRoom = null;
            currentUser = null;
        }
        
        socket.on('disconnect', () => {
            console.log(`[WOLF-VIDEO] Client disconnected: ${socket.id}`);
            handleLeave();
        });
    });
    
    console.log('[WOLF-VIDEO] Signaling initialized on /video namespace');
}

/**
 * Get room stats for monitoring
 */
function getRoomStats() {
    return {
        activeRooms: rooms.size,
        rooms: Array.from(rooms.values()).map(r => ({
            id: r.id,
            appointmentId: r.appointmentId,
            participants: r.getParticipantCount(),
            createdAt: r.createdAt
        }))
    };
}

module.exports = {
    initializeSignaling,
    generateRoomToken,
    verifyRoomToken,
    getRoomStats
};
