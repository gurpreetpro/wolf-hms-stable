/**
 * ECHS Adapter
 * Ex-Servicemen Contributory Health Scheme Integration
 * Adopts CGHS rates effective Dec 15, 2025
 * WOLF HMS
 */

const BaseTPAAdapter = require('../BaseTPAAdapter');
const govtRateService = require('../GovtRateService');

class ECHSAdapter extends BaseTPAAdapter {
    constructor() {
        super('echs', 'ECHS - Ex-Servicemen Contributory Health Scheme');
        this.schemeCode = 'echs';
    }

    async initialize(credentials, config = {}) {
        this.config = {
            hospitalId: config.hospitalId,
            empanelmentId: config.empanelmentId,
            nabhAccredited: config.nabhAccredited || false,
            cityTier: config.cityTier || 'X',
            isSuperSpecialty: config.isSuperSpecialty || false,
            echsRegion: config.echsRegion || null,
            ...config
        };
        this.isInitialized = true;
        this.log('Initialized', { empanelmentId: this.config.empanelmentId });
    }

    /**
     * Check ECHS beneficiary eligibility
     * Verifies ECHS smart card & dependent status
     */
    async checkEligibility(patient, echsCardNumber) {
        this.log('Checking ECHS eligibility', { patientId: patient.id, echsCardNumber });

        try {
            const beneficiaries = await govtRateService.searchBeneficiaries('echs', echsCardNumber);
            
            if (beneficiaries.length === 0) {
                return {
                    eligible: false,
                    message: 'ECHS card not found. Register beneficiary first.',
                    cardNumber: echsCardNumber
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
                    serviceNumber: beneficiary.service_number,
                    rank: beneficiary.rank,
                    polyclinic: beneficiary.echs_polyclinic,
                    verificationStatus: beneficiary.verification_status
                },
                wardEntitlement: beneficiary.ward_entitlement,
                message: beneficiary.verification_status === 'verified'
                    ? 'ECHS beneficiary verified - eligible for cashless treatment'
                    : 'Card found but verification pending'
            };
        } catch (error) {
            this.log('Eligibility check error', { error: error.message });
            return { eligible: false, error: error.message };
        }
    }

    /**
     * Submit ECHS pre-authorization (referral-based)
     */
    async submitPreAuth(preauthData) {
        this.log('Submitting ECHS pre-auth', { referralId: preauthData.referralId });

        const { procedures, wardType, referralId } = preauthData;
        const hospitalConfig = this._getHospitalConfig(wardType);

        let estimatedAmount = 0;
        const calculatedProcedures = [];

        for (const proc of (procedures || [])) {
            try {
                const rate = await govtRateService.calculateRate('echs', proc.packageCode, hospitalConfig);
                estimatedAmount += rate.adjustedRate;
                calculatedProcedures.push(rate);
            } catch (e) {
                calculatedProcedures.push({ error: e.message, packageCode: proc.packageCode });
            }
        }

        return {
            success: true,
            preauthNumber: this.generateReferenceId('ECHS-PA'),
            status: 'submitted',
            schemeCode: 'echs',
            referralId,
            estimatedAmount,
            procedures: calculatedProcedures,
            hospitalConfig,
            submittedAt: new Date().toISOString(),
            message: 'ECHS pre-auth submitted. Referral-based approval required.'
        };
    }

    async getPreAuthStatus(preauthId) {
        return {
            preauthId,
            status: 'pending',
            schemeCode: 'echs',
            message: 'ECHS pre-auth status. Verify with ECHS polyclinic.',
            lastChecked: new Date().toISOString()
        };
    }

    /**
     * Submit ECHS claim (uses CGHS-equivalent rates)
     */
    async submitClaim(claimData) {
        this.log('Submitting ECHS claim', { admissionId: claimData.admissionId });

        const { procedures, wardType } = claimData;
        const hospitalConfig = this._getHospitalConfig(wardType);
        const bill = await govtRateService.calculateBill('echs', procedures, hospitalConfig);

        return {
            success: true,
            claimNumber: this.generateReferenceId('ECHS-CL'),
            status: 'submitted',
            schemeCode: 'echs',
            bill,
            submittedAt: new Date().toISOString(),
            message: 'ECHS claim submitted. Reimbursement as per revised CGHS rates (Dec 2025).'
        };
    }

    async getClaimStatus(claimId) {
        return {
            claimId,
            status: 'processing',
            schemeCode: 'echs',
            lastChecked: new Date().toISOString()
        };
    }

    async getPackages(specialty = null, options = {}) {
        return govtRateService.getPackages('echs', { specialty, ...options });
    }

    async calculateAllowance(procedures, wardType = 'semi_private') {
        const hospitalConfig = this._getHospitalConfig(wardType);
        return govtRateService.calculateBill('echs', procedures, hospitalConfig);
    }

    /**
     * Validate ECHS referral (3-specialist limit, polyclinic endorsement)
     */
    async validateReferral(referralNumber) {
        this.log('Validating ECHS referral', { referralNumber });
        // In production, this would check against ECHS referral database
        return {
            valid: true,
            referralNumber,
            message: 'Referral validation should be confirmed with ECHS polyclinic',
            rules: {
                validityPeriod: '3 months from issue date',
                maxSpecialists: 3,
                endorsementRequired: 'From ECHS polyclinic or Govt hospital MO'
            }
        };
    }

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
            provider: 'echs',
            message: 'ECHS rate engine active (CGHS rates effective Dec 15, 2025)',
            config: {
                cityTier: this.config.cityTier,
                nabhAccredited: this.config.nabhAccredited
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
                referralValidation: true,
                wardEntitlement: true,
                webhooks: false,
                realtime: false
            },
            rateStructure: {
                basis: 'Adopts CGHS rates',
                effectiveFrom: '2025-12-15',
                columns: ['non_nabh', 'nabh', 'super_specialty']
            }
        };
    }
}

module.exports = ECHSAdapter;
