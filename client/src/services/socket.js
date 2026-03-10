import { io } from 'socket.io-client';

// Points to the Wolf HMS Cloud Test Server for real-time updates
// This ensures that even running locally, we see the live agents from the field.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socket = null;
let currentHospitalId = null;

/**
 * Initialize socket connection with auth token
 * @param {string} token - JWT auth token
 * @param {number} hospitalId - Hospital ID for room isolation
 */
export const connectSocket = (token, hospitalId) => {
    // If socket exists and is connected with same hospital, reuse
    if (socket && socket.connected && currentHospitalId === hospitalId) {
        return socket;
    }
    
    // Disconnect existing socket if switching hospitals
    if (socket && currentHospitalId !== hospitalId) {
        socket.disconnect();
    }
    
    // Create new socket with auth
    socket = io(SOCKET_URL, {
        autoConnect: true,
        transports: ['websocket', 'polling'],
        auth: {
            token: token // Used by auth payload strategy
        },
        extraHeaders: {
            Authorization: `Bearer ${token}` // Used by header strategy
        }
    });
    
    currentHospitalId = hospitalId;
    
    socket.on('connect', () => {
        console.log('[Socket] Connected to Wolf HMS:', socket.id);
        // Join hospital-specific room
        socket.emit('join', `hospital_${hospitalId}`);
        console.log(`[Socket] Joined hospital room: hospital_${hospitalId}`);
    });
    
    socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
    });
    
    socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
    });
    
    return socket;
};

/**
 * Connect without auth (fallback for legacy code)
 */
export const connectSocketLegacy = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            transports: ['websocket', 'polling'],
        });
    }
    if (!socket.connected) {
        console.log('[Socket] Connecting (legacy mode):', SOCKET_URL);
        socket.connect();
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket && socket.connected) {
        socket.disconnect();
    }
    currentHospitalId = null;
};

export const subscribeToEvent = (event, callback) => {
    if (socket) {
        socket.on(event, callback);
    }
};

export const unsubscribeFromEvent = (event) => {
    if (socket) {
        socket.off(event);
    }
};

export const getSocket = () => {
    return socket && socket.connected ? socket : null;
};

export const getHospitalId = () => currentHospitalId;

export default { connectSocket, connectSocketLegacy, disconnectSocket, subscribeToEvent, unsubscribeFromEvent, getSocket };

