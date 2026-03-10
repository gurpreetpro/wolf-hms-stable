/**
 * Fast2SMS Service - SMS Gateway Integration for Indian Hospitals
 * Supports transactional SMS with DLT compliance
 */

const axios = require('axios');

class Fast2SMSService {
    constructor() {
        // Load settings from environment or database
        this.apiKey = process.env.FAST2SMS_API_KEY || '';
        this.senderId = process.env.FAST2SMS_SENDER_ID || 'FTWSMS';
        this.dltEntityId = process.env.FAST2SMS_DLT_ENTITY_ID || '';
        this.baseUrl = 'https://www.fast2sms.com/dev/bulkV2';
    }

    /**
     * Configure API credentials from settings
     */
    configure(settings) {
        if (settings.api_key) this.apiKey = settings.api_key;
        if (settings.sender_id) this.senderId = settings.sender_id;
        if (settings.dlt_entity_id) this.dltEntityId = settings.dlt_entity_id;
    }

    /**
     * Send SMS using Fast2SMS API
     * @param {string} phone - Mobile number (10 digits)
     * @param {string} message - SMS content
     * @param {string} dltTemplateId - DLT registered template ID
     * @returns {Promise<object>} - API response
     */
    async sendSMS(phone, message, dltTemplateId = '') {
        if (!this.apiKey) {
            console.warn('Fast2SMS: API key not configured');
            return { success: false, error: 'SMS API key not configured' };
        }

        // Validate phone number (Indian 10-digit)
        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        if (cleanPhone.length !== 10) {
            return { success: false, error: 'Invalid phone number' };
        }

        try {
            const response = await axios.post(this.baseUrl, null, {
                params: {
                    authorization: this.apiKey,
                    sender_id: this.senderId,
                    message: message,
                    language: 'english',
                    route: 'dlt', // DLT route for transactional SMS
                    numbers: cleanPhone,
                    ...(dltTemplateId && { DLT_TE_ID: dltTemplateId })
                },
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            console.log('Fast2SMS Response:', response.data);

            if (response.data.return === true) {
                return {
                    success: true,
                    message_id: response.data.request_id,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    error: response.data.message || 'SMS sending failed',
                    data: response.data
                };
            }
        } catch (error) {
            console.error('Fast2SMS Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Send Payment Confirmation SMS
     */
    async sendPaymentConfirmation(patient, invoice, amount, hospitalName = 'Hospital') {
        const message = `Dear ${patient.name}, payment of Rs.${amount} for Invoice #${invoice.id} received at ${hospitalName}. Thank you.`;
        return this.sendSMS(patient.phone, message);
    }

    /**
     * Send Payment Reminder SMS
     */
    async sendPaymentReminder(patient, invoice, amount, hospitalName = 'Hospital') {
        const message = `Dear ${patient.name}, reminder for pending payment Rs.${amount} for Invoice #${invoice.id}. -${hospitalName}`;
        return this.sendSMS(patient.phone, message);
    }

    /**
     * Send Receipt Link SMS
     */
    async sendReceiptLink(patient, receiptUrl, amount, hospitalName = 'Hospital') {
        const message = `Dear ${patient.name}, receipt for Rs.${amount} ready. Download: ${receiptUrl} -${hospitalName}`;
        return this.sendSMS(patient.phone, message);
    }

    /**
     * Send OTP SMS (for verification)
     */
    async sendOTP(phone, otp, hospitalName = 'Hospital') {
        const message = `Your OTP for ${hospitalName} is ${otp}. Valid for 10 minutes. Do not share.`;
        return this.sendSMS(phone, message);
    }

    /**
     * Send Appointment Reminder
     */
    async sendAppointmentReminder(patient, doctor, date, time, hospitalName = 'Hospital') {
        const message = `Dear ${patient.name}, reminder for your appointment with Dr.${doctor} on ${date} at ${time}. -${hospitalName}`;
        return this.sendSMS(patient.phone, message);
    }

    /**
     * Check SMS balance/credits
     */
    async checkBalance() {
        if (!this.apiKey) {
            return { success: false, error: 'API key not configured' };
        }

        try {
            const response = await axios.get('https://www.fast2sms.com/dev/wallet', {
                headers: {
                    authorization: this.apiKey
                }
            });
            return {
                success: true,
                balance: response.data.wallet,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }
}

// Export singleton instance
module.exports = new Fast2SMSService();
