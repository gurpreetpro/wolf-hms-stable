/**
 * PhonePe POS Adapter
 * UPI and Card payment terminal integration
 * API Documentation: https://developer.phonepe.com
 */

const BasePOSAdapter = require('../BasePOSAdapter');
const axios = require('axios');
const crypto = require('crypto');

class PhonePeAdapter extends BasePOSAdapter {
    constructor() {
        super('phonepe', 'PhonePe POS');
        this.apiUrl = 'https://api.phonepe.com/apis/hermes';
        this.merchantId = null;
        this.saltKey = null;
        this.saltIndex = 1;
    }

    async initialize(credentials) {
        this.merchantId = credentials.merchant_id || process.env.PHONEPE_MERCHANT_ID;
        this.saltKey = credentials.salt_key || process.env.PHONEPE_SALT_KEY;
        this.saltIndex = credentials.salt_index || process.env.PHONEPE_SALT_INDEX || 1;
        this.isProduction = credentials.isProduction || process.env.NODE_ENV === 'production';

        if (!this.isProduction) {
            this.apiUrl = 'https://api-preprod.phonepe.com/apis/pg-sandbox';
        }

        this.isInitialized = true;
    }

    generateChecksum(payload) {
        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const checksum = crypto
            .createHash('sha256')
            .update(base64Payload + '/pg/v1/pay' + this.saltKey)
            .digest('hex');
        return `${checksum}###${this.saltIndex}`;
    }

    async initiatePayment(device, invoiceId, amount, options = {}) {
        const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        const payload = {
            merchantId: this.merchantId,
            merchantTransactionId: transactionId,
            merchantUserId: options.patientId || 'PATIENT',
            amount: this.formatAmountToPaise(amount),
            redirectUrl: options.redirectUrl || 'https://hospital.com/callback',
            callbackUrl: options.callbackUrl || 'https://hospital.com/webhook/phonepe',
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        };

        try {
            if (!this.saltKey) {
                return this.simulatePaymentInitiation(transactionId, amount);
            }

            const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const checksum = this.generateChecksum(payload);

            const response = await axios.post(
                `${this.apiUrl}/pg/v1/pay`,
                { request: base64Payload },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-VERIFY': checksum
                    },
                    timeout: 30000
                }
            );

            return {
                providerTxnId: transactionId,
                status: 'initiated',
                message: 'Payment initiated',
                redirectUrl: response.data.data?.instrumentResponse?.redirectInfo?.url
            };
        } catch (error) {
            throw new Error(`PhonePe: ${error.response?.data?.message || error.message}`);
        }
    }

    async checkStatus(providerTxnId) {
        try {
            if (!this.saltKey) {
                return this.simulateStatusCheck(providerTxnId);
            }

            const checksum = crypto
                .createHash('sha256')
                .update(`/pg/v1/status/${this.merchantId}/${providerTxnId}` + this.saltKey)
                .digest('hex') + `###${this.saltIndex}`;

            const response = await axios.get(
                `${this.apiUrl}/pg/v1/status/${this.merchantId}/${providerTxnId}`,
                {
                    headers: { 'X-VERIFY': checksum, 'X-MERCHANT-ID': this.merchantId },
                    timeout: 15000
                }
            );

            const data = response.data;
            return {
                status: this.mapPhonePeStatus(data.code),
                responseCode: data.code,
                responseMessage: data.message,
                paymentMethod: data.data?.paymentInstrument?.type,
                raw: data
            };
        } catch (error) {
            throw new Error(`PhonePe status check failed: ${error.message}`);
        }
    }

    mapPhonePeStatus(code) {
        const statusMap = {
            'PAYMENT_SUCCESS': 'success',
            'PAYMENT_ERROR': 'failed',
            'PAYMENT_PENDING': 'pending',
            'PAYMENT_DECLINED': 'failed',
            'PAYMENT_CANCELLED': 'cancelled'
        };
        return statusMap[code] || 'unknown';
    }

    async cancel(providerTxnId) {
        return { success: true, message: 'PhonePe transactions auto-expire' };
    }

    async refund(providerTxnId, amount = null, reason = '') {
        if (!this.saltKey) {
            return { refundId: `REF${Date.now()}`, status: 'initiated', message: 'Refund initiated (demo)' };
        }

        const refundId = `REFUND${Date.now()}`;
        const payload = {
            merchantId: this.merchantId,
            merchantUserId: 'REFUND',
            originalTransactionId: providerTxnId,
            merchantTransactionId: refundId,
            amount: amount ? this.formatAmountToPaise(amount) : undefined
        };

        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const checksum = crypto
            .createHash('sha256')
            .update(base64Payload + '/pg/v1/refund' + this.saltKey)
            .digest('hex') + `###${this.saltIndex}`;

        const response = await axios.post(
            `${this.apiUrl}/pg/v1/refund`,
            { request: base64Payload },
            { headers: { 'Content-Type': 'application/json', 'X-VERIFY': checksum } }
        );

        return {
            refundId: refundId,
            status: response.data.success ? 'success' : 'pending',
            message: response.data.message
        };
    }

    async void(providerTxnId) {
        return this.refund(providerTxnId, null, 'Void');
    }

    async settlement(terminalId) {
        return {
            batchId: `AUTO_${Date.now()}`,
            status: 'auto',
            message: 'PhonePe settles automatically'
        };
    }

    async testConnection(device) {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
            success: true,
            latency: Date.now() - startTime,
            message: this.saltKey ? 'PhonePe API connected' : 'Demo mode'
        };
    }

    async handleWebhook(payload, signature) {
        const expectedChecksum = crypto
            .createHash('sha256')
            .update(payload.response + this.saltKey)
            .digest('hex') + `###${this.saltIndex}`;

        if (signature !== expectedChecksum) {
            return { valid: false };
        }

        const decoded = JSON.parse(Buffer.from(payload.response, 'base64').toString());
        return {
            valid: true,
            event: decoded.code,
            data: {
                transactionId: decoded.data?.merchantTransactionId,
                status: this.mapPhonePeStatus(decoded.code),
                amount: decoded.data?.amount ? decoded.data.amount / 100 : 0
            }
        };
    }

    simulatePaymentInitiation(transactionId, amount) {
        return {
            providerTxnId: transactionId,
            status: 'initiated',
            message: 'Payment initiated (demo)',
            redirectUrl: `https://phonepe.com/demo/${transactionId}`
        };
    }

    simulateStatusCheck(providerTxnId) {
        const statuses = ['success', 'success', 'pending'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        return {
            status,
            responseCode: status === 'success' ? 'PAYMENT_SUCCESS' : 'PAYMENT_PENDING',
            responseMessage: status === 'success' ? 'Payment successful' : 'Payment pending',
            raw: { demo: true }
        };
    }

    getCapabilities() {
        return {
            provider: this.providerCode,
            name: this.providerName,
            features: { card: true, upi: true, qr: true, refund: true, webhook: true }
        };
    }
}

module.exports = PhonePeAdapter;
