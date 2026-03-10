/**
 * Wolf Video - Telehealth API Routes
 * 
 * Handles video consultation scheduling and room access
 */

const express = require('express');
const router = express.Router();
const { generateRoomToken, getRoomStats } = require('../services/videoSignaling');
const db = require('../db');

/**
 * TEST MODE CONFIGURATION
 * Same test numbers as OTP auth - bypass payment for video testing
 */
const TEST_MODE = process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'development';
const TEST_PHONE_NUMBERS = [
    '9999999991', '9999999992', '9999999993', 
    '9999999994', '9999999995', '1234567890'
];

function isTestPhone(phone) {
    return TEST_MODE && TEST_PHONE_NUMBERS.includes(phone);
}

/**
 * Get video room token for patient
 * POST /api/telehealth/patient/join
 */
router.post('/patient/join', async (req, res) => {
    const { appointmentId, phone } = req.body;
    
    try {
        // Verify appointment belongs to patient and is paid
        const result = await db.query(`
            SELECT a.id, a.patient_id, a.doctor_id, a.status, a.appointment_date, a.appointment_time,
                   p.name as patient_name, p.phone,
                   d.name as doctor_name,
                   i.status as payment_status
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            LEFT JOIN users d ON a.doctor_id = d.id
            LEFT JOIN invoices i ON i.appointment_id = a.id
            WHERE a.id = $1 AND p.phone = $2
        `, [appointmentId, phone]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        const appointment = result.rows[0];
        
        // TEST MODE: Bypass payment check for test numbers
        const bypassPayment = isTestPhone(phone);
        
        // Check payment status (skip for test numbers)
        if (!bypassPayment && appointment.payment_status !== 'Paid') {
            return res.status(402).json({ 
                error: 'Payment required',
                message: 'Please complete payment before joining'
            });
        }
        
        // Check appointment is within valid time window (30 min before to 1 hour after)
        const appointmentTime = new Date(`${appointment.appointment_date} ${appointment.appointment_time}`);
        const now = new Date();
        const timeDiff = (now - appointmentTime) / (1000 * 60); // minutes
        
        if (timeDiff < -30) {
            return res.status(400).json({ 
                error: 'Too early',
                message: 'You can join 30 minutes before the appointment',
                startsIn: Math.abs(timeDiff + 30)
            });
        }
        
        if (timeDiff > 60) {
            return res.status(400).json({ 
                error: 'Appointment expired',
                message: 'This appointment time has passed'
            });
        }
        
        // Generate room token
        const roomId = `consult-${appointmentId}`;
        const token = generateRoomToken(roomId, appointment.patient_id, 'patient');
        
        res.json({
            success: true,
            token,
            roomId,
            appointment: {
                doctorName: appointment.doctor_name,
                time: appointment.appointment_time,
                date: appointment.appointment_date
            },
            iceServers: getIceServers()
        });
        
    } catch (err) {
        console.error('[TELEHEALTH] Patient join error:', err);
        res.status(500).json({ error: 'Failed to join consultation' });
    }
});

/**
 * Get video room token for doctor
 * POST /api/telehealth/doctor/join
 * Requires auth middleware
 */
router.post('/doctor/join', async (req, res) => {
    const { appointmentId } = req.body;
    const doctorId = req.user?.id;
    
    if (!doctorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        // Verify appointment belongs to doctor
        const result = await db.query(`
            SELECT a.id, a.patient_id, a.doctor_id, a.status,
                   p.name as patient_name, p.phone
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.id = $1 AND a.doctor_id = $2
        `, [appointmentId, doctorId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        const appointment = result.rows[0];
        
        // Generate room token
        const roomId = `consult-${appointmentId}`;
        const token = generateRoomToken(roomId, doctorId, 'doctor');
        
        res.json({
            success: true,
            token,
            roomId,
            patient: {
                name: appointment.patient_name,
                phone: appointment.phone
            },
            iceServers: getIceServers()
        });
        
    } catch (err) {
        console.error('[TELEHEALTH] Doctor join error:', err);
        res.status(500).json({ error: 'Failed to join consultation' });
    }
});

/**
 * Get consultation status
 * GET /api/telehealth/status/:appointmentId
 */
router.get('/status/:appointmentId', async (req, res) => {
    const { appointmentId } = req.params;
    
    try {
        const result = await db.query(`
            SELECT a.id, a.status, a.appointment_date, a.appointment_time,
                   i.status as payment_status
            FROM appointments a
            LEFT JOIN invoices i ON i.appointment_id = a.id
            WHERE a.id = $1
        `, [appointmentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        const appointment = result.rows[0];
        
        res.json({
            appointmentId,
            status: appointment.status,
            paymentStatus: appointment.payment_status || 'Pending',
            date: appointment.appointment_date,
            time: appointment.appointment_time,
            canJoin: appointment.payment_status === 'Paid'
        });
        
    } catch (err) {
        console.error('[TELEHEALTH] Status check error:', err);
        res.status(500).json({ error: 'Failed to check status' });
    }
});

/**
 * Admin: Get video room stats
 * GET /api/telehealth/admin/stats
 */
router.get('/admin/stats', (req, res) => {
    const stats = getRoomStats();
    res.json(stats);
});

/**
 * Get ICE servers configuration
 * Includes your self-hosted TURN server at 163.245.208.73
 */
function getIceServers() {
    return [
        // Free STUN servers (for NAT discovery)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        
        // Wolf TURN Server (Your InterServer VPS - $3/month)
        {
            urls: 'turn:163.245.208.73:3478',
            username: 'wolf',
            credential: 'WolfTurn2026Pass!'
        }
    ];
}

module.exports = router;
