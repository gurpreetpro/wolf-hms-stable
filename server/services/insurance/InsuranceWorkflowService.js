const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const InsuranceFactory = require('./InsuranceFactory');
const pool = require('../../config/db');

class InsuranceWorkflowService {

    /**
     * Check if patient has active insurance coverage
     * @param {string} patientId 
     * @returns {Promise<Object|null>} Policy details or null
     */
    static async checkCoverage(patientId) {
        try {
            const result = await prisma.$queryRaw`
                SELECT * FROM patient_insurance 
                WHERE patient_id = ${patientId}::uuid 
                AND is_active = true 
                AND (policy_end_date IS NULL OR policy_end_date > NOW())
                LIMIT 1
            `;
            
            return result[0] || null;
        } catch (e) {
            console.error('[InsuranceCheck] Error checking coverage:', e);
            return null;
        }
    }

    /**
     * [Phase H5] Check if patient is a government scheme beneficiary (CGHS/ECHS/CAPF)
     * @param {string} patientId 
     * @returns {Promise<Object|null>} Scheme details or null
     */
    static async checkGovtSchemeCoverage(patientId) {
        try {
            const result = await pool.query(
                `SELECT * FROM govt_scheme_beneficiaries 
                 WHERE patient_id = $1 
                 AND verification_status = 'verified'
                 AND (expiry_date IS NULL OR expiry_date > NOW())
                 ORDER BY created_at DESC LIMIT 1`,
                [patientId]
            );
            return result.rows[0] || null;
        } catch (e) {
            // Table may not exist yet — gracefully return null
            console.error('[GovtScheme] Error checking coverage:', e.message);
            return null;
        }
    }

    /**
     * [Phase H5] Get the applicable rate for a procedure under a govt scheme
     * @param {string} patientId 
     * @param {string} procedureCode 
     * @param {Object} hospitalConfig - { nabh, cityTier, wardType, superSpecialty }
     * @returns {Promise<Object|null>} { schemeCode, baseRate, finalRate, modifiers } or null
     */
    static async getApplicableRate(patientId, procedureCode, hospitalConfig = {}) {
        const schemeCoverage = await this.checkGovtSchemeCoverage(patientId);
        if (!schemeCoverage) return null;

        try {
            const GovtRateService = require('./GovtRateService');
            const rate = await GovtRateService.calculateRate(
                schemeCoverage.scheme_code,
                procedureCode,
                hospitalConfig
            );
            return {
                schemeCode: schemeCoverage.scheme_code,
                schemeName: schemeCoverage.scheme_code.toUpperCase(),
                beneficiaryId: schemeCoverage.id,
                cardNumber: schemeCoverage.card_number,
                ...rate
            };
        } catch (e) {
            console.error('[GovtScheme] Rate calculation error:', e.message);
            return null;
        }
    }

    /**
     * [Phase H5] Quick check: should govt scheme rate be applied?
     * @param {string} patientId 
     * @returns {Promise<string|null>} Scheme code ('cghs','echs','capf') or null
     */
    static async shouldApplyGovtRate(patientId) {
        const coverage = await this.checkGovtSchemeCoverage(patientId);
        return coverage ? coverage.scheme_code : null;
    }

    /**
     * Auto-Create PreAuth Draft upon Admission
     * @param {string} admissionId 
     * @param {string} patientId 
     * @param {string} hospitalId 
     */
    static async triggerPreAuthDraft(admissionId, patientId, hospitalId) {
        // Check govt scheme first
        const govtScheme = await this.checkGovtSchemeCoverage(patientId);
        if (govtScheme) {
            console.log(`[WolfLink] 🏛 Gov scheme ${govtScheme.scheme_code.toUpperCase()} detected for Admission ${admissionId}`);
            // For govt schemes, create internal pre-auth tracking
            try {
                await pool.query(
                    `INSERT INTO insurance_preauths (admission_id, patient_id, hospital_id, provider_code, status, description, created_at)
                     VALUES ($1, $2, $3, $4, 'DRAFT', $5, NOW())
                     ON CONFLICT DO NOTHING`,
                    [admissionId, patientId, hospitalId, govtScheme.scheme_code, 
                     `Auto-generated: ${govtScheme.scheme_code.toUpperCase()} beneficiary (Card: ${govtScheme.card_number})`]
                );
            } catch (e) {
                console.warn('[WolfLink] Govt PreAuth tracking note:', e.message);
            }
            return { scheme: govtScheme.scheme_code, type: 'govt' };
        }

        // Fallback to private insurance
        const policy = await this.checkCoverage(patientId);
        if (!policy) return null;

        console.log(`[WolfLink] 🔗 creating PreAuth Draft for Admission ${admissionId}`);

        try {
            const draft = await prisma.insurancePreAuth.create({
                data: {
                    admissionId,
                    patientId,
                    hospitalId,
                    providerCode: policy.provider_code,
                    policyNumber: policy.policy_number,
                    status: 'DRAFT',
                    estimatedAmount: 0,
                    description: 'Auto-generated via Admission Linkage'
                }
            });
            return draft;
        } catch (e) {
            console.warn('[WolfLink] Failed to create PreAuth Draft:', e.message);
            return null;
        }
    }

    /**
     * Gatekeeper for Lab Orders — checks both private insurance and govt schemes
     * @param {string} patientId 
     * @returns {Promise<Object>} { billToInsurance: boolean, schemeCode: string|null }
     */
    static async shouldBillToInsurance(patientId) {
        // Check govt scheme first
        const govtScheme = await this.shouldApplyGovtRate(patientId);
        if (govtScheme) {
            return { billToInsurance: true, schemeCode: govtScheme, type: 'govt' };
        }
        // Check private insurance
        const policy = await this.checkCoverage(patientId);
        if (policy) {
            return { billToInsurance: true, schemeCode: null, type: 'private' };
        }
        return { billToInsurance: false, schemeCode: null, type: null };
    }
}

module.exports = InsuranceWorkflowService;
