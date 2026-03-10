/**
 * Video Call Notification Routes
 * 
 * Handles sending Jitsi video call invitations to patients via Socket.IO
 */
const express = require('express');
const router = express.Router();

// Store the io instance for socket notifications
let ioInstance = null;

// Initialize with Socket.IO instance
const initSocketIO = (io) => {
    ioInstance = io;
};

// Patient sockets map (same as videoSocketHandler)
const patientSockets = new Map();

// Register patient socket for notifications
const registerPatientSocket = (patientPhone, socketId) => {
    patientSockets.set(patientPhone, socketId);
    patientSockets.set(String(patientPhone), socketId);
    console.log(`[VideoNotify] Patient registered: ${patientPhone} -> ${socketId}`);
};

// Remove patient socket
const removePatientSocket = (socketId) => {
    for (const [key, value] of patientSockets.entries()) {
        if (value === socketId) {
            patientSockets.delete(key);
        }
    }
};

/**
 * POST /api/notifications/video-call
 * Send Jitsi video call notification to patient
 */
router.post('/video-call', async (req, res) => {
    try {
        const { patientId, patientPhone, appointmentId, jitsiRoom, jitsiUrl, doctorName } = req.body;

        console.log('[VideoNotify] Sending Jitsi call notification:', {
            patientId,
            patientPhone,
            jitsiRoom,
            doctorName
        });

        if (!jitsiRoom || !jitsiUrl) {
            return res.status(400).json({ success: false, error: 'Missing Jitsi room information' });
        }

        // Try to notify via Socket.IO
        const patientIdentifier = patientPhone || patientId;
        const patientSocketId = patientSockets.get(patientIdentifier) || patientSockets.get(String(patientIdentifier));

        if (patientSocketId && ioInstance) {
            // Patient is online - send Jitsi room notification
            const videoNamespace = ioInstance.of('/video');
            videoNamespace.to(patientSocketId).emit('jitsi-call', {
                jitsiRoom,
                jitsiUrl,
                doctorName,
                appointmentId,
                timestamp: new Date().toISOString(),
            });

            console.log(`[VideoNotify] Jitsi call notification sent to patient ${patientIdentifier}`);
            return res.json({ 
                success: true, 
                message: 'Notification sent',
                patientOnline: true,
                jitsiUrl
            });
        } else {
            // Patient not connected - they can still join via manual link
            console.log(`[VideoNotify] Patient ${patientIdentifier} not online, returning room link for manual sharing`);
            return res.json({ 
                success: true, 
                message: 'Patient not online - share link manually',
                patientOnline: false,
                jitsiUrl
            });
        }

    } catch (error) {
        console.error('[VideoNotify] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to send notification' });
    }
});

/**
 * GET /api/notifications/video-call/status/:roomId
 * Check if patient has joined the call
 */
router.get('/video-call/status/:roomId', async (req, res) => {
    try {
        // For now, just return the room info
        // Could be enhanced to ping Jitsi API for participant count
        res.json({ 
            success: true, 
            roomId: req.params.roomId,
            jitsiUrl: `https://meet.jit.si/${req.params.roomId}`
        });
    } catch (error) {
        console.error('[VideoNotify] Status check error:', error);
        res.status(500).json({ success: false, error: 'Failed to check status' });
    }
});

module.exports = router;
module.exports.initSocketIO = initSocketIO;
module.exports.registerPatientSocket = registerPatientSocket;
module.exports.removePatientSocket = removePatientSocket;
