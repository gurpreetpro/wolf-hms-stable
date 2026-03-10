/**
 * Generic TPA Adapter
 * Configurable adapter for dynamically onboarded TPAs
 * Uses API config from database for flexible integration
 * WOLF HMS
 */

const BaseTPAAdapter = require('../BaseTPAAdapter');

class GenericTPAAdapter extends BaseTPAAdapter {
    constructor(providerCode, providerName) {
        super(providerCode, providerName);
        this.endpoints = {};
        this.fieldMapping = {};
    }

    async initialize(credentials, config = {}) {
        this.apiUrl = config.api_base_url || credentials.api_url;
        this.authType = config.auth_type || 'api_key';
        this.apiKey = credentials.api_key;
        this.clientId = credentials.client_id;
        this.clientSecret = credentials.client_secret;
        this.hospitalCode = credentials.hospital_code;

        // Load endpoints from config
        this.endpoints = config.endpoints || {
            eligibility: '/eligibility',
            preauth: '/preauth',
            preauthStatus: '/preauth/{id}/status',
            claim: '/claims',
            claimStatus: '/claims/{id}/status'
        };

        // Load field mapping
        this.fieldMapping = config.field_mapping || {};

        this.isProduction = credentials.isProduction || process.env.NODE_ENV === 'production';
        this.isInitialized = true;
        this.log('Initialized with generic adapter', { providerCode, authType: this.authType });
    }

    getDefaultHeaders() {
        const headers = { 'Content-Type': 'application/json' };

        switch (this.authType) {
            case 'api_key':
                headers['X-API-Key'] = this.apiKey;
                break;
            case 'bearer':
                headers['Authorization'] = `Bearer ${this.apiKey}`;
                break;
            case 'basic':
                headers['Authorization'] = `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`;
                break;
        }

        if (this.hospitalCode) {
            headers['X-Hospital-Code'] = this.hospitalCode;
        }

        return headers;
    }

    mapFields(data, direction = 'toProvider') {
        const mapping = direction === 'toProvider' ? this.fieldMapping.request : this.fieldMapping.response;
        if (!mapping) return data;

        const mapped = {};
        for (const [key, value] of Object.entries(data)) {
            const mappedKey = mapping[key] || key;
            mapped[mappedKey] = value;
        }
        return mapped;
    }

    async checkEligibility(patient, policyNumber) {
        if (!this.apiUrl) {
            return { eligible: true, policyStatus: 'active', sumInsured: 300000, demo: true };
        }

        const payload = this.mapFields({
            policy_number: policyNumber,
            patient_name: patient.name,
            patient_dob: patient.dob,
            patient_phone: patient.phone
        }, 'toProvider');

        const response = await this.makeRequest('POST', `${this.apiUrl}${this.endpoints.eligibility}`, payload);

        if (response.success) {
            const data = this.mapFields(response.data, 'fromProvider');
            return { eligible: data.eligible || data.is_eligible, sumInsured: data.sum_insured, raw: response.data };
        }
        throw new Error(response.error?.message || 'Eligibility check failed');
    }

    async submitPreAuth(preauthData) {
        if (!this.apiUrl) {
            return { referenceId: `GEN_PA_${Date.now()}`, status: 'pending', demo: true };
        }

        const payload = this.mapFields(preauthData, 'toProvider');
        const response = await this.makeRequest('POST', `${this.apiUrl}${this.endpoints.preauth}`, payload);

        if (response.success) {
            return {
                referenceId: response.data.id || response.data.reference_id,
                status: this.mapStatus(response.data.status),
                raw: response.data
            };
        }
        throw new Error(response.error?.message || 'Pre-auth failed');
    }

    async getPreAuthStatus(preauthId) {
        if (!this.apiUrl) {
            return { status: 'approved', approvedAmount: 40000, demo: true };
        }

        const url = `${this.apiUrl}${this.endpoints.preauthStatus.replace('{id}', preauthId)}`;
        const response = await this.makeRequest('GET', url);

        if (response.success) {
            return {
                status: this.mapStatus(response.data.status),
                approvedAmount: response.data.approved_amount,
                raw: response.data
            };
        }
        throw new Error(response.error?.message || 'Status check failed');
    }

    async submitClaim(claimData) {
        if (!this.apiUrl) {
            return { referenceId: `GEN_CLM_${Date.now()}`, status: 'submitted', demo: true };
        }

        const payload = this.mapFields(claimData, 'toProvider');
        const response = await this.makeRequest('POST', `${this.apiUrl}${this.endpoints.claim}`, payload);

        if (response.success) {
            return {
                referenceId: response.data.id || response.data.claim_id,
                status: this.mapStatus(response.data.status),
                raw: response.data
            };
        }
        throw new Error(response.error?.message || 'Claim submission failed');
    }

    async getClaimStatus(claimId) {
        if (!this.apiUrl) {
            return { status: 'approved', approvedAmount: 38000, demo: true };
        }

        const url = `${this.apiUrl}${this.endpoints.claimStatus.replace('{id}', claimId)}`;
        const response = await this.makeRequest('GET', url);

        if (response.success) {
            return {
                status: this.mapStatus(response.data.status),
                approvedAmount: response.data.approved_amount,
                raw: response.data
            };
        }
        throw new Error(response.error?.message || 'Status check failed');
    }

    async testConnection() {
        if (!this.apiUrl) {
            return { success: true, message: 'Demo mode - no API configured' };
        }

        try {
            const response = await this.makeRequest('GET', `${this.apiUrl}/health`);
            return { success: response.success, message: response.success ? 'Connected' : 'Connection failed' };
        } catch {
            return { success: false, message: 'Connection failed' };
        }
    }

    getCapabilities() {
        return {
            provider: this.providerCode,
            name: this.providerName,
            features: {
                eligibility: !!this.endpoints.eligibility,
                preauth: !!this.endpoints.preauth,
                claims: !!this.endpoints.claim,
                cashless: true,
                reimbursement: true,
                realtime: !!this.apiUrl,
                webhooks: false
            }
        };
    }
}

module.exports = GenericTPAAdapter;
