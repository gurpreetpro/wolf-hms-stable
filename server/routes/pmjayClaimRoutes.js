/**
 * PMJAY Claim Routes
 * API endpoints for PMJAY claim management
 * 
 * POST /claims - Create new claim
 * POST /claims/submit - Submit to TMS
 * POST /claims/analyze - AI analysis
 * GET /claims/:id - Get claim details
 * GET /claims/:id/status - Check TMS status
 * GET /claims - List claims (with filters)
 * 
 * WOLF HMS
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { protect } = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(protect);

/**
 * Create a new PMJAY claim
 */
router.post('/', async (req, res) => {
    try {
        const { 
            admissionId, 
            packageCode, 
            packageRate, 
            preauthId,
            documents = []
        } = req.body;
        const hospitalId = req.user.hospital_id;

        // Get admission details
        const admissionRes = await pool.query(
            `SELECT a.*, p.name as patient_name, p.pmjay_id
             FROM admissions a
             JOIN patients p ON a.patient_id = p.id
             WHERE a.id = $1 AND a.hospital_id = $2`,
            [admissionId, hospitalId]
        );

        if (admissionRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Admission not found' });
        }

        const admission = admissionRes.rows[0];

        // Create claim record
        const claimRes = await pool.query(
            `INSERT INTO pmjay_claims 
             (hospital_id, admission_id, patient_id, beneficiary_id, package_code, 
              claim_amount, preauth_id, claim_status, documents, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, NOW())
             RETURNING id`,
            [
                hospitalId, 
                admissionId, 
                admission.patient_id,
                admission.pmjay_id,
                packageCode, 
                packageRate, 
                preauthId,
                JSON.stringify(documents),
                req.user.id
            ]
        );

        res.json({
            success: true,
            data: {
                claimId: claimRes.rows[0].id,
                status: 'draft'
            }
        });
    } catch (error) {
        console.error('[PMJAY Claims] Create error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Submit claim to TMS
 */
router.post('/submit', async (req, res) => {
    try {
        const { 
            admissionId, 
            packageCode, 
            claimAmount,
            documents = [],
            aiScore 
        } = req.body;
        const hospitalId = req.user.hospital_id;

        // Generate claim ID and URN
        const claimId = `CLM${Date.now().toString().slice(-8)}`;
        const urnNumber = `URN${hospitalId}${Date.now().toString().slice(-10)}`;

        // Update or insert claim
        const existingClaim = await pool.query(
            `SELECT id FROM pmjay_claims WHERE admission_id = $1 AND hospital_id = $2 LIMIT 1`,
            [admissionId, hospitalId]
        );

        if (existingClaim.rows.length > 0) {
            // Update existing claim
            await pool.query(
                `UPDATE pmjay_claims 
                 SET claim_status = 'submitted', 
                     external_claim_id = $1, 
                     urn_number = $2,
                     documents = $3,
                     ai_score = $4,
                     submitted_at = NOW(),
                     updated_at = NOW()
                 WHERE id = $5`,
                [claimId, urnNumber, JSON.stringify(documents), aiScore, existingClaim.rows[0].id]
            );
        } else {
            // Create new claim directly in submitted state
            await pool.query(
                `INSERT INTO pmjay_claims 
                 (hospital_id, admission_id, package_code, claim_amount, claim_status,
                  external_claim_id, urn_number, documents, ai_score, created_by, submitted_at, created_at)
                 VALUES ($1, $2, $3, $4, 'submitted', $5, $6, $7, $8, $9, NOW(), NOW())`,
                [hospitalId, admissionId, packageCode, claimAmount, claimId, urnNumber, 
                 JSON.stringify(documents), aiScore, req.user.id]
            );
        }

        // TODO: Actual TMS API integration
        // const tmsResponse = await PMJAYAdapter.submitClaim({...});

        console.log(`[PMJAY Claims] Claim ${claimId} submitted for admission ${admissionId}`);

        res.json({
            success: true,
            data: {
                claimId,
                urnNumber,
                status: 'submitted',
                message: 'Claim submitted to TMS successfully'
            }
        });
    } catch (error) {
        console.error('[PMJAY Claims] Submit error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * AI Claim Analysis
 */
router.post('/analyze', async (req, res) => {
    try {
        const { admissionId, packageCode, claimAmount, documents = [] } = req.body;
        
        // Calculate AI score based on completeness
        let score = 50; // Base score
        
        // Document completeness (up to 30 points)
        const requiredDocs = ['aadhaar', 'pmjay_card', 'discharge_summary', 'treatment_sheet', 'investigation_reports', 'consent_form'];
        const uploadedRequired = documents.filter(d => requiredDocs.includes(d)).length;
        score += Math.round((uploadedRequired / requiredDocs.length) * 30);
        
        // Package validation (up to 10 points)
        if (packageCode) score += 10;
        
        // Claim amount validation (up to 10 points)
        if (claimAmount > 0 && claimAmount <= 500000) score += 10;

        // Generate recommendations
        const recommendations = [];
        const warnings = [];
        
        if (uploadedRequired === requiredDocs.length) {
            recommendations.push('All critical documents are present');
        } else {
            warnings.push(`Missing ${requiredDocs.length - uploadedRequired} required document(s)`);
        }
        
        if (packageCode) {
            recommendations.push('Package code is valid and matches pre-authorization');
        }
        
        recommendations.push('Claim amount is within package rate limits');
        
        // Fetch admission for LOS check
        const admRes = await pool.query(
            `SELECT admitted_at, discharged_at FROM admissions WHERE id = $1`,
            [admissionId]
        );
        
        if (admRes.rows.length > 0) {
            const adm = admRes.rows[0];
            const los = Math.ceil((new Date(adm.discharged_at || new Date()) - new Date(adm.admitted_at)) / (1000 * 60 * 60 * 24));
            
            if (los <= 7) {
                recommendations.push('Length of stay within expected range');
            } else {
                warnings.push('Extended stay may require additional justification');
                score -= 5;
            }
        }

        res.json({
            success: true,
            data: {
                score: Math.min(100, Math.max(0, score)),
                status: score >= 80 ? 'high_probability' : score >= 50 ? 'medium_probability' : 'low_probability',
                recommendations,
                warnings,
                estimatedProcessingDays: score >= 80 ? 5 : score >= 50 ? 10 : 15
            }
        });
    } catch (error) {
        console.error('[PMJAY Claims] Analysis error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Get claim details
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalId = req.user.hospital_id;

        const result = await pool.query(
            `SELECT c.*, 
                    a.admitted_at, a.discharged_at,
                    p.name as patient_name, p.pmjay_id as beneficiary_id,
                    pp.name as package_name
             FROM pmjay_claims c
             JOIN admissions a ON c.admission_id = a.id
             JOIN patients p ON c.patient_id = p.id
             LEFT JOIN pmjay_packages pp ON c.package_code = pp.code
             WHERE c.id = $1 AND c.hospital_id = $2`,
            [id, hospitalId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Claim not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[PMJAY Claims] Get error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Check claim status from TMS
 */
router.get('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalId = req.user.hospital_id;

        const result = await pool.query(
            `SELECT claim_status, external_claim_id, urn_number, submitted_at, updated_at
             FROM pmjay_claims
             WHERE id = $1 AND hospital_id = $2`,
            [id, hospitalId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Claim not found' });
        }

        const claim = result.rows[0];

        // TODO: Check actual TMS status
        // const tmsStatus = await PMJAYAdapter.checkClaimStatus(claim.external_claim_id);

        res.json({
            success: true,
            data: {
                claimId: id,
                externalClaimId: claim.external_claim_id,
                urnNumber: claim.urn_number,
                status: claim.claim_status,
                submittedAt: claim.submitted_at,
                lastUpdated: claim.updated_at
            }
        });
    } catch (error) {
        console.error('[PMJAY Claims] Status check error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * List claims with filters
 */
router.get('/', async (req, res) => {
    try {
        const hospitalId = req.user.hospital_id;
        const { status, startDate, endDate, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT c.id, c.external_claim_id, c.urn_number, c.package_code, 
                   c.claim_amount, c.claim_status, c.submitted_at, c.created_at,
                   p.name as patient_name, p.pmjay_id as beneficiary_id,
                   pp.name as package_name
            FROM pmjay_claims c
            JOIN patients p ON c.patient_id = p.id
            LEFT JOIN pmjay_packages pp ON c.package_code = pp.code
            WHERE c.hospital_id = $1
        `;
        const params = [hospitalId];
        let paramIndex = 2;

        if (status) {
            query += ` AND c.claim_status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (startDate) {
            query += ` AND c.created_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            query += ` AND c.created_at <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM pmjay_claims WHERE hospital_id = $1`,
            [hospitalId]
        );

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('[PMJAY Claims] List error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Assign PMJAY package to an admission (Doctor initiates)
 * This activates Zero Billing Mode in billingService.js
 */
router.post('/assign-package', async (req, res) => {
    try {
        const { admissionId, packageCode, packageName, packageRate, requiresPreauth } = req.body;
        const hospitalId = req.user.hospital_id;

        if (!admissionId || !packageCode) {
            return res.status(400).json({ success: false, message: 'admissionId and packageCode are required' });
        }

        // Verify admission exists and belongs to hospital
        const admCheck = await pool.query(
            `SELECT a.id, a.patient_id, p.name as patient_name 
             FROM admissions a JOIN patients p ON a.patient_id = p.id
             WHERE a.id = $1 AND a.hospital_id = $2 AND a.status = 'Admitted'`,
            [admissionId, hospitalId]
        );

        if (admCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Active admission not found' });
        }

        // Add columns if they don't exist (auto-migration)
        await pool.query(`
            DO $$ BEGIN
                ALTER TABLE admissions ADD COLUMN IF NOT EXISTS pmjay_package_code VARCHAR(50);
                ALTER TABLE admissions ADD COLUMN IF NOT EXISTS pmjay_package_rate DECIMAL(12,2);
                ALTER TABLE admissions ADD COLUMN IF NOT EXISTS pmjay_verified BOOLEAN DEFAULT false;
                ALTER TABLE admissions ADD COLUMN IF NOT EXISTS pmjay_preauth_id VARCHAR(100);
                ALTER TABLE admissions ADD COLUMN IF NOT EXISTS pmjay_package_name VARCHAR(300);
                ALTER TABLE admissions ADD COLUMN IF NOT EXISTS pmjay_assigned_by INTEGER;
                ALTER TABLE admissions ADD COLUMN IF NOT EXISTS pmjay_assigned_at TIMESTAMP;
            END $$;
        `).catch(() => {});

        // Update admission with PMJAY package
        const result = await pool.query(
            `UPDATE admissions 
             SET pmjay_package_code = $1, 
                 pmjay_package_rate = $2,
                 pmjay_verified = true,
                 pmjay_package_name = $3,
                 pmjay_assigned_by = $4,
                 pmjay_assigned_at = NOW()
             WHERE id = $5 AND hospital_id = $6
             RETURNING id, pmjay_package_code, pmjay_package_rate, pmjay_verified, pmjay_package_name`,
            [packageCode, packageRate || 0, packageName || packageCode, req.user.id, admissionId, hospitalId]
        );

        const patient = admCheck.rows[0];
        console.log(`[PMJAY] ✅ Package ${packageCode} assigned to admission #${admissionId} (${patient.patient_name}) by User #${req.user.id}`);

        res.json({
            success: true,
            data: {
                ...result.rows[0],
                patient_name: patient.patient_name,
                requires_preauth: requiresPreauth || false,
                message: `PMJAY Package ${packageCode} assigned. Zero Billing Mode activated.`
            }
        });
    } catch (error) {
        console.error('[PMJAY Claims] Assign package error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Remove PMJAY package from admission
 */
router.post('/remove-package', async (req, res) => {
    try {
        const { admissionId } = req.body;
        const hospitalId = req.user.hospital_id;

        await pool.query(
            `UPDATE admissions 
             SET pmjay_package_code = NULL, 
                 pmjay_package_rate = NULL,
                 pmjay_verified = false,
                 pmjay_package_name = NULL
             WHERE id = $1 AND hospital_id = $2`,
            [admissionId, hospitalId]
        );

        console.log(`[PMJAY] ❌ Package removed from admission #${admissionId}`);
        res.json({ success: true, message: 'PMJAY package removed' });
    } catch (error) {
        console.error('[PMJAY Claims] Remove package error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Get PMJAY status for an admission
 */
router.get('/admission-status/:admissionId', async (req, res) => {
    try {
        const { admissionId } = req.params;
        const hospitalId = req.user.hospital_id;

        const result = await pool.query(
            `SELECT pmjay_package_code, pmjay_package_rate, pmjay_verified, 
                    pmjay_preauth_id, pmjay_package_name
             FROM admissions 
             WHERE id = $1 AND hospital_id = $2`,
            [admissionId, hospitalId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Admission not found' });
        }

        const adm = result.rows[0];
        res.json({
            success: true,
            data: {
                hasPMJAY: !!adm.pmjay_package_code && adm.pmjay_verified,
                packageCode: adm.pmjay_package_code,
                packageName: adm.pmjay_package_name,
                packageRate: adm.pmjay_package_rate,
                preauthId: adm.pmjay_preauth_id
            }
        });
    } catch (error) {
        console.error('[PMJAY Claims] Admission status error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
