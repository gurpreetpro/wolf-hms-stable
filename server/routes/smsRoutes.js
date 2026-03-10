/**
 * SMS Routes - API endpoints for SMS functionality
 */

const express = require('express');
const router = express.Router();
const smsService = require('../services/smsService');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/sms/send
 * @desc    Send SMS to a phone number
 * @access  Private (admin, receptionist, billing)
 */
router.post('/send', protect, authorize('admin', 'receptionist', 'billing'), async (req, res) => {
    try {
        const { phone, message, template_id } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ message: 'Phone and message are required' });
        }

        const result = await smsService.sendSMS(phone, message, template_id);

        if (result.success) {
            res.json({
                success: true,
                message: 'SMS sent successfully',
                message_id: result.message_id
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.error || 'Failed to send SMS'
            });
        }
    } catch (error) {
        console.error('SMS send error:', error);
        res.status(500).json({ message: 'Server error sending SMS' });
    }
});

/**
 * @route   POST /api/sms/payment-confirmation
 * @desc    Send payment confirmation SMS
 * @access  Private (admin, receptionist, billing)
 */
router.post('/payment-confirmation', protect, authorize('admin', 'receptionist', 'billing'), async (req, res) => {
    try {
        const { patient_name, patient_phone, invoice_id, amount, hospital_name } = req.body;

        if (!patient_phone || !amount) {
            return res.status(400).json({ message: 'Patient phone and amount are required' });
        }

        const patient = { name: patient_name || 'Patient', phone: patient_phone };
        const invoice = { id: invoice_id || 'N/A' };

        const result = await smsService.sendPaymentConfirmation(
            patient, 
            invoice, 
            amount, 
            hospital_name || 'Hospital'
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Payment confirmation SMS sent',
                message_id: result.message_id
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.error || 'Failed to send SMS'
            });
        }
    } catch (error) {
        console.error('SMS payment confirmation error:', error);
        res.status(500).json({ message: 'Server error sending SMS' });
    }
});

/**
 * @route   POST /api/sms/payment-reminder
 * @desc    Send payment reminder SMS
 * @access  Private (admin, receptionist, billing)
 */
router.post('/payment-reminder', protect, authorize('admin', 'receptionist', 'billing'), async (req, res) => {
    try {
        const { patient_name, patient_phone, invoice_id, amount, hospital_name } = req.body;

        if (!patient_phone || !amount) {
            return res.status(400).json({ message: 'Patient phone and amount are required' });
        }

        const patient = { name: patient_name || 'Patient', phone: patient_phone };
        const invoice = { id: invoice_id || 'N/A' };

        const result = await smsService.sendPaymentReminder(
            patient, 
            invoice, 
            amount, 
            hospital_name || 'Hospital'
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Payment reminder SMS sent',
                message_id: result.message_id
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.error || 'Failed to send SMS'
            });
        }
    } catch (error) {
        console.error('SMS payment reminder error:', error);
        res.status(500).json({ message: 'Server error sending SMS' });
    }
});

/**
 * @route   POST /api/sms/configure
 * @desc    Configure SMS settings (Fast2SMS credentials)
 * @access  Private (admin only)
 */
router.post('/configure', protect, authorize('admin'), async (req, res) => {
    try {
        const { api_key, sender_id, dlt_entity_id } = req.body;

        smsService.configure({
            api_key,
            sender_id,
            dlt_entity_id
        });

        res.json({
            success: true,
            message: 'SMS settings configured successfully'
        });
    } catch (error) {
        console.error('SMS configure error:', error);
        res.status(500).json({ message: 'Server error configuring SMS' });
    }
});

/**
 * @route   GET /api/sms/balance
 * @desc    Check SMS balance/credits
 * @access  Private (admin only)
 */
router.get('/balance', protect, authorize('admin'), async (req, res) => {
    try {
        const result = await smsService.checkBalance();

        if (result.success) {
            res.json({
                success: true,
                balance: result.balance,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.error || 'Failed to check balance'
            });
        }
    } catch (error) {
        console.error('SMS balance error:', error);
        res.status(500).json({ message: 'Server error checking balance' });
    }
});

/**
 * @route   POST /api/sms/test
 * @desc    Send a test SMS to verify configuration
 * @access  Private (admin only)
 */
router.post('/test', protect, authorize('admin'), async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        const result = await smsService.sendSMS(
            phone,
            'This is a test message from WOLF HMS. Your SMS configuration is working correctly.'
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Test SMS sent successfully',
                message_id: result.message_id
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.error || 'Failed to send test SMS'
            });
        }
    } catch (error) {
        console.error('SMS test error:', error);
        res.status(500).json({ message: 'Server error sending test SMS' });
    }
});

module.exports = router;
