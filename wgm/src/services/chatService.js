import { io } from 'socket.io-client';
import socketService from './socketService';

/**
 * Chat Service
 * Extends Socket Service for Text Messages
 */
const chatService = {
    
    /**
     * Join a chat room
     */
    joinRoom: (room) => {
        const socket = socketService.getSocket();
        if (socket) {
            socket.emit('chat:join_room', { 
                room,
                userId: 'CURRENT_USER_ID' // Middleware handles actual user
            });
        }
    },

    /**
     * Send a text message
     */
    sendMessage: (room, text, senderName) => {
        const socket = socketService.getSocket();
        if (socket) {
            socket.emit('chat:send_message', {
                room,
                text,
                senderName,
                senderId: 1 // TODO: Get from AuthContext
            });
        }
    },

    /**
     * Listen for incoming messages
     */
    onMessage: (callback) => {
        const socket = socketService.getSocket();
        if (socket) {
            socket.on('chat:new_message', callback);
        }
    },

    /**
     * Listen for history log
     */
    onHistory: (callback) => {
        const socket = socketService.getSocket();
        if (socket) {
            socket.on('chat:history', callback);
        }
    }
};

export default chatService;
