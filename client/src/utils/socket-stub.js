/**
 * Socket.IO Client - Real-time Updates for Wolf HMS
 * 
 * Re-enabled from stub to support real-time doctor-nurse order push notifications.
 * This module provides socket.io-client functionality for all dashboards.
 * 
 * Events used across the application:
 * - clinical_update: New care tasks, medication orders, vital requests
 * - pharmacy_update: Prescription updates
 * - lab_update: Lab order updates
 * - opd_update: OPD queue changes
 * - emergency_broadcast: Emergency code alerts
 * - emergency_resolved: Emergency resolution
 * - iot_vitals_received: IoT device vitals
 */
import { io as socketIO } from 'socket.io-client';

// Determine the backend URL based on environment
const getSocketUrl = () => {
    // Check for explicit environment variable
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Production Cloud Run URL
    if (import.meta.env.PROD || window.location.hostname.includes('wolfsecurity.in')) {
        return import.meta.env.VITE_SOCKET_URL || '';
    }
    // Local development
    return window.location.origin || 'http://localhost:5000';
};

const SOCKET_URL = getSocketUrl();

// Create singleton socket instance
let socket = null;

/**
 * Get or create the socket connection
 * This function matches the pattern expected by dashboard components
 */
export const io = (url = SOCKET_URL, options = {}) => {
    if (!socket) {
        console.log('[Socket.IO] Connecting to:', SOCKET_URL);
        socket = socketIO(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000,
            ...options
        });

        // Connection logging
        socket.on('connect', () => {
            console.log('[Socket.IO] Connected successfully, ID:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket.IO] Disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('[Socket.IO] Connection error:', error.message);
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log('[Socket.IO] Reconnected after', attemptNumber, 'attempts');
        });
    }

    return socket;
};

// Helper functions for explicit socket management
export const connectSocket = () => {
    const s = io();
    if (!s.connected) {
        s.connect();
    }
    return s;
};

export const disconnectSocket = () => {
    if (socket && socket.connected) {
        socket.disconnect();
    }
};

export const getSocket = () => socket;

export default io;
