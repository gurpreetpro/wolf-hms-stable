/**
 * NHCX Adapter
 * National Health Claims Exchange - Unified claims exchange platform
 * WOLF HMS
 */

const BaseTPAAdapter = require('../BaseTPAAdapter');
const crypto = require('crypto');

class NHCXAdapter extends BaseTPAAdapter {
    constructor() {
        super('nhcx', 'National Health Claims Exchange');
        this.apiUrl = process.env.NHCX_BASE_URL || 'https://api.nhcx.gov.in';
        this.participantCode = null;
        this.apiKey = null;
        this.signingKey = null;
    }

    async initialize(credentials, config = {}) {
        // [WOLF VAULT] Credentials MUST come from InsuranceFactory (DB-driven)
        // No .env fallback - this enforces multi-tenant security
        if (!credentials.participant_code || !credentials.api_key) {
            throw new Error('[NHCXAdapter] Missing required credentials. Use InsuranceFactory.getProvider() to initialize.');
        }
        
        this.participantCode = credentials.participant_code;
        this.apiKey = credentials.api_key;
        this.signingKey = credentials.signing_key || null;
        this.hospitalId = credentials.hospital_id;
        this.tierLevel = credentials.tier_level || 'STANDARD';
        this.isProduction = config.isProduction || process.env.NODE_ENV === 'production';

        if (!this.isProduction) {
            this.apiUrl = 'https://sandbox.nhcx.gov.in';
        }

        this.isInitialized = true;
        this.log('Initialized', { 
            participantCode: this.participantCode, 
            hospitalId: this.hospitalId,
            tierLevel: this.tierLevel,
            isProduction: this.isProduction 
        });
    }

    getDefaultHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-Participant-Code': this.participantCode,
            'Authorization': `Bearer ${this.apiKey}`
        };
    }

    /**
     * Check eligibility via NHCX
     */
    async checkEligibility(patient, policyNumber) {
        this.log('Checking eligibility', { policyNumber });

        try {
            // Demo mode
            if (!this.isProduction && !this.apiKey) {
                return this.simulateEligibility(patient, policyNumber);
            }

            const payload = {
                type: 'CoverageEligibilityRequest',
                participant_code: this.participantCode,
                policy_number: policyNumber,
                patient: {
                    name: patient.name,
                    dob: patient.dob,
                    gender: patient.gender,
                    phone: patient.phone
                },
                service_date: new Date().toISOString().split('T')[0]
            };

            const response = await this.makeRequest('POST', `${this.apiUrl}/v1/eligibility/check`, payload);

            if (response.success) {
                return {
                    eligible: response.data.eligible,
                    policyStatus: response.data.policy_status,
                    sumInsured: response.data.sum_insured,
                    balanceSum: response.data.balance_sum_insured,
                    coverageDetails: response.data.coverage,
                    policyHolderName: response.data.policyholder_name,
                    validUntil: response.data.valid_until,
                    raw: response.data
                };
            } else {
                throw new Error(response.error?.message || 'Eligibility check failed');
            }
        } catch (error) {
            this.log('Eligibility check failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Submit pre-authorization via NHCX
     */
    async submitPreAuth(preauthData) {
        this.log('Submitting pre-auth', { patientId: preauthData.patientId });

        try {
            if (!this.isProduction && !this.apiKey) {
                return this.simulatePreAuth(preauthData);
            }

            const payload = {
                type: 'PreAuthRequest',
                participant_code: this.participantCode,
                policy_number: preauthData.policyNumber,
                preauth_details: {
                    patient_id: preauthData.patientId,
                    admission_date: preauthData.admissionDate,
                    treatment_type: preauthData.treatmentType,
                    diagnosis_codes: preauthData.diagnosisCodes || [],
                    procedure_codes: preauthData.procedureCodes || [],
                    estimated_cost: preauthData.estimatedCost,
                    requested_amount: preauthData.requestedAmount,
                    hospital_remarks: preauthData.remarks
                },
                documents: preauthData.documents || []
            };

            const response = await this.makeRequest('POST', `${this.apiUrl}/v1/claims/preauth`, payload);

            if (response.success) {
                return {
                    referenceId: response.data.preauth_id,
                    preauthNumber: response.data.preauth_number,
                    status: this.mapStatus(response.data.status),
                    message: response.data.message,
                    raw: response.data
                };
            } else {
                throw new Error(response.error?.message || 'Pre-auth submission failed');
            }
        } catch (error) {
            this.log('Pre-auth submission failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get pre-auth status
     */
    async getPreAuthStatus(preauthId) {
        this.log('Getting pre-auth status', { preauthId });

        try {
            if (!this.isProduction && !this.apiKey) {
                return this.simulatePreAuthStatus(preauthId);
            }

            const response = await this.makeRequest('GET', `${this.apiUrl}/v1/claims/preauth/${preauthId}/status`);

            if (response.success) {
                return {
                    status: this.mapStatus(response.data.status),
                    approvedAmount: response.data.approved_amount,
                    remarks: response.data.remarks,
                    validUntil: response.data.valid_until,
                    rejectionReason: response.data.rejection_reason,
                    raw: response.data
                };
            } else {
                throw new Error(response.error?.message || 'Status check failed');
            }
        } catch (error) {
            this.log('Pre-auth status check failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Submit claim
     */
    async submitClaim(claimData) {
        this.log('Submitting claim', { patientId: claimData.patientId });

        try {
            if (!this.isProduction && !this.apiKey) {
                return this.simulateClaim(claimData);
            }

            const payload = {
                type: 'ClaimRequest',
                participant_code: this.participantCode,
                policy_number: claimData.policyNumber,
                preauth_id: claimData.preauthId,
                claim_details: {
                    patient_id: claimData.patientId,
                    admission_date: claimData.admissionDate,
                    discharge_date: claimData.dischargeDate,
                    billed_amount: claimData.billedAmount,
                    claimed_amount: claimData.claimedAmount,
                    diagnosis_codes: claimData.diagnosisCodes || [],
                    procedure_codes: claimData.procedureCodes || []
                },
                documents: claimData.documents || []
            };

            const response = await this.makeRequest('POST', `${this.apiUrl}/v1/claims/submit`, payload);

            if (response.success) {
                return {
                    referenceId: response.data.claim_id,
                    claimNumber: response.data.claim_number,
                    status: this.mapStatus(response.data.status),
                    message: response.data.message,
                    raw: response.data
                };
            } else {
                throw new Error(response.error?.message || 'Claim submission failed');
            }
        } catch (error) {
            this.log('Claim submission failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get claim status
     */
    async getClaimStatus(claimId) {
        this.log('Getting claim status', { claimId });

        try {
            if (!this.isProduction && !this.apiKey) {
                return this.simulateClaimStatus(claimId);
            }

            const response = await this.makeRequest('GET', `${this.apiUrl}/v1/claims/${claimId}/status`);

            if (response.success) {
                return {
                    status: this.mapStatus(response.data.status),
                    approvedAmount: response.data.approved_amount,
                    settledAmount: response.data.settled_amount,
                    patientLiability: response.data.patient_liability,
                    remarks: response.data.remarks,
                    rejectionCode: response.data.rejection_code,
                    rejectionReason: response.data.rejection_reason,
                    raw: response.data
                };
            } else {
                throw new Error(response.error?.message || 'Claim status check failed');
            }
        } catch (error) {
            this.log('Claim status check failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Handle NHCX webhook
     */
    async handleWebhook(payload, signature) {
        // Verify signature
        const computedSignature = crypto
            .createHmac('sha256', this.signingKey || 'demo')
            .update(JSON.stringify(payload))
            .digest('hex');

        if (signature && signature !== computedSignature) {
            return { valid: false, message: 'Invalid signature' };
        }

        return {
            valid: true,
            event: payload.event_type,
            data: {
                referenceId: payload.reference_id,
                status: this.mapStatus(payload.status),
                type: payload.request_type,
                amount: payload.amount
            }
        };
    }

    async testConnection() {
        if (!this.isProduction && !this.apiKey) {
            return { success: true, message: 'Demo mode - connection simulated' };
        }

        const response = await this.makeRequest('GET', `${this.apiUrl}/v1/health`);
        return {
            success: response.success,
            message: response.success ? 'NHCX connection successful' : 'Connection failed'
        };
    }

    getCapabilities() {
        return {
            provider: this.providerCode,
            name: this.providerName,
            features: {
                eligibility: true,
                preauth: true,
                claims: true,
                cashless: true,
                reimbursement: true,
                realtime: true,
                webhooks: true
            }
        };
    }

    // ============================================
    // Simulation Methods (Demo Mode)
    // ============================================

    simulateEligibility(patient, policyNumber) {
        return {
            eligible: true,
            policyStatus: 'active',
            sumInsured: 500000,
            balanceSum: 450000,
            coverageDetails: {
                roomRent: 5000,
                icuPerDay: 10000,
                preHospitalization: 30,
                postHospitalization: 60
            },
            policyHolderName: patient.name,
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            demo: true
        };
    }

    simulatePreAuth(preauthData) {
        return {
            referenceId: `NHCX_PA_${Date.now()}`,
            preauthNumber: `PA${Math.random().toString().substr(2, 8)}`,
            status: 'pending',
            message: 'Pre-authorization request submitted (demo)',
            demo: true
        };
    }

    simulatePreAuthStatus(preauthId) {
        const statuses = ['pending', 'approved', 'approved'];
        return {
            status: statuses[Math.floor(Math.random() * statuses.length)],
            approvedAmount: 45000,
            remarks: 'Approved as per policy terms (demo)',
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            demo: true
        };
    }

    simulateClaim(claimData) {
        return {
            referenceId: `NHCX_CLM_${Date.now()}`,
            claimNumber: `CLM${Math.random().toString().substr(2, 8)}`,
            status: 'submitted',
            message: 'Claim submitted successfully (demo)',
            demo: true
        };
    }

    simulateClaimStatus(claimId) {
        return {
            status: 'approved',
            approvedAmount: 42000,
            settledAmount: 0,
            patientLiability: 3000,
            remarks: 'Claim approved, pending settlement (demo)',
            demo: true
        };
    }
}

module.exports = NHCXAdapter;
