/**
 * CGHS Adapter
 * Central Government Health Scheme Integration
 * Supports ~2000 procedures with multi-dimensional pricing
 * Revised rates effective Oct 13, 2025
 * WOLF HMS
 */

const BaseTPAAdapter = require('../BaseTPAAdapter');
const govtRateService = require('../GovtRateService');

class CGHSAdapter extends BaseTPAAdapter {
    constructor() {
        super('cghs', 'CGHS - Central Government Health Scheme');
        this.schemeCode = 'cghs';
    }

    async initialize(credentials, config = {}) {
        this.config = {
            hospitalId: config.hospitalId,
            empanelmentId: config.empanelmentId,
            nabhAccredited: config.nabhAccredited || false,
            cityTier: config.cityTier || 'X',
            isSuperSpecialty: config.isSuperSpecialty || false,
            ...config
        };
        this.isInitialized = true;
        this.log('Initialized', { empanelmentId: this.config.empanelmentId, cityTier: this.config.cityTier });
    }

    /**
     * Check CGHS beneficiary eligibility
     * Verifies card validity & ward entitlement
     */
    async checkEligibility(patient, cardNumber) {
        this.log('Checking CGHS eligibility', { patientId: patient.id, cardNumber });

        try {
            // Search in govt_scheme_beneficiaries
            const beneficiaries = await govtRateService.searchBeneficiaries('cghs', cardNumber);
            
            if (beneficiaries.length === 0) {
                return {
                    eligible: false,
                    message: 'CGHS card not found in system',
                    cardNumber,
                    action: 'Register beneficiary first via /api/govt-schemes/beneficiaries/register'
                };
            }

            const beneficiary = beneficiaries[0];
            return {
                eligible: beneficiary.verification_status === 'verified',
                beneficiary: {
                    id: beneficiary.id,
                    cardNumber: beneficiary.beneficiary_id,
                    name: beneficiary.beneficiary_name,
                    relation: beneficiary.relation,
                    wardEntitlement: beneficiary.ward_entitlement,
                    sponsoringAuthority: beneficiary.sponsoring_authority,
                    verificationStatus: beneficiary.verification_status
                },
                wardEntitlement: beneficiary.ward_entitlement,
                message: beneficiary.verification_status === 'verified' 
                    ? 'CGHS beneficiary verified' 
                    : 'Card found but verification pending'
            };
        } catch (error) {
            this.log('Eligibility check error', { error: error.message });
            return { eligible: false, error: error.message };
        }
    }

    /**
     * Submit CGHS pre-authorization
     */
    async submitPreAuth(preauthData) {
        this.log('Submitting CGHS pre-auth', { packageCode: preauthData.packageCode });

        const { packageCode, cardNumber, diagnosis, procedures } = preauthData;

        // Calculate rates for requested procedures
        const hospitalConfig = this._getHospitalConfig(preauthData.wardType);
        
        let estimatedAmount = 0;
        const calculatedProcedures = [];

        const procList = procedures || [{ packageCode }];
        for (const proc of procList) {
            try {
                const rate = await govtRateService.calculateRate('cghs', proc.packageCode || packageCode, hospitalConfig);
                estimatedAmount += rate.adjustedRate;
                calculatedProcedures.push(rate);
            } catch (e) {
                calculatedProcedures.push({ error: e.message, packageCode: proc.packageCode });
            }
        }

        const preauthRef = this.generateReferenceId('CGHS-PA');

        return {
            success: true,
            preauthNumber: preauthRef,
            status: 'submitted',
            schemeCode: 'cghs',
            estimatedAmount,
            procedures: calculatedProcedures,
            cardNumber,
            diagnosis,
            hospitalConfig,
            submittedAt: new Date().toISOString(),
            message: 'Pre-authorization submitted. Await CGHS desk approval.'
        };
    }

    /**
     * Get pre-auth status
     */
    async getPreAuthStatus(preauthId) {
        this.log('Getting CGHS pre-auth status', { preauthId });
        
        return {
            preauthId,
            status: 'pending',
            schemeCode: 'cghs',
            message: 'CGHS pre-authorization status tracking. Verify with CGHS desk.',
            lastChecked: new Date().toISOString()
        };
    }

    /**
     * Submit CGHS claim
     */
    async submitClaim(claimData) {
        this.log('Submitting CGHS claim', { admissionId: claimData.admissionId });

        const { procedures, wardType, admissionId } = claimData;
        const hospitalConfig = this._getHospitalConfig(wardType);

        // Calculate bill with multi-surgery rules
        const bill = await govtRateService.calculateBill('cghs', procedures, hospitalConfig);

        const claimRef = this.generateReferenceId('CGHS-CL');

        return {
            success: true,
            claimNumber: claimRef,
            status: 'submitted',
            schemeCode: 'cghs',
            admissionId,
            bill,
            submittedAt: new Date().toISOString(),
            message: 'CGHS claim submitted for processing'
        };
    }

    async getClaimStatus(claimId) {
        return {
            claimId,
            status: 'processing',
            schemeCode: 'cghs',
            message: 'Claim is being processed by CGHS',
            lastChecked: new Date().toISOString()
        };
    }

    /**
     * Get CGHS packages (delegated to GovtRateService)
     */
    async getPackages(specialty = null, options = {}) {
        return govtRateService.getPackages('cghs', { specialty, ...options });
    }

    /**
     * Calculate bill allowance with CGHS rules
     */
    async calculateAllowance(procedures, wardType = 'semi_private') {
        const hospitalConfig = this._getHospitalConfig(wardType);
        return govtRateService.calculateBill('cghs', procedures, hospitalConfig);
    }

    /**
     * Get ward entitlement from pay level
     */
    getWardEntitlement(basicPay) {
        return govtRateService.getWardEntitlement(basicPay);
    }

    /**
     * Build hospital config from stored empanelment data
     */
    _getHospitalConfig(wardType = 'semi_private') {
        return {
            nabh: this.config.nabhAccredited !== false,
            cityTier: this.config.cityTier || 'X',
            wardType: wardType || 'semi_private',
            isSuperSpecialty: this.config.isSuperSpecialty || false
        };
    }

    testConnection() {
        return {
            success: true,
            provider: 'cghs',
            message: 'CGHS rate engine active',
            config: {
                cityTier: this.config.cityTier,
                nabhAccredited: this.config.nabhAccredited,
                isSuperSpecialty: this.config.isSuperSpecialty
            }
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
                rateEngine: true,
                wardEntitlement: true,
                multiSurgeryRules: true,
                bilateralRules: true,
                webhooks: false,
                realtime: false
            },
            rateStructure: {
                columns: ['non_nabh', 'nabh', 'super_specialty'],
                modifiers: ['city_tier', 'ward_type', 'surgery_rules'],
                effectiveFrom: '2025-10-13',
                procedureCount: '~2000'
            }
        };
    }
}

module.exports = CGHSAdapter;
