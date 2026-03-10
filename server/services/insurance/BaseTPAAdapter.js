/**
 * Base TPA Adapter
 * Abstract class for all TPA/Insurance provider integrations
 * WOLF HMS
 */

const axios = require('axios');

class BaseTPAAdapter {
    constructor(providerCode, providerName) {
        this.providerCode = providerCode;
        this.providerName = providerName;
        this.isInitialized = false;
        this.config = {};
    }

    /**
     * Initialize adapter with credentials
     */
    async initialize(credentials, config = {}) {
        throw new Error('initialize() must be implemented by subclass');
    }

    /**
     * Check patient eligibility
     * @param {Object} patient - Patient details
     * @param {string} policyNumber - Policy number
     * @returns {Object} Eligibility result
     */
    async checkEligibility(patient, policyNumber) {
        throw new Error('checkEligibility() must be implemented by subclass');
    }

    /**
     * Submit pre-authorization request
     * @param {Object} preauthData - Pre-auth details
     * @returns {Object} Pre-auth result with reference ID
     */
    async submitPreAuth(preauthData) {
        throw new Error('submitPreAuth() must be implemented by subclass');
    }

    /**
     * Get pre-authorization status
     * @param {string} preauthId - Pre-auth reference ID
     * @returns {Object} Status details
     */
    async getPreAuthStatus(preauthId) {
        throw new Error('getPreAuthStatus() must be implemented by subclass');
    }

    /**
     * Enhance pre-authorization (add more documents/info)
     * @param {string} preauthId - Pre-auth reference ID
     * @param {Object} enhancementData - Additional data
     * @returns {Object} Enhancement result
     */
    async enhancePreAuth(preauthId, enhancementData) {
        throw new Error('enhancePreAuth() must be implemented by subclass');
    }

    /**
     * Submit claim
     * @param {Object} claimData - Claim details
     * @returns {Object} Claim result with reference ID
     */
    async submitClaim(claimData) {
        throw new Error('submitClaim() must be implemented by subclass');
    }

    /**
     * Get claim status
     * @param {string} claimId - Claim reference ID
     * @returns {Object} Status details
     */
    async getClaimStatus(claimId) {
        throw new Error('getClaimStatus() must be implemented by subclass');
    }

    /**
     * Handle webhook callback from TPA
     * @param {Object} payload - Webhook payload
     * @param {string} signature - Signature for verification
     * @returns {Object} Processed webhook data
     */
    async handleWebhook(payload, signature) {
        return { valid: false, message: 'Webhook not implemented' };
    }

    /**
     * Test connection to TPA API
     * @returns {Object} Connection test result
     */
    async testConnection() {
        return { success: false, message: 'Test not implemented' };
    }

    /**
     * Get adapter capabilities
     * @returns {Object} Supported features
     */
    getCapabilities() {
        return {
            provider: this.providerCode,
            name: this.providerName,
            features: {
                eligibility: false,
                preauth: false,
                claims: false,
                cashless: false,
                reimbursement: false,
                realtime: false,
                webhooks: false
            }
        };
    }

    // ============================================
    // Helper Methods
    // ============================================

    /**
     * Format amount to paisa (for APIs expecting integer)
     */
    formatAmountToPaisa(amount) {
        return Math.round(parseFloat(amount) * 100);
    }

    /**
     * Format paisa to amount
     */
    formatPaisaToAmount(paisa) {
        return parseFloat(paisa) / 100;
    }

    /**
     * Generate unique reference ID
     */
    generateReferenceId(prefix = 'REF') {
        return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }

    /**
     * Map common status codes
     */
    mapStatus(providerStatus) {
        const statusMap = {
            // Common mappings - override in subclass
            'APPROVED': 'approved',
            'REJECTED': 'rejected',
            'PENDING': 'pending',
            'UNDER_REVIEW': 'under_review',
            'SETTLED': 'settled',
            'CANCELLED': 'cancelled'
        };
        return statusMap[providerStatus?.toUpperCase()] || providerStatus?.toLowerCase() || 'unknown';
    }

    /**
     * Log adapter activity
     */
    log(action, data = {}) {
        console.log(`[${this.providerCode.toUpperCase()}] ${action}`, JSON.stringify(data).substring(0, 500));
    }

    /**
     * Make HTTP request with error handling
     */
    async makeRequest(method, url, data = null, headers = {}) {
        const startTime = Date.now();
        try {
            const config = {
                method,
                url,
                headers: { ...this.getDefaultHeaders(), ...headers },
                timeout: 30000
            };

            if (data) {
                if (method.toUpperCase() === 'GET') {
                    config.params = data;
                } else {
                    config.data = data;
                }
            }

            const response = await axios(config);

            this.log('API Response', {
                method,
                url,
                status: response.status,
                time: Date.now() - startTime
            });

            return {
                success: true,
                status: response.status,
                data: response.data,
                responseTime: Date.now() - startTime
            };
        } catch (error) {
            this.log('API Error', {
                method,
                url,
                error: error.message,
                status: error.response?.status
            });

            return {
                success: false,
                status: error.response?.status,
                error: error.response?.data || error.message,
                responseTime: Date.now() - startTime
            };
        }
    }

    /**
     * Get default headers (override in subclass)
     */
    getDefaultHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /**
     * Validate required fields
     */
    validateRequired(data, requiredFields) {
        const missing = requiredFields.filter(field => !data[field]);
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
    }
}

module.exports = BaseTPAAdapter;
