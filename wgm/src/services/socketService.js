import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { SOCKET_URL } from '../config/environment';

let socket = null;

// Registry of persistent event callbacks
const registry = {
    ping: new Set(),
    request_photo: new Set(),
    dispatch_voice_message: new Set(),
    security_alert: new Set(),
    request_location_update: new Set()
};

function bindRegistryEvents(sock) {
    if (!sock) return;

    Object.keys(registry).forEach(event => {
        sock.off(event); // remove any prior listener to prevent duplicates
        sock.on(event, (data) => {
            console.log(`[Socket] Received event: ${event}`, data);
            registry[event].forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`[Socket] Error executing ${event} callback:`, err);
                }
            });
        });
    });
}

/**
 * Socket Service for Real-Time Events
 */
const socketService = {

    /**
     * Connect to the Socket.IO server
     */
    connect: async () => {
        if (socket && socket.connected) return socket;

        try {
            const token = await SecureStore.getItemAsync('userToken');
            
            socket = io(SOCKET_URL, {
                auth: { token },
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 2000,
            });

            socket.on('connect', () => {
                console.log('[Socket] Connected to SOC. Socket ID:', socket.id);
                bindRegistryEvents(socket);
            });

            socket.on('connect_error', (err) => {
                console.error('[Socket] Connection Error:', err.message);
            });

            socket.on('reconnect', (attempt) => {
                console.log('[Socket] Reconnected to SOC on attempt:', attempt);
                bindRegistryEvents(socket);
            });

            bindRegistryEvents(socket);
            return socket;
        } catch (error) {
            console.error('[Socket] Init failed:', error);
            return null;
        }
    },

    /**
     * Listen for HQ Command Centre Ping
     * @param {function} callback - Called when Command Centre pings this guard
     */
    onPing: (callback) => {
        registry.ping.add(callback);
        if (socket) bindRegistryEvents(socket);
        return () => registry.ping.delete(callback);
    },

    /**
     * Listen for HQ Photo Request
     * @param {function} callback - Called when Command Centre requests a photo
     */
    onRequestPhoto: (callback) => {
        registry.request_photo.add(callback);
        if (socket) bindRegistryEvents(socket);
        return () => registry.request_photo.delete(callback);
    },

    /**
     * Listen for Dispatch Messages (TTS Alerts)
     * @param {function} callback - Called with dispatch data
     */
    onDispatch: (callback) => {
        registry.dispatch_voice_message.add(callback);
        if (socket) bindRegistryEvents(socket);
        return () => registry.dispatch_voice_message.delete(callback);
    },

    /**
     * Listen for Global Security Alerts
     * @param {function} callback - Called with alert data
     */
    onSecurityAlert: (callback) => {
        registry.security_alert.add(callback);
        if (socket) bindRegistryEvents(socket);
        return () => registry.security_alert.delete(callback);
    },

    /**
     * Listen for Remote Location Request (Poll)
     * @param {function} callback - Called when HQ requests location
     */
    onLocationRequest: (callback) => {
        registry.request_location_update.add(callback);
        if (socket) bindRegistryEvents(socket);
        return () => registry.request_location_update.delete(callback);
    },

    /**
     * Emit an event to the server
     */
    emit: (event, data) => {
        if (socket && socket.connected) {
            socket.emit(event, data);
        }
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
