/**
 * PMJAY Adapter
 * Ayushman Bharat PM-JAY / NHA Integration
 * Includes TMS and BIS APIs
 * WOLF HMS
 */

const BaseTPAAdapter = require('../BaseTPAAdapter');
const crypto = require('crypto');

class PMJAYAdapter extends BaseTPAAdapter {
    constructor() {
        super('pmjay', 'PM-JAY / Ayushman Bharat');
        this.tmsUrl = process.env.NHA_TMS_URL || 'https://tms.pmjay.gov.in/api';
        this.bisUrl = process.env.NHA_BIS_URL || 'https://bis.pmjay.gov.in/api';
    }

    async initialize(credentials, config = {}) {
        // [WOLF VAULT] Credentials MUST come from InsuranceFactory (DB-driven)
        // No .env fallback - this enforces multi-tenant security
        if (!credentials.hospital_id || !credentials.api_key) {
            throw new Error('[PMJAYAdapter] Missing required credentials. Use InsuranceFactory.getProvider() to initialize.');
        }
        
        this.hospitalId = credentials.hospital_id;
        this.shaCode = credentials.participant_code; // SHA code maps to participant_code
        this.apiKey = credentials.api_key;
        this.signingCert = credentials.signing_key || null;
        this.tierLevel = credentials.tier_level || 'STANDARD';
        this.isProduction = config.isProduction || process.env.NODE_ENV === 'production';
        
        this.isInitialized = true;
        this.log('Initialized', { 
            hospitalId: this.hospitalId, 
            shaCode: this.shaCode,
            tierLevel: this.tierLevel
        });
    }

    getDefaultHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-Hospital-Id': this.hospitalId,
            'X-SHA-Code': this.shaCode,
            'Authorization': `Bearer ${this.apiKey}`
        };
    }

    // ============================================
    // Beneficiary Verification (BIS)
    // ============================================

    async searchBeneficiary(searchParams) {
        this.log('Searching beneficiary', searchParams);

        if (!this.isProduction && !this.apiKey) {
            return this.simulateBeneficiarySearch(searchParams);
        }

        const response = await this.makeRequest('POST', `${this.bisUrl}/v1/beneficiary/search`, {
            hospital_id: this.hospitalId,
            search_type: searchParams.searchType, // 'aadhaar', 'pmjay_id', 'family_id', 'mobile'
            search_value: searchParams.searchValue,
            state_code: this.shaCode
        });

        if (response.success) {
            return {
                found: response.data.beneficiaries?.length > 0,
                beneficiaries: response.data.beneficiaries || [],
                raw: response.data
            };
        }
        throw new Error(response.error?.message || 'Beneficiary search failed');
    }

    async verifyBeneficiary(beneficiaryData, kycMethod = 'aadhaar_otp') {
        this.log('Verifying beneficiary', { pmjayId: beneficiaryData.pmjayId, kycMethod });

        if (!this.isProduction && !this.apiKey) {
            return this.simulateVerification(beneficiaryData);
        }

        const response = await this.makeRequest('POST', `${this.bisUrl}/v1/beneficiary/verify`, {
            hospital_id: this.hospitalId,
            pmjay_id: beneficiaryData.pmjayId,
            kyc_method: kycMethod,
            aadhaar_number: beneficiaryData.aadhaarNumber,
            otp: beneficiaryData.otp
        });

        if (response.success) {
            return {
                verified: response.data.verified,
                isEligible: response.data.is_eligible,
                beneficiaryName: response.data.beneficiary_name,
                familyId: response.data.family_id,
                stateCode: response.data.state_code,
                districtCode: response.data.district_code,
                raw: response.data
            };
        }
        throw new Error(response.error?.message || 'Verification failed');
    }

    async sendVerificationOTP(aadhaarNumber) {
        if (!this.isProduction && !this.apiKey) {
            return { success: true, message: 'OTP sent to registered mobile (demo)', referenceId: `OTP_${Date.now()}` };
        }

        const response = await this.makeRequest('POST', `${this.bisUrl}/v1/beneficiary/send-otp`, {
            hospital_id: this.hospitalId,
            aadhaar_number: aadhaarNumber
        });

        return {
            success: response.success,
            referenceId: response.data?.reference_id,
            message: response.data?.message || 'OTP sent'
        };
    }

    // ============================================
    // Pre-Authorization (TMS)
    // ============================================

    async checkEligibility(patient, policyNumber) {
        // For PMJAY, eligibility is via BIS beneficiary verification
        return await this.searchBeneficiary({
            searchType: 'pmjay_id',
            searchValue: policyNumber
        });
    }

    async submitPreAuth(preauthData) {
        this.log('Submitting PMJAY pre-auth', { packageCode: preauthData.packageCode });

        if (!this.isProduction && !this.apiKey) {
            return {
                referenceId: `PMJAY_PA_${Date.now()}`,
                preauthNumber: `PAB${Math.random().toString().substr(2, 10)}`,
                status: 'pending',
                message: 'Pre-auth submitted to NHA (demo)',
                demo: true
            };
        }

        const response = await this.makeRequest('POST', `${this.tmsUrl}/v1/preauth/submit`, {
            hospital_id: this.hospitalId,
            sha_code: this.shaCode,
            pmjay_id: preauthData.pmjayId,
            family_id: preauthData.familyId,
            package_code: preauthData.packageCode,
            package_amount: preauthData.packageAmount,
            implant_amount: preauthData.implantAmount || 0,
            admission_date: preauthData.admissionDate,
            diagnosis: preauthData.diagnosis,
            treatment_details: preauthData.treatmentDetails,
            documents: preauthData.documents || []
        });

        if (response.success) {
            return {
                referenceId: response.data.preauth_id,
                preauthNumber: response.data.preauth_number,
                status: this.mapStatus(response.data.status),
                raw: response.data
            };
        }
        throw new Error(response.error?.message || 'Pre-auth submission failed');
    }

    async getPreAuthStatus(preauthId) {
        if (!this.isProduction && !this.apiKey) {
            return {
                status: 'approved',
                approvedAmount: 25000,
                approvedPackage: 'Appendectomy - Open',
                remarks: 'Approved as per PMJAY package rates (demo)',
                demo: true
            };
        }

        const response = await this.makeRequest('GET', `${this.tmsUrl}/v1/preauth/${preauthId}/status`);

        if (response.success) {
            return {
                status: this.mapStatus(response.data.status),
                approvedAmount: response.data.approved_amount,
                approvedPackage: response.data.package_name,
                remarks: response.data.remarks,
                raw: response.data
            };
        }
        throw new Error(response.error?.message || 'Status check failed');
    }

    async enhancePreAuth(preauthId, enhancementData) {
        if (!this.isProduction && !this.apiKey) {
            return { success: true, message: 'Enhancement submitted (demo)' };
        }

        const response = await this.makeRequest('POST', `${this.tmsUrl}/v1/preauth/${preauthId}/enhance`, {
            hospital_id: this.hospitalId,
            additional_amount: enhancementData.additionalAmount,
            reason: enhancementData.reason,
            documents: enhancementData.documents || []
        });

        return { success: response.success, message: response.data?.message };
    }

    // ============================================
    // Claims (TMS)
    // ============================================

    async submitClaim(claimData) {
        this.log('Submitting PMJAY claim', { preauthId: claimData.preauthId });

        if (!this.isProduction && !this.apiKey) {
            return {
                referenceId: `PMJAY_CLM_${Date.now()}`,
                claimNumber: `CAB${Math.random().toString().substr(2, 10)}`,
                status: 'submitted',
                demo: true
            };
        }

        const response = await this.makeRequest('POST', `${this.tmsUrl}/v1/claims/submit`, {
            hospital_id: this.hospitalId,
            preauth_id: claimData.preauthId,
            discharge_date: claimData.dischargeDate,
            discharge_reason: claimData.dischargeReason || 'treatment_complete',
            claimed_amount: claimData.claimedAmount,
            implant_amount: claimData.implantAmount || 0,
            documents: claimData.documents || []
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
            return {
                status: 'approved',
                approvedAmount: 25000,
                settlementStatus: 'pending_settlement',
                demo: true
            };
        }

        const response = await this.makeRequest('GET', `${this.tmsUrl}/v1/claims/${claimId}/status`);

        if (response.success) {
            return {
                status: this.mapStatus(response.data.status),
                approvedAmount: response.data.approved_amount,
                settlementStatus: response.data.settlement_status,
                settlementReference: response.data.settlement_reference,
                raw: response.data
            };
        }
        throw new Error(response.error?.message || 'Status check failed');
    }

    // ============================================
    // Packages (Using HBP 2.0 Database)
    // ============================================

    /**
     * Get PMJAY packages from HBP 2.0 database
     * @param {string} specialty - Optional specialty code filter
     * @param {Object} options - Additional filters
     */
    async getPackages(specialty = null, options = {}) {
        // Import HBPRateService for database lookup
        const hbpRateService = require('../HBPRateService');
        
        try {
            if (specialty) {
                // Get packages by specialty from database
                const packages = await hbpRateService.getPackagesBySpecialty(specialty, options);
                return packages.map(pkg => ({
                    code: pkg.code,
                    name: pkg.name,
                    amount: parseFloat(pkg.base_rate),
                    tier1Rate: pkg.tier1_rate ? parseFloat(pkg.tier1_rate) : null,
                    tier2Rate: pkg.tier2_rate ? parseFloat(pkg.tier2_rate) : null,
                    specialty: pkg.specialty_name,
                    specialtyCode: pkg.specialty_code,
                    requiresPreauth: pkg.requires_preauth,
                    isSurgical: pkg.is_surgical,
                    expectedLos: pkg.expected_los,
                    source: 'hbp_database'
                }));
            }
            
            // Search mode with query option
            if (options.search) {
                const packages = await hbpRateService.searchPackages(options.search, options.limit || 20);
                return packages.map(pkg => ({
                    code: pkg.code,
                    name: pkg.name,
                    amount: parseFloat(pkg.base_rate),
                    specialty: pkg.specialty_name,
                    specialtyCode: pkg.specialty_code,
                    requiresPreauth: pkg.requires_preauth,
                    source: 'hbp_database'
                }));
            }
            
            // Return empty array if no filter provided
            return [];
        } catch (error) {
            this.log('Error fetching packages from HBP database, falling back to demo data', { error: error.message });
            // Fallback to demo data if database fails
            return [
                { code: 'GS001', name: 'Appendicectomy - Open', amount: 17000, specialty: 'General Surgery', source: 'demo_fallback' },
                { code: 'GS002', name: 'Appendicectomy - Laparoscopic', amount: 25000, specialty: 'General Surgery', source: 'demo_fallback' },
                { code: 'OP001', name: 'Cataract Surgery - SICS', amount: 10000, specialty: 'Ophthalmology', source: 'demo_fallback' },
                { code: 'MC002', name: 'PTCA - Single Stent', amount: 45000, specialty: 'Cardiology', source: 'demo_fallback' }
            ];
        }
    }

    /**
     * Get package details by code with tier-adjusted rate
     * @param {string} packageCode - Package code (e.g., 'GS001')
     * @param {string} cityTier - T1, T2, or T3
     */
    async getPackageDetails(packageCode, cityTier = 'T2') {
        const hbpRateService = require('../HBPRateService');
        
        try {
            const packageData = await hbpRateService.getPackageRate(packageCode, cityTier);
            if (!packageData) return null;
            
            // Also get procedures for this package
            const procedures = await hbpRateService.getProceduresByPackage(packageCode);
            
            return {
                ...packageData,
                procedures: procedures.map(p => ({
                    code: p.code,
                    name: p.name,
                    rate: parseFloat(p.rate),
                    requiresPreauth: p.requires_preauth
                })),
                source: 'hbp_database'
            };
        } catch (error) {
            this.log('Error fetching package details', { packageCode, error: error.message });
            return null;
        }
    }

    /**
     * Suggest packages based on diagnosis (AI-assisted)
     * @param {string} diagnosis - Diagnosis text
     * @param {Array<string>} icdCodes - Optional ICD-10 codes
     */
    async suggestPackages(diagnosis, icdCodes = []) {
        const hbpRateService = require('../HBPRateService');
        
        try {
            return await hbpRateService.suggestPackages(diagnosis, icdCodes);
        } catch (error) {
            this.log('Error suggesting packages', { diagnosis, error: error.message });
            return [];
        }
    }

    // ============================================
    // Webhooks
    // ============================================

    async handleWebhook(payload, signature) {
        const computedSignature = crypto
            .createHmac('sha256', this.apiKey || 'demo')
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
                type: payload.transaction_type
            }
        };
    }

    async testConnection() {
        if (!this.isProduction && !this.apiKey) {
            return { success: true, message: 'PMJAY demo mode active' };
        }
        const response = await this.makeRequest('GET', `${this.tmsUrl}/v1/health`);
        return { success: response.success, message: response.success ? 'NHA connection successful' : 'Connection failed' };
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
                reimbursement: false, // PMJAY is cashless only
                realtime: true,
                webhooks: true,
                beneficiarySearch: true,
                eKYC: true,
                packages: true
            }
        };
    }

    // ============================================
    // Simulation (Demo Mode)
    // ============================================

    simulateBeneficiarySearch(params) {
        return {
            found: true,
            beneficiaries: [{
                pmjayId: params.searchValue || 'PMJAY123456789',
                familyId: 'FAM987654321',
                name: 'Demo Beneficiary',
                fatherName: 'Demo Father',
                gender: 'Male',
                age: 45,
                stateCode: 'KA',
                districtCode: '560001',
                isEligible: true
            }],
            demo: true
        };
    }

    simulateVerification(data) {
        return {
            verified: true,
            isEligible: true,
            beneficiaryName: 'Demo Beneficiary',
            familyId: data.familyId || 'FAM987654321',
            stateCode: 'KA',
            districtCode: '560001',
            demo: true
        };
    }
}

module.exports = PMJAYAdapter;
