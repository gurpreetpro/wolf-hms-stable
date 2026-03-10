/**
 * Mswipe POS Adapter
 * Healthcare-focused EDC terminal integration
 * API Documentation: https://mswipe.com/developers
 */

const BasePOSAdapter = require('../BasePOSAdapter');

class MswipeAdapter extends BasePOSAdapter {
    constructor() {
        super('mswipe', 'Mswipe');
        this.apiUrl = process.env.MSWIPE_API_URL || 'https://api.mswipe.com/v1';
    }

    async initialize(credentials) {
        this.apiKey = credentials.api_key || process.env.MSWIPE_API_KEY;
        this.secretKey = credentials.secret_key || process.env.MSWIPE_SECRET;
        this.isProduction = credentials.isProduction || process.env.NODE_ENV === 'production';
        this.isInitialized = true;
    }

    async initiatePayment(device, invoiceId, amount, options = {}) {
        const transactionId = this.generateTransactionId();
        // Demo implementation
        return {
            providerTxnId: transactionId,
            status: 'initiated',
            message: 'Payment initiated on Mswipe terminal (demo)'
        };
    }

    async checkStatus(providerTxnId) {
        const statuses = ['success', 'success', 'pending'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        return {
            status,
            responseCode: status === 'success' ? '00' : '99',
            responseMessage: status === 'success' ? 'Approved' : 'Processing',
            cardLastFour: '5678',
            raw: { demo: true }
        };
    }

    async cancel(providerTxnId) {
        return { success: true, message: 'Transaction cancelled (demo)' };
    }

    async refund(providerTxnId, amount = null, reason = '') {
        return { refundId: `REF${Date.now()}`, status: 'initiated', message: 'Refund initiated (demo)' };
    }

    async void(providerTxnId) {
        return { success: true, message: 'Transaction voided (demo)' };
    }

    async settlement(terminalId) {
        return {
            batchId: `BATCH${Date.now()}`,
            transactionCount: Math.floor(Math.random() * 10) + 2,
            totalAmount: Math.floor(Math.random() * 50000) + 5000,
            status: 'initiated',
            message: 'Settlement initiated (demo)'
        };
    }

    async testConnection(device) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return { success: true, latency: 300, message: 'Mswipe connection OK (demo)' };
    }

    async handleWebhook(payload, signature) {
        return { valid: true, event: payload.event, data: payload.data };
    }

    getCapabilities() {
        return {
            provider: this.providerCode,
            name: this.providerName,
            features: { card: true, upi: true, healthcare_focus: true, refund: true, settlement: true }
        };
    }
}

module.exports = MswipeAdapter;
