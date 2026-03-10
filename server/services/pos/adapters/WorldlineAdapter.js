/**
 * Worldline/Ingenico POS Adapter
 * Enterprise EDC terminal integration using Nexo protocol
 * API Documentation: https://developer.worldline.com
 */

const BasePOSAdapter = require('../BasePOSAdapter');

class WorldlineAdapter extends BasePOSAdapter {
    constructor() {
        super('worldline', 'Worldline/Ingenico');
        this.apiUrl = process.env.WORLDLINE_API_URL || 'https://api.worldline.com/v1';
    }

    async initialize(credentials) {
        this.merchantId = credentials.merchant_id || process.env.WORLDLINE_MERCHANT_ID;
        this.apiKey = credentials.api_key || process.env.WORLDLINE_API_KEY;
        this.isProduction = credentials.isProduction || process.env.NODE_ENV === 'production';
        this.isInitialized = true;
    }

    async initiatePayment(device, invoiceId, amount, options = {}) {
        const transactionId = this.generateTransactionId();
        // Demo implementation - Worldline uses Nexo protocol
        return {
            providerTxnId: transactionId,
            status: 'initiated',
            message: 'Payment initiated on Worldline terminal (demo)',
            nexoReference: `NEXO-${transactionId}`
        };
    }

    async checkStatus(providerTxnId) {
        const statuses = ['success', 'success', 'pending'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        return {
            status,
            responseCode: status === 'success' ? 'APPROVED' : 'PENDING',
            responseMessage: status === 'success' ? 'Transaction Approved' : 'Processing',
            cardLastFour: '9012',
            cardNetwork: 'MASTERCARD',
            raw: { demo: true, protocol: 'nexo' }
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
            transactionCount: Math.floor(Math.random() * 25) + 5,
            totalAmount: Math.floor(Math.random() * 200000) + 20000,
            status: 'initiated',
            message: 'Settlement initiated (demo)'
        };
    }

    async testConnection(device) {
        await new Promise(resolve => setTimeout(resolve, 400));
        return { success: true, latency: 400, message: 'Worldline terminal connected (demo)' };
    }

    async handleWebhook(payload, signature) {
        return { valid: true, event: payload.event, data: payload.data };
    }

    getCapabilities() {
        return {
            provider: this.providerCode,
            name: this.providerName,
            features: { card: true, upi: true, nfc: true, nexo_protocol: true, refund: true, settlement: true }
        };
    }
}

module.exports = WorldlineAdapter;
