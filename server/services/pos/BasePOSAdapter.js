/**
 * Base POS Adapter - Abstract Interface
 * All provider adapters must implement this interface
 * WOLF HMS - Multi-Provider POS Integration
 */

class BasePOSAdapter {
    constructor(providerCode, providerName) {
        this.providerCode = providerCode;
        this.providerName = providerName;
        this.isInitialized = false;
    }

    /**
     * Initialize adapter with credentials
     * @param {Object} credentials - API credentials from database
     */
    async initialize(credentials) {
        throw new Error(`${this.providerName}: initialize() not implemented`);
    }

    /**
     * Initiate a payment on the terminal
     * @param {Object} device - Device configuration
     * @param {number} invoiceId - Invoice ID
     * @param {number} amount - Amount in INR
     * @param {Object} options - Additional options (EMI, customer info, etc.)
     * @returns {Object} { providerTxnId, status, message, qrCode? }
     */
    async initiatePayment(device, invoiceId, amount, options = {}) {
        throw new Error(`${this.providerName}: initiatePayment() not implemented`);
    }

    /**
     * Check payment status
     * @param {string} providerTxnId - Provider's transaction ID
     * @returns {Object} { status, responseCode, responseMessage, cardDetails? }
     */
    async checkStatus(providerTxnId) {
        throw new Error(`${this.providerName}: checkStatus() not implemented`);
    }

    /**
     * Cancel a pending payment
     * @param {string} providerTxnId - Provider's transaction ID
     * @returns {Object} { success, message }
     */
    async cancel(providerTxnId) {
        throw new Error(`${this.providerName}: cancel() not implemented`);
    }

    /**
     * Initiate refund for a completed payment
     * @param {string} providerTxnId - Original transaction ID
     * @param {number} amount - Refund amount (null for full refund)
     * @param {string} reason - Refund reason
     * @returns {Object} { refundId, status, message }
     */
    async refund(providerTxnId, amount = null, reason = '') {
        throw new Error(`${this.providerName}: refund() not implemented`);
    }

    /**
     * Void a transaction (same day)
     * @param {string} providerTxnId - Transaction ID
     * @returns {Object} { success, message }
     */
    async void(providerTxnId) {
        throw new Error(`${this.providerName}: void() not implemented`);
    }

    /**
     * Initiate settlement/batch close
     * @param {string} terminalId - Terminal ID
     * @returns {Object} { batchId, transactionCount, totalAmount, status }
     */
    async settlement(terminalId) {
        throw new Error(`${this.providerName}: settlement() not implemented`);
    }

    /**
     * Test connection to terminal/API
     * @param {Object} device - Device configuration
     * @returns {Object} { success, latency, message }
     */
    async testConnection(device) {
        throw new Error(`${this.providerName}: testConnection() not implemented`);
    }

    /**
     * Get available EMI options for amount
     * @param {number} amount - Transaction amount
     * @param {string} cardBin - First 6 digits of card (optional)
     * @returns {Array} List of EMI offers
     */
    async getEMIOffers(amount, cardBin = null) {
        throw new Error(`${this.providerName}: getEMIOffers() not implemented`);
    }

    /**
     * Handle webhook from provider
     * @param {Object} payload - Webhook payload
     * @param {string} signature - Signature for verification
     * @returns {Object} { valid, event, data }
     */
    async handleWebhook(payload, signature) {
        throw new Error(`${this.providerName}: handleWebhook() not implemented`);
    }

    // ============================================
    // Common Helper Methods
    // ============================================

    /**
     * Generate unique transaction ID
     */
    generateTransactionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `POS${timestamp}${random}`;
    }

    /**
     * Convert amount to paise (for API calls)
     */
    formatAmountToPaise(amount) {
        return Math.round(parseFloat(amount) * 100);
    }

    /**
     * Convert paise to rupees
     */
    formatPaiseToAmount(paise) {
        return parseFloat(paise) / 100;
    }

    /**
     * Map provider status to standard status
     * Override in each adapter
     */
    mapStatus(providerStatus) {
        const statusMap = {
            'SUCCESS': 'success',
            'COMPLETED': 'success',
            'APPROVED': 'success',
            'FAILED': 'failed',
            'DECLINED': 'failed',
            'REJECTED': 'failed',
            'PENDING': 'pending',
            'INITIATED': 'initiated',
            'PROCESSING': 'processing',
            'CANCELLED': 'cancelled',
            'VOIDED': 'voided',
            'REFUNDED': 'refunded'
        };
        return statusMap[providerStatus?.toUpperCase()] || 'unknown';
    }

    /**
     * Validate device configuration
     */
    validateDevice(device) {
        const required = ['terminal_id', 'merchant_id'];
        const missing = required.filter(field => !device[field]);
        if (missing.length > 0) {
            throw new Error(`Missing required device fields: ${missing.join(', ')}`);
        }
        return true;
    }

    /**
     * Log activity for debugging
     */
    log(action, data) {
        console.log(`[${this.providerName}] ${action}:`, JSON.stringify(data, null, 2));
    }

    /**
     * Get provider capabilities
     */
    getCapabilities() {
        return {
            provider: this.providerCode,
            name: this.providerName,
            features: {
                card: false,
                upi: false,
                emi: false,
                nfc: false,
                qr: false,
                refund: false,
                settlement: false,
                webhook: false
            }
        };
    }
}

module.exports = BasePOSAdapter;
