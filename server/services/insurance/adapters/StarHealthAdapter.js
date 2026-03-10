/**
 * Star Health Adapter
 * Direct API integration with Star Health Insurance
 * WOLF HMS
 */

const BaseTPAAdapter = require('../BaseTPAAdapter');

class StarHealthAdapter extends BaseTPAAdapter {
    constructor() {
        super('star_health', 'Star Health Insurance');
        this.apiUrl = process.env.STAR_HEALTH_API_URL || 'https://api.starhealth.in';
        this.hospitalCode = null;
        this.apiKey = null;
    }

    async initialize(credentials, config = {}) {
        this.hospitalCode = credentials.hospital_code || process.env.STAR_HEALTH_HOSPITAL_CODE;
        this.apiKey = credentials.api_key || process.env.STAR_HEALTH_API_KEY;
        this.isProduction = credentials.isProduction || process.env.NODE_ENV === 'production';

        if (!this.isProduction) {
            this.apiUrl = 'https://sandbox.starhealth.in';
        }

        this.isInitialized = true;
        this.log('Initialized', { hospitalCode: this.hospitalCode });
    }

    getDefaultHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-Hospital-Code': this.hospitalCode,
            'X-API-Key': this.apiKey
        };
    }

    async checkEligibility(patient, policyNumber) {
        this.log('Checking eligibility', { policyNumber });

        if (!this.isProduction && !this.apiKey) {
            return {
                eligible: true,
                policyStatus: 'active',
                sumInsured: 500000,
                balanceSum: 480000,
                productName: 'Star Comprehensive',
                policyHolderName: patient.name,
                validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
                coverageDetails: {
                    roomRent: '1% of SI',
                    icuCharges: 'Up to 2% of SI',
                    ambulance: 2500
                },
                demo: true
            };
        }

        const response = await this.makeRequest('POST', `${this.apiUrl}/v1/eligibility`, {
            hospital_code: this.hospitalCode,
            policy_number: policyNumber,
            patient_name: patient.name,
            patient_dob: patient.dob
        });

        if (response.success) {
            return {
                eligible: response.data.is_eligible,
                policyStatus: response.data.policy_status,
                sumInsured: response.data.sum_insured,
                balanceSum: response.data.balance_sum_insured,
                productName: response.data.product_name,
                raw: response.data
            };
        }
        throw new Error(response.error?.message || 'Eligibility check failed');
    }

    async submitPreAuth(preauthData) {
        this.log('Submitting pre-auth', { policyNumber: preauthData.policyNumber });

        if (!this.isProduction && !this.apiKey) {
            return {
                referenceId: `STAR_PA_${Date.now()}`,
                preauthNumber: `SH${Math.random().toString().substr(2, 8)}`,
                status: 'pending',
                message: 'Pre-auth submitted to Star Health (demo)',
                demo: true
            };
        }

        const response = await this.makeRequest('POST', `${this.apiUrl}/v1/preauth/submit`, {
            hospital_code: this.hospitalCode,
            policy_number: preauthData.policyNumber,
            treatment_type: preauthData.treatmentType,
            admission_date: preauthData.admissionDate,
            estimated_cost: preauthData.estimatedCost,
            diagnosis: preauthData.diagnosisCodes,
            procedures: preauthData.procedureCodes
        });

        if (response.success) {
            return {
                referenceId: response.data.preauth_id,
                preauthNumber: response.data.preauth_number,
                status: this.mapStatus(response.data.status),
                raw: response.data
            };
        }
        throw new Error(response.error?.message || 'Pre-auth failed');
    }

    async getPreAuthStatus(preauthId) {
        if (!this.isProduction && !this.apiKey) {
            return {
                status: 'approved',
                approvedAmount: 45000,
                remarks: 'Approved (demo)',
                demo: true
            };
        }

        const response = await this.makeRequest('GET', `${this.apiUrl}/v1/preauth/${preauthId}/status`);
        if (response.success) {
            return {
                status: this.mapStatus(response.data.status),
                approvedAmount: response.data.approved_amount,
                remarks: response.data.remarks,
                raw: response.data
            };
        }
        throw new Error(response.error?.message || 'Status check failed');
    }

    async submitClaim(claimData) {
        if (!this.isProduction && !this.apiKey) {
            return {
                referenceId: `STAR_CLM_${Date.now()}`,
                claimNumber: `SHCLM${Math.random().toString().substr(2, 8)}`,
                status: 'submitted',
                message: 'Claim submitted (demo)',
                demo: true
            };
        }

        const response = await this.makeRequest('POST', `${this.apiUrl}/v1/claims/submit`, {
            hospital_code: this.hospitalCode,
            preauth_id: claimData.preauthId,
            policy_number: claimData.policyNumber,
            billed_amount: claimData.billedAmount,
            claimed_amount: claimData.claimedAmount
        });

        if (response.success) {
            return {
                referenceId: response.data.claim_id,
                claimNumber: response.data.claim_number,
                status: this.mapStatus(response.data.status),
                raw: response.data
            };
        }
        throw new Error(response.error?.message || 'Claim submission failed');
    }

    async getClaimStatus(claimId) {
        if (!this.isProduction && !this.apiKey) {
            return { status: 'approved', approvedAmount: 42000, demo: true };
        }

        const response = await this.makeRequest('GET', `${this.apiUrl}/v1/claims/${claimId}/status`);
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
        if (!this.isProduction && !this.apiKey) {
            return { success: true, message: 'Star Health connection simulated (demo)' };
        }
        const response = await this.makeRequest('GET', `${this.apiUrl}/v1/health`);
        return { success: response.success, message: response.success ? 'Connected' : 'Failed' };
    }

    getCapabilities() {
        return {
            provider: this.providerCode,
            name: this.providerName,
            features: { eligibility: true, preauth: true, claims: true, cashless: true, reimbursement: true, realtime: true, webhooks: false }
        };
    }
}

module.exports = StarHealthAdapter;
