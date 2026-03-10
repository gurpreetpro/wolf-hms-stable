/**
 * Video Call Socket Handler
 * 
 * Handles real-time video call signaling between doctors and patients
 * - Incoming call notifications to patient devices
 * - WebRTC offer/answer/ICE candidate exchange
 * - Call state management (ringing, connected, ended)
 */

const { pool } = require('../db');

// Active calls tracking: callId -> { doctorSocket, patientSocket, roomId, status }
const activeCalls = new Map();
// Patient sockets: patientId -> socketId
const patientSockets = new Map();
// Socket to patient mapping: socketId -> patientId
const socketToPatient = new Map();

/**
 * Initialize video call socket namespace
 * @param {object} io - Socket.IO Server Instance
 */
const videoSocketHandler = (io) => {
    const videoNamespace = io.of('/video');
    
    // CRITICAL: Allow unauthenticated connections for patient app
    // Patients authenticate via register-patient event with phone/ID
    videoNamespace.use((socket, next) => {
        console.log(`[VIDEO] Connection attempt from ${socket.id}, handshake:`, {
            auth: socket.handshake.auth,
            query: socket.handshake.query,
            transport: socket.conn?.transport?.name
        });
        // Allow all connections - patients will register with their phone
        next();
    });
    
    videoNamespace.on('connection', (socket) => {
        console.log(`[VIDEO] ✅ Client connected: ${socket.id}`);
        
        // ============ REGISTRATION ============
        
        // Patient registers for incoming calls
        socket.on('register-patient', ({ patientId, patientPhone }) => {
            if (!patientId && !patientPhone) {
                socket.emit('error', { message: 'Patient ID or phone required' });
                return;
            }
            
            // Register with BOTH identifiers so doctor can match by either
            if (patientId) {
                patientSockets.set(patientId, socket.id);
                patientSockets.set(String(patientId), socket.id);
                socketToPatient.set(socket.id, patientId);
                console.log(`[VIDEO] Patient registered by ID: ${patientId} -> ${socket.id}`);
            }
            if (patientPhone) {
                patientSockets.set(patientPhone, socket.id);
                patientSockets.set(String(patientPhone), socket.id);
                console.log(`[VIDEO] Patient registered by phone: ${patientPhone} -> ${socket.id}`);
            }
            
            socket.patientId = patientId;
            socket.patientPhone = patientPhone;
            
            console.log(`[VIDEO] Patient registered. Current patients: ${JSON.stringify([...patientSockets.keys()])}`);
            socket.emit('registered', { success: true, patientId, patientPhone });
        });
        
        // Doctor registers (for tracking)
        socket.on('register-doctor', ({ doctorId, doctorName }) => {
            socket.doctorId = doctorId;
            socket.doctorName = doctorName;
            console.log(`[VIDEO] Doctor registered: ${doctorName} (${doctorId})`);
            socket.emit('registered', { success: true, doctorId });
        });
        
        // ============ CALL INITIATION ============
        
        // Doctor initiates a call to patient
        socket.on('start-call', async ({ patientId, patientPhone, appointmentId, roomId }) => {
            const patientIdentifier = patientId || patientPhone;
            
            console.log(`[VIDEO] ========== CALL INITIATION ==========`);
            console.log(`[VIDEO] Doctor ${socket.doctorId || 'unknown'} starting call to patient`);
            console.log(`[VIDEO] Received patientId: "${patientId}" (type: ${typeof patientId})`);
            console.log(`[VIDEO] Received patientPhone: "${patientPhone}" (type: ${typeof patientPhone})`);
            console.log(`[VIDEO] Using identifier: "${patientIdentifier}"`);
            console.log(`[VIDEO] All registered patients: ${JSON.stringify([...patientSockets.keys()])}`);
            
            // Look up patient details if we have appointmentId
            let patientInfo = { id: patientIdentifier };
            if (appointmentId) {
                try {
                    const result = await pool.query(`
                        SELECT p.id, p.name, p.phone, a.doctor_id, d.full_name as doctor_name, d.specialty
                        FROM appointments a
                        JOIN patients p ON a.patient_id = p.id
                        JOIN doctors d ON a.doctor_id = d.id
                        WHERE a.id = $1
                    `, [appointmentId]);
                    
                    if (result.rows.length > 0) {
                        patientInfo = result.rows[0];
                    }
                } catch (err) {
                    console.error('[VIDEO] Failed to fetch appointment details:', err);
                }
            }
            
            // Generate unique call ID
            const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const callRoomId = roomId || `room_${callId}`;
            
            // Store call info
            activeCalls.set(callId, {
                callId,
                roomId: callRoomId,
                doctorSocketId: socket.id,
                doctorId: socket.doctorId,
                doctorName: socket.doctorName,
                patientId: patientIdentifier,
                appointmentId,
                status: 'ringing',
                startTime: new Date(),
            });
            
            // Join doctor to the room
            socket.join(callRoomId);
            
            // Find patient socket and send incoming call notification
            const patientSocketId = patientSockets.get(patientIdentifier);
            
            if (patientSocketId) {
                // Patient is online - send incoming call
                videoNamespace.to(patientSocketId).emit('incoming-call', {
                    callId,
                    roomId: callRoomId,
                    doctorId: socket.doctorId,
                    doctorName: socket.doctorName || patientInfo.doctor_name || 'Doctor',
                    specialty: patientInfo.specialty || 'General',
                    appointmentId,
                    timestamp: new Date().toISOString(),
                });
                
                console.log(`[VIDEO] Incoming call sent to patient ${patientIdentifier}`);
                socket.emit('call-ringing', { callId, roomId: callRoomId, patientOnline: true });
            } else {
                // Patient not connected - could trigger push notification here
                console.log(`[VIDEO] Patient ${patientIdentifier} not online, would send push notification`);
                socket.emit('call-ringing', { callId, roomId: callRoomId, patientOnline: false });
                
                // TODO: Trigger FCM push notification
                // sendPushNotification(patientIdentifier, { type: 'incoming-call', callId, roomId, doctorName });
            }
            
            // Auto-timeout after 60 seconds if no answer
            setTimeout(() => {
                const call = activeCalls.get(callId);
                if (call && call.status === 'ringing') {
                    activeCalls.delete(callId);
                    socket.emit('call-timeout', { callId });
                    
                    if (patientSocketId) {
                        videoNamespace.to(patientSocketId).emit('call-missed', { callId });
                    }
                }
            }, 60000);
        });
        
        // ============ CALL RESPONSES ============
        
        // Patient accepts the call
        socket.on('accept-call', ({ callId }) => {
            const call = activeCalls.get(callId);
            if (!call) {
                socket.emit('error', { message: 'Call not found or expired' });
                return;
            }
            
            call.status = 'connected';
            call.patientSocketId = socket.id;
            call.connectTime = new Date();
            
            // Join patient to the room
            socket.join(call.roomId);
            
            // Notify doctor that call was accepted
            videoNamespace.to(call.doctorSocketId).emit('call-accepted', {
                callId,
                roomId: call.roomId,
                peerId: socket.id,
            });
            
            // Send room info to patient
            socket.emit('call-connected', {
                callId,
                roomId: call.roomId,
                peerId: call.doctorSocketId,
            });
            
            console.log(`[VIDEO] Call ${callId} accepted by patient`);
        });
        
        // Patient declines the call
        socket.on('decline-call', ({ callId, reason }) => {
            const call = activeCalls.get(callId);
            if (!call) return;
            
            call.status = 'declined';
            
            // Notify doctor
            videoNamespace.to(call.doctorSocketId).emit('call-declined', {
                callId,
                reason: reason || 'Patient declined',
            });
            
            activeCalls.delete(callId);
            console.log(`[VIDEO] Call ${callId} declined by patient`);
        });
        
        // ============ WEBRTC SIGNALING ============
        
        // Join a video room (for both doctor and patient)
        socket.on('join-room', ({ roomId, token, name }, callback) => {
            socket.join(roomId);
            socket.roomId = roomId;
            socket.userName = name;
            
            // Get other participants in room
            const room = videoNamespace.adapter.rooms.get(roomId);
            const participants = [];
            
            if (room) {
                room.forEach((socketId) => {
                    if (socketId !== socket.id) {
                        const otherSocket = videoNamespace.sockets.get(socketId);
                        if (otherSocket) {
                            participants.push({
                                peerId: socketId,
                                name: otherSocket.userName,
                                role: otherSocket.doctorId ? 'doctor' : 'patient',
                            });
                        }
                    }
                });
            }
            
            // Notify others in room
            socket.to(roomId).emit('peer-joined', {
                peerId: socket.id,
                userId: socket.doctorId || socket.patientId,
                role: socket.doctorId ? 'doctor' : 'patient',
                name: socket.userName,
            });
            
            console.log(`[VIDEO] ${name} joined room ${roomId}, ${participants.length} others present`);
            
            if (callback) {
                callback({ success: true, roomId, participants });
            }
        });
        
        // WebRTC offer
        socket.on('offer', ({ peerId, offer }) => {
            videoNamespace.to(peerId).emit('offer', { peerId: socket.id, offer });
        });
        
        // WebRTC answer
        socket.on('answer', ({ peerId, answer }) => {
            videoNamespace.to(peerId).emit('answer', { peerId: socket.id, answer });
        });
        
        // ICE candidate
        socket.on('ice-candidate', ({ peerId, candidate }) => {
            videoNamespace.to(peerId).emit('ice-candidate', { peerId: socket.id, candidate });
        });
        
        // Toggle audio/video
        socket.on('toggle-audio', (muted) => {
            if (socket.roomId) {
                socket.to(socket.roomId).emit('peer-audio-toggle', { peerId: socket.id, muted });
            }
        });
        
        socket.on('toggle-video', (off) => {
            if (socket.roomId) {
                socket.to(socket.roomId).emit('peer-video-toggle', { peerId: socket.id, off });
            }
        });
        
        // End call
        socket.on('end-call', ({ callId } = {}) => {
            if (socket.roomId) {
                socket.to(socket.roomId).emit('call-ended', { peerId: socket.id });
            }
            
            // Clean up active call if exists
            if (callId) {
                activeCalls.delete(callId);
            }
            
            console.log(`[VIDEO] Call ended by ${socket.id}`);
        });
        
        // ============ DISCONNECT ============
        
        socket.on('disconnect', () => {
            // Remove from patient tracking
            const patientId = socketToPatient.get(socket.id);
            if (patientId) {
                patientSockets.delete(patientId);
                socketToPatient.delete(socket.id);
            }
            
            // Notify room of departure
            if (socket.roomId) {
                socket.to(socket.roomId).emit('peer-left', { peerId: socket.id });
            }
            
            console.log(`[VIDEO] Client disconnected: ${socket.id}`);
        });
    });
    
    return videoNamespace;
};

module.exports = videoSocketHandler;
