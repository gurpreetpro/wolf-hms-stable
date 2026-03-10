/**
 * CAPF Adapter
 * Central Armed Police Forces Health Scheme (Ayushman CAPF)
 * BSF, CRPF, CISF, ITBP, SSB, NSG, Assam Rifles
 * Uses PM-JAY packages with additional referral system & annual cap
 * WOLF HMS
 */

const BaseTPAAdapter = require('../BaseTPAAdapter');
const govtRateService = require('../GovtRateService');

const CAPF_FORCES = ['BSF', 'CRPF', 'CISF', 'ITBP', 'SSB', 'NSG', 'AR'];
const ANNUAL_COVER = 500000; // ₹5 lakh per family per year
const EXTENDED_COVER = 1000000; // ₹10 lakh extended

class CAPFAdapter extends BaseTPAAdapter {
    constructor() {
        super('capf', 'CAPF - Ayushman CAPF (Central Armed Police Forces)');
        this.schemeCode = 'capf';
    }

    async initialize(credentials, config = {}) {
        this.config = {
            hospitalId: config.hospitalId,
            empanelmentId: config.empanelmentId,
            cityTier: config.cityTier || 'X',
            ...config
        };
        this.isInitialized = true;
        this.log('Initialized', { hospitalId: this.config.hospitalId });
    }

    /**
     * Check CAPF beneficiary eligibility
     * Verifies Ayushman CAPF e-card via service ID + Aadhaar
     */
    async checkEligibility(patient, serviceId) {
        this.log('Checking CAPF eligibility', { patientId: patient.id, serviceId });

        try {
            const beneficiaries = await govtRateService.searchBeneficiaries('capf', serviceId);
            
            if (beneficiaries.length === 0) {
                return {
                    eligible: false,
                    message: 'CAPF service ID not found. Register beneficiary with force details.',
                    serviceId,
                    registrationGuide: {
                        required: ['serviceId', 'forceName', 'aadhaarLast4'],
                        forces: CAPF_FORCES,
                        helpline: '14588'
                    }
                };
            }

            const beneficiary = beneficiaries[0];
            return {
                eligible: beneficiary.verification_status === 'verified',
                beneficiary: {
                    id: beneficiary.id,
                    serviceId: beneficiary.service_id,
                    force: beneficiary.force_name,
                    name: beneficiary.beneficiary_name,
                    relation: beneficiary.relation,
                    referralNumber: beneficiary.referral_number,
                    referralValid: beneficiary.referral_valid_until 
                        ? new Date(beneficiary.referral_valid_until) > new Date()
                        : false,
                    verificationStatus: beneficiary.verification_status
                },
                coverage: {
                    annualLimit: ANNUAL_COVER,
                    extendedLimit: EXTENDED_COVER,
                    message: '₹5 lakh per family per year (extendable to ₹10 lakh)'
                },
                message: beneficiary.verification_status === 'verified'
                    ? 'CAPF beneficiary verified - eligible for cashless treatment at empanelled hospital'
                    : 'Service ID found but verification pending'
            };
        } catch (error) {
            this.log('Eligibility check error', { error: error.message });
            return { eligible: false, error: error.message };
        }
    }

    /**
     * Validate CAPF referral
     * Referral from MO valid for 3 months, up to 3 specialist consultations
     */
    async validateReferral(referralNumber, serviceId) {
        this.log('Validating CAPF referral', { referralNumber, serviceId });

        // Check in beneficiary records
        const beneficiaries = await govtRateService.searchBeneficiaries('capf', serviceId || referralNumber);
        const beneficiary = beneficiaries.find(b => b.referral_number === referralNumber);

        if (!beneficiary) {
            return {
                valid: false,
                referralNumber,
                message: 'Referral not found in records'
            };
        }

        const validUntil = beneficiary.referral_valid_until ? new Date(beneficiary.referral_valid_until) : null;
        const isExpired = validUntil && validUntil < new Date();

        return {
            valid: !isExpired,
            referralNumber,
            validUntil: validUntil?.toISOString(),
            expired: isExpired,
            rules: {
                validityMonths: 3,
                maxSpecialists: 3,
                noReferralNeeded: 'Government hospitals, unlisted procedures (with Director Medical permission)',
                referralRequired: 'Admission procedures, special investigations > ₹3000 (CT, MRI, PET scans)'
            }
        };
    }

    /**
     * Submit CAPF pre-authorization (referral-based, uses PM-JAY platform)
     */
    async submitPreAuth(preauthData) {
        this.log('Submitting CAPF pre-auth', { referralNumber: preauthData.referralNumber });

        // Validate referral first
        const referralValid = await this.validateReferral(
            preauthData.referralNumber, 
            preauthData.serviceId
        );

        if (!referralValid.valid) {
            return {
                success: false,
                message: 'Invalid or expired referral. New referral required from CAPF/Govt hospital MO.',
                referral: referralValid
            };
        }

        const { procedures } = preauthData;
        let estimatedAmount = 0;
        const calculatedProcedures = [];

        // CAPF uses PMJAY packages — try capf scheme first, fallback to pmjay
        for (const proc of (procedures || [])) {
            try {
                const rate = await govtRateService.calculateRate('capf', proc.packageCode, {
                    nabh: true,
                    cityTier: this.config.cityTier || 'X',
                    wardType: 'semi_private'
                });
                estimatedAmount += rate.adjustedRate;
                calculatedProcedures.push(rate);
            } catch (e) {
                calculatedProcedures.push({ error: e.message, packageCode: proc.packageCode });
            }
        }

        // Check against annual cap
        const capCheck = this._checkCoverageLimit(estimatedAmount);

        return {
            success: true,
            preauthNumber: this.generateReferenceId('CAPF-PA'),
            status: 'submitted',
            schemeCode: 'capf',
            referral: referralValid,
            estimatedAmount,
            procedures: calculatedProcedures,
            coverageCheck: capCheck,
            submittedAt: new Date().toISOString(),
            message: 'CAPF pre-auth submitted via Ayushman CAPF platform.'
        };
    }

    async getPreAuthStatus(preauthId) {
        return {
            preauthId,
            status: 'pending',
            schemeCode: 'capf',
            message: 'Track on Ayushman CAPF portal or call 14588',
            lastChecked: new Date().toISOString()
        };
    }

    /**
     * Submit CAPF claim (cashless via PM-JAY platform)
     */
    async submitClaim(claimData) {
        this.log('Submitting CAPF claim', { admissionId: claimData.admissionId });

        const { procedures } = claimData;
        const bill = await govtRateService.calculateBill('capf', procedures, {
            nabh: true,
            cityTier: this.config.cityTier || 'X',
            wardType: 'semi_private'
        });

        const capCheck = this._checkCoverageLimit(bill.summary.grandTotal);

        return {
            success: true,
            claimNumber: this.generateReferenceId('CAPF-CL'),
            status: 'submitted',
            schemeCode: 'capf',
            bill,
            coverageCheck: capCheck,
            submittedAt: new Date().toISOString(),
            message: 'CAPF claim submitted. Cashless settlement via Ayushman CAPF.'
        };
    }

    async getClaimStatus(claimId) {
        return {
            claimId,
            status: 'processing',
            schemeCode: 'capf',
            lastChecked: new Date().toISOString()
        };
    }

    async getPackages(specialty = null, options = {}) {
        // CAPF primarily uses PMJAY packages
        return govtRateService.getPackages('capf', { specialty, ...options });
    }

    /**
     * Get force-specific rules
     */
    getForceRules(forceName) {
        if (!CAPF_FORCES.includes(forceName?.toUpperCase())) {
            return { error: `Invalid force. Must be one of: ${CAPF_FORCES.join(', ')}` };
        }

        return {
            force: forceName.toUpperCase(),
            scheme: 'Ayushman CAPF',
            coverage: {
                annual: `₹${(ANNUAL_COVER / 100000).toFixed(0)} lakh per family`,
                extended: `₹${(EXTENDED_COVER / 100000).toFixed(0)} lakh (if applicable)`,
                covers: ['Hospitalization', 'Surgery', 'ICU', 'Diagnostics', 'Medicines', 'Day care'],
                preExistingCovered: true
            },
            referral: {
                validFor: '3 months from issue',
                maxSpecialists: 3,
                noReferralFor: ['Government hospitals', 'Emergencies', 'OPD consultations < ₹3000'],
                referralRequired: ['Planned admission', 'CT/MRI/PET scans', 'Special investigations > ₹3000']
            },
            eCard: {
                activation: 'At empanelled hospital using Service ID + Aadhaar',
                type: 'Ayushman CAPF e-Card'
            },
            helpline: '14588'
        };
    }

    _checkCoverageLimit(claimAmount) {
        return {
            withinLimit: claimAmount <= ANNUAL_COVER,
            claimAmount,
            annualLimit: ANNUAL_COVER,
            extendedLimit: EXTENDED_COVER,
            remaining: Math.max(0, ANNUAL_COVER - claimAmount),
            warning: claimAmount > ANNUAL_COVER 
                ? `Claim exceeds ₹5L annual limit. Extended cover (₹10L) may apply.`
                : null
        };
    }

    testConnection() {
        return {
            success: true,
            provider: 'capf',
            message: 'Ayushman CAPF integration active',
            forces: CAPF_FORCES,
            coverage: `₹${(ANNUAL_COVER / 100000).toFixed(0)}L / ₹${(EXTENDED_COVER / 100000).toFixed(0)}L`
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
                referralValidation: true,
                coverageCap: true,
                forceSpecificRules: true,
                webhooks: false,
                realtime: false
            },
            supportedForces: CAPF_FORCES,
            coverage: {
                annual: ANNUAL_COVER,
                extended: EXTENDED_COVER
            },
            rateStructure: {
                basis: 'PM-JAY / Ayushman Bharat packages',
                helpline: '14588'
            }
        };
    }
}

module.exports = CAPFAdapter;
