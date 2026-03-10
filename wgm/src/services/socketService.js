import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { SOCKET_URL } from '../config/environment';

let socket = null;

/**
 * Socket Service for Real-Time Events
 */
const socketService = {

    /**
     * Connect to the Socket.IO server
     */
    connect: async () => {
        if (socket && socket.connected) return socket;

        const token = await SecureStore.getItemAsync('userToken');
        
        socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected to SOC');
        });

        socket.on('connect_error', (err) => {
            console.error('[Socket] Connection Error:', err.message);
        });

        return socket;
    },

    /**
     * Listen for Dispatch Messages (TTS Alerts)
     * @param {function} callback - Called with dispatch data
     */
    onDispatch: (callback) => {
        if (!socket) return;
        socket.on('dispatch_voice_message', callback);
    },

    /**
     * Listen for Global Security Alerts
     * @param {function} callback - Called with alert data
     */
    /**
     * Listen for Global Security Alerts
     * @param {function} callback - Called with alert data
     */
    onSecurityAlert: (callback) => {
        if (!socket) return;
        socket.on('security_alert', callback);
    },

    /**
     * Listen for Remote Location Request (Poll)
     * @param {function} callback - Called when HQ requests location
     */
    onLocationRequest: (callback) => {
        if (!socket) return;
        socket.on('request_location_update', callback);
    },

    /**
     * Disconnect the socket
     */
    disconnect: () => {

        if (socket) {
            socket.disconnect();
            socket = null;
        }
    },

    /**
     * Get the current socket instance
     */
    getSocket: () => socket
};

export default socketService;
