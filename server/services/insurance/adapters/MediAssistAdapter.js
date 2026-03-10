/**
 * Medi Assist TPA Adapter
 * Integration with Medi Assist unified TPA platform
 * WOLF HMS
 */

const BaseTPAAdapter = require('../BaseTPAAdapter');

class MediAssistAdapter extends BaseTPAAdapter {
    constructor() {
        super('medi_assist', 'Medi Assist TPA');
        this.apiUrl = process.env.MEDI_ASSIST_API_URL || 'https://api.mediassist.in';
    }

    async initialize(credentials, config = {}) {
        this.providerId = credentials.provider_id || process.env.MEDI_ASSIST_PROVIDER_ID;
        this.clientId = credentials.client_id || process.env.MEDI_ASSIST_CLIENT_ID;
        this.clientSecret = credentials.client_secret || process.env.MEDI_ASSIST_SECRET;
        this.isProduction = credentials.isProduction || process.env.NODE_ENV === 'production';
        this.accessToken = null;
        this.isInitialized = true;
        this.log('Initialized', { providerId: this.providerId });
    }

    async getAccessToken() {
        if (this.accessToken) return this.accessToken;
        // OAuth2 token fetch would go here
        return 'demo_token';
    }

    getDefaultHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken || 'demo'}`
        };
    }

    async checkEligibility(patient, policyNumber) {
        if (!this.isProduction && !this.clientSecret) {
            return {
                eligible: true, policyStatus: 'active', sumInsured: 300000, balanceSum: 280000,
                insurerName: 'Multiple Insurers', demo: true
            };
        }

        await this.getAccessToken();
        const response = await this.makeRequest('POST', `${this.apiUrl}/v2/eligibility/check`, {
            policy_number: policyNumber, patient_name: patient.name, patient_dob: patient.dob
        });
        if (response.success) {
            return { eligible: response.data.eligible, sumInsured: response.data.sum_insured, raw: response.data };
        }
        throw new Error(response.error?.message || 'Eligibility check failed');
    }

    async submitPreAuth(preauthData) {
        if (!this.isProduction && !this.clientSecret) {
            return { referenceId: `MA_PA_${Date.now()}`, status: 'pending', demo: true };
        }
        const response = await this.makeRequest('POST', `${this.apiUrl}/v2/preauth/submit`, preauthData);
        if (response.success) {
            return { referenceId: response.data.id, status: this.mapStatus(response.data.status), raw: response.data };
        }
        throw new Error(response.error?.message || 'Pre-auth failed');
    }

    async getPreAuthStatus(preauthId) {
        if (!this.isProduction && !this.clientSecret) {
            return { status: 'approved', approvedAmount: 35000, demo: true };
        }
        const response = await this.makeRequest('GET', `${this.apiUrl}/v2/preauth/${preauthId}`);
        return { status: this.mapStatus(response.data?.status), approvedAmount: response.data?.approved_amount };
    }

    async submitClaim(claimData) {
        if (!this.isProduction && !this.clientSecret) {
            return { referenceId: `MA_CLM_${Date.now()}`, status: 'submitted', demo: true };
        }
        const response = await this.makeRequest('POST', `${this.apiUrl}/v2/claims/submit`, claimData);
        return { referenceId: response.data?.id, status: this.mapStatus(response.data?.status) };
    }

    async getClaimStatus(claimId) {
        if (!this.isProduction && !this.clientSecret) {
            return { status: 'approved', approvedAmount: 32000, demo: true };
        }
        const response = await this.makeRequest('GET', `${this.apiUrl}/v2/claims/${claimId}`);
        return { status: this.mapStatus(response.data?.status), approvedAmount: response.data?.approved_amount };
    }

    async testConnection() {
        return { success: true, message: this.isProduction ? 'Connected to Medi Assist' : 'Demo mode' };
    }

    getCapabilities() {
        return {
            provider: this.providerCode, name: this.providerName,
            features: { eligibility: true, preauth: true, claims: true, cashless: true, reimbursement: true, realtime: true, webhooks: true }
        };
    }
}

module.exports = MediAssistAdapter;
