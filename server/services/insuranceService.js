/**
 * Insurance Service
 * WOLF HMS - Phase 2 Insurance/TPA Integration
 */

const pool = require('../config/db');

class InsuranceService {

    /**
     * Get all insurance providers (TPAs)
     */
    async getProviders() {
        const result = await pool.query(`
            SELECT id, name, short_name, code, website, toll_free, 
                   network_hospitals, avg_settlement_days, approval_rate, is_active
            FROM insurance_providers 
            WHERE is_active = true
            ORDER BY network_hospitals DESC
        `);
        return result.rows;
    }

    /**
     * Verify patient insurance policy
     * @param {string} policyNumber - Policy number to verify
     * @param {string} providerId - TPA provider ID
     */
    async verifyPolicy(policyNumber, providerId) {
        try {
            // In production, call TPA API for real-time verification
            // For now, simulate verification based on policy format

            const provider = await pool.query(
                'SELECT * FROM insurance_providers WHERE id = $1',
                [providerId]
            );

            if (provider.rows.length === 0) {
                return { valid: false, error: 'Unknown insurance provider' };
            }

            // Simulate API call response
            const isValid = policyNumber && policyNumber.length >= 6;

            const response = {
                valid: isValid,
                provider: provider.rows[0].short_name,
                policyNumber,
                verifiedAt: new Date().toISOString(),
                // Simulated policy details
                policyDetails: isValid ? {
                    sumInsured: 500000,
                    balanceRemaining: 450000,
                    policyType: 'Floater',
                    roomRentLimit: 5000,
                    copayPercentage: 10,
                    validFrom: '2024-01-01',
                    validTo: '2025-12-31',
                    coverageStatus: 'Active'
                } : null
            };

            return response;

        } catch (error) {
            console.error('[InsuranceService] Verify policy error:', error);
            throw error;
        }
    }

    /**
     * Link insurance to patient
     * @param {string} patientId - Patient UUID
     * @param {object} insuranceData - Insurance details
     */
    async linkPatientInsurance(patientId, insuranceData) {
        try {
            const {
                provider_id, policy_number, policy_type, company_name,
                sum_insured, balance_remaining, room_rent_limit,
                valid_from, valid_to, member_id
            } = insuranceData;

            const result = await pool.query(`
                INSERT INTO patient_insurance 
                (patient_id, provider_id, policy_number, policy_type, company_name,
                 sum_insured, balance_remaining, room_rent_limit, valid_from, valid_to, member_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `, [patientId, provider_id, policy_number, policy_type, company_name,
                sum_insured, balance_remaining, room_rent_limit, valid_from, valid_to, member_id]);

            return result.rows[0];

        } catch (error) {
            console.error('[InsuranceService] Link insurance error:', error);
            throw error;
        }
    }

    /**
     * Get patient's insurance policies
     * @param {string} patientId - Patient UUID
     */
    async getPatientInsurance(patientId) {
        const result = await pool.query(`
            SELECT pi.*, ip.name as provider_name, ip.short_name, ip.toll_free
            FROM patient_insurance pi
            LEFT JOIN insurance_providers ip ON pi.provider_id = ip.id
            WHERE pi.patient_id = $1 AND pi.is_active = true
            ORDER BY pi.created_at DESC
        `, [patientId]);
        return result.rows;
    }

    /**
     * Create pre-authorization request
     * @param {object} preauthData - Pre-auth request data
     */
    async createPreAuth(preauthData) {
        try {
            const {
                admission_id, patient_insurance_id, requested_amount,
                diagnosis_codes, procedure_codes, primary_diagnosis,
                treatment_type, expected_los, room_type, requested_by
            } = preauthData;

            // Generate pre-auth number
            const requestNumber = `PA${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            const result = await pool.query(`
                INSERT INTO preauth_requests 
                (request_number, admission_id, patient_insurance_id, requested_amount,
                 diagnosis_codes, procedure_codes, status, requested_by, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW())
                RETURNING *
            `, [requestNumber, admission_id, patient_insurance_id, requested_amount,
                diagnosis_codes, procedure_codes, requested_by]);

            // In production, submit to TPA API here
            console.log(`[InsuranceService] Pre-auth created: ${requestNumber}`);

            return result.rows[0];

        } catch (error) {
            console.error('[InsuranceService] Create pre-auth error:', error);
            throw error;
        }
    }

    /**
     * Get pre-authorization status
     * @param {string} requestNumber - Pre-auth request number
     */
    async getPreAuthStatus(requestNumber) {
        const result = await pool.query(`
            SELECT pr.*, 
                   pi.policy_number, pi.sum_insured,
                   ip.name as provider_name, ip.short_name, ip.toll_free
            FROM preauth_requests pr
            LEFT JOIN patient_insurance pi ON pr.patient_insurance_id = pi.id
            LEFT JOIN insurance_providers ip ON pi.provider_id = ip.id
            WHERE pr.request_number = $1
        `, [requestNumber]);
        return result.rows[0];
    }

    /**
     * Update pre-authorization (approve/reject)
     * @param {number} preauthId - Pre-auth ID
     * @param {object} updateData - Update data
     */
    async updatePreAuth(preauthId, updateData) {
        const { status, approved_amount, tpa_response, notes } = updateData;

        const result = await pool.query(`
            UPDATE preauth_requests
            SET status = $1,
                approved_amount = $2,
                tpa_response = $3,
                notes = $4,
                responded_at = NOW()
            WHERE id = $5
            RETURNING *
        `, [status, approved_amount, JSON.stringify(tpa_response), notes, preauthId]);

        return result.rows[0];
    }

    /**
     * Create insurance claim
     * @param {object} claimData - Claim data
     */
    async createClaim(claimData) {
        try {
            const {
                invoice_id, patient_insurance_id, preauth_id,
                claim_type, claimed_amount
            } = claimData;

            // Generate claim number
            const claimNumber = `CLM${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            const result = await pool.query(`
                INSERT INTO insurance_claims 
                (claim_number, invoice_id, patient_insurance_id, preauth_id,
                 claim_type, claimed_amount, status, submitted_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'submitted', NOW())
                RETURNING *
            `, [claimNumber, invoice_id, patient_insurance_id, preauth_id,
                claim_type, claimed_amount]);

            console.log(`[InsuranceService] Claim created: ${claimNumber}`);

            return result.rows[0];

        } catch (error) {
            console.error('[InsuranceService] Create claim error:', error);
            throw error;
        }
    }

    /**
     * Get claim details
     * @param {string} claimNumber - Claim number
     */
    async getClaimDetails(claimNumber) {
        const result = await pool.query(`
            SELECT ic.*, 
                   i.total_amount as invoice_total, i.amount_paid,
                   pi.policy_number,
                   ip.name as provider_name, ip.short_name,
                   pr.preauth_number, pr.approved_amount as preauth_amount
            FROM insurance_claims ic
            LEFT JOIN invoices i ON ic.invoice_id = i.id
            LEFT JOIN patient_insurance pi ON ic.patient_insurance_id = pi.id
            LEFT JOIN insurance_providers ip ON pi.provider_id = ip.id
            LEFT JOIN preauth_requests pr ON ic.preauth_id = pr.id
            WHERE ic.claim_number = $1
        `, [claimNumber]);
        return result.rows[0];
    }

    /**
     * Update claim status
     * @param {number} claimId - Claim ID
     * @param {object} updateData - Update data
     */
    async updateClaim(claimId, updateData) {
        const { status, approved_amount, patient_liability, rejection_reason, rejection_code } = updateData;

        const result = await pool.query(`
            UPDATE insurance_claims
            SET status = $1,
                approved_amount = $2,
                patient_liability = $3,
                rejection_reason = $4,
                rejection_code = $5,
                updated_at = NOW()
            WHERE id = $6
            RETURNING *
        `, [status, approved_amount, patient_liability, rejection_reason, rejection_code, claimId]);

        return result.rows[0];
    }

    /**
     * Settle claim
     * @param {number} claimId - Claim ID
     * @param {object} settlementData - Settlement data
     */
    async settleClaim(claimId, settlementData) {
        const { settlement_amount, utr_number } = settlementData;

        const result = await pool.query(`
            UPDATE insurance_claims
            SET status = 'settled',
                settlement_amount = $1,
                settlement_date = CURRENT_DATE,
                utr_number = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `, [settlement_amount, utr_number, claimId]);

        // Update invoice if claim is settled
        if (result.rows.length > 0) {
            const claim = result.rows[0];
            await pool.query(`
                UPDATE invoices 
                SET amount_paid = amount_paid + $1,
                    status = CASE WHEN amount_paid + $1 >= total_amount THEN 'Paid' ELSE 'Partially Paid' END
                WHERE id = $2
            `, [settlement_amount, claim.invoice_id]);
        }

        return result.rows[0];
    }

    /**
     * Get all pending claims
     */
    async getPendingClaims() {
        const result = await pool.query(`
            SELECT ic.*, 
                   p.name as patient_name,
                   ip.short_name as provider_name,
                   i.total_amount as invoice_total
            FROM insurance_claims ic
            LEFT JOIN invoices i ON ic.invoice_id = i.id
            LEFT JOIN patients p ON i.patient_id = p.id
            LEFT JOIN patient_insurance pi ON ic.patient_insurance_id = pi.id
            LEFT JOIN insurance_providers ip ON pi.provider_id = ip.id
            WHERE ic.status IN ('submitted', 'under_review', 'query')
            ORDER BY ic.submitted_at DESC
        `);
        return result.rows;
    }

    /**
     * Get claim statistics
     */
    async getClaimStats() {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_claims,
                COUNT(*) FILTER (WHERE status = 'settled') as settled_claims,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_claims,
                COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review')) as pending_claims,
                COALESCE(SUM(claimed_amount), 0) as total_claimed,
                COALESCE(SUM(settlement_amount), 0) as total_settled,
                COALESCE(AVG(EXTRACT(DAY FROM (settlement_date - submitted_at::date))), 0) as avg_settlement_days
            FROM insurance_claims
            WHERE submitted_at >= NOW() - INTERVAL '90 days'
        `);
        return result.rows[0];
    }

    /**
     * Get denial codes for AI suggestions
     */
    async getDenialCodes() {
        const result = await pool.query(`
            SELECT * FROM denial_codes ORDER BY code
        `);
        return result.rows;
    }

    /**
     * Predict denial risk using simple rules (placeholder for ML model)
     * @param {object} claimData - Claim data to analyze
     */
    async predictDenialRisk(claimData) {
        const { diagnosis_codes, procedure_codes, preauth_approved, documentation_score, claim_amount } = claimData;

        let riskScore = 0;
        const riskFactors = [];

        // Simple rule-based scoring
        if (!preauth_approved) {
            riskScore += 30;
            riskFactors.push({ code: 'CO-15', weight: 30, message: 'No pre-authorization' });
        }

        if (documentation_score && documentation_score < 70) {
            riskScore += 25;
            riskFactors.push({ code: 'CO-204', weight: 25, message: 'Documentation score below threshold' });
        }

        if (claim_amount > 200000) {
            riskScore += 15;
            riskFactors.push({ code: 'CO-45', weight: 15, message: 'High claim amount - may require additional review' });
        }

        if (!diagnosis_codes || diagnosis_codes.length === 0) {
            riskScore += 20;
            riskFactors.push({ code: 'CO-11', weight: 20, message: 'Missing diagnosis codes' });
        }

        return {
            riskScore: Math.min(riskScore, 100),
            riskLevel: riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low',
            riskFactors,
            recommendations: riskFactors.map(f => {
                const dc = denialCodeMap[f.code];
                return dc ? dc.prevention_tip : 'Review documentation';
            })
        };
    }
}

// Denial code map for quick lookup
const denialCodeMap = {
    'CO-4': { prevention_tip: 'Review modifier requirements before submission' },
    'CO-11': { prevention_tip: 'Use AI-assisted coding suggestions' },
    'CO-15': { prevention_tip: 'Always verify pre-auth before admission' },
    'CO-16': { prevention_tip: 'Use form validation before submission' },
    'CO-45': { prevention_tip: 'Price benchmarking against market rates' },
    'CO-50': { prevention_tip: 'Include detailed clinical notes' },
    'CO-204': { prevention_tip: 'Attach all required documents' }
};

// Singleton instance
let insuranceServiceInstance = null;

const getInsuranceService = () => {
    if (!insuranceServiceInstance) {
        insuranceServiceInstance = new InsuranceService();
    }
    return insuranceServiceInstance;
};

module.exports = { InsuranceService, getInsuranceService };
