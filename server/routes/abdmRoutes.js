const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { protect: verifyToken, authorize: authorizeRole } = require('../middleware/authMiddleware');
const AbdmService = require('../services/AbdmService');

// ============================================
// G3.1: ABDM Consent Management Routes
// ============================================

/**
 * POST /api/abdm/verify-abha
 * Verify an ABHA ID against ABDM registry
 */
router.post('/verify-abha', verifyToken, asyncHandler(async (req, res) => {
    const { abha_id } = req.body;

    if (!abha_id || abha_id.length !== 14) {
        return ResponseHandler.error(res, 'Valid 14-digit ABHA ID required', 400);
    }

    const result = await AbdmService.verifyAbhaId(abha_id);
    ResponseHandler.success(res, result);
}));

/**
 * POST /api/abdm/consent/request
 * Request consent from a patient to access their health records
 */
router.post('/consent/request', verifyToken, asyncHandler(async (req, res) => {
    const { patient_abha_id, purpose, date_from, date_to } = req.body;
    const hospitalId = req.hospital_id;
    const userId = req.user?.id;

    if (!patient_abha_id) {
        return ResponseHandler.error(res, 'Patient ABHA ID required', 400);
    }

    const result = await AbdmService.requestConsent({
        patientAbhaId: patient_abha_id,
        purpose: purpose || 'CAREMGT',
        dateRange: { from: date_from, to: date_to },
        hospitalId,
        requestedBy: userId
    });

    ResponseHandler.success(res, result, 'Consent request created');
}));

/**
 * POST /api/abdm/consent/callback
 * ABDM webhook callback for consent notifications
 */
router.post('/consent/callback', asyncHandler(async (req, res) => {
    const result = await AbdmService.handleConsentCallback(req.body);
    res.json(result);
}));

/**
 * GET /api/abdm/consent/status/:abha_id
 * Get consent status for a patient
 */
router.get('/consent/status/:abha_id', verifyToken, asyncHandler(async (req, res) => {
    const { abha_id } = req.params;
    const hospitalId = req.hospital_id;

    const consents = await AbdmService.getConsentStatus(abha_id, hospitalId);
    ResponseHandler.success(res, consents);
}));

// ============================================
// G3.2: Cross-Hospital Patient Linking
// ============================================

/**
 * GET /api/abdm/cross-hospital/:abha_id
 * Find all hospitals where this ABHA ID has been registered
 */
router.get('/cross-hospital/:abha_id', verifyToken, asyncHandler(async (req, res) => {
    const { abha_id } = req.params;

    const result = await pool.query(`
        SELECT chl.*, h.name as hospital_name, h.code as hospital_code
        FROM cross_hospital_links chl
        JOIN hospitals h ON chl.hospital_id = h.id
        WHERE chl.abha_id = $1
        ORDER BY chl.is_primary DESC, chl.linked_at DESC
    `, [abha_id]);

    ResponseHandler.success(res, {
        abha_id,
        hospitals: result.rows.length,
        links: result.rows
    });
}));

/**
 * POST /api/abdm/cross-hospital/link
 * Link a patient's ABHA ID across the current hospital
 */
router.post('/cross-hospital/link', verifyToken, asyncHandler(async (req, res) => {
    const { patient_id, abha_id } = req.body;
    const hospitalId = req.hospital_id;
    const userId = req.user?.id;

    if (!patient_id || !abha_id) {
        return ResponseHandler.error(res, 'patient_id and abha_id required', 400);
    }

    const patientRes = await pool.query(
        'SELECT id, name, uhid FROM patients WHERE id = $1 AND hospital_id = $2',
        [patient_id, hospitalId]
    );

    if (patientRes.rows.length === 0) {
        return ResponseHandler.error(res, 'Patient not found', 404);
    }

    const patient = patientRes.rows[0];

    const existing = await pool.query(
        'SELECT id FROM cross_hospital_links WHERE abha_id = $1 AND hospital_id = $2',
        [abha_id, hospitalId]
    );

    if (existing.rows.length > 0) {
        return ResponseHandler.success(res, { already_linked: true }, 'Already linked');
    }

    const linkCount = await pool.query(
        'SELECT COUNT(*) FROM cross_hospital_links WHERE abha_id = $1',
        [abha_id]
    );
    const isPrimary = Number.parseInt(linkCount.rows[0].count) === 0;

    const result = await pool.query(`
        INSERT INTO cross_hospital_links 
        (abha_id, hospital_id, patient_id, patient_uhid, patient_name, linked_by, is_primary)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `, [abha_id, hospitalId, patient_id, patient.uhid, patient.name, userId, isPrimary]);

    ResponseHandler.success(res, result.rows[0], 'Patient linked via ABHA');
}));

/**
 * GET /api/abdm/cross-hospital/history/:abha_id
 * Get combined visit history across all hospitals for an ABHA ID
 */
router.get('/cross-hospital/history/:abha_id', verifyToken, authorizeRole('admin', 'super_admin', 'doctor'), asyncHandler(async (req, res) => {
    const { abha_id } = req.params;

    const links = await pool.query(
        'SELECT patient_id, hospital_id, patient_uhid FROM cross_hospital_links WHERE abha_id = $1',
        [abha_id]
    );

    if (links.rows.length === 0) {
        return ResponseHandler.success(res, { history: [], message: 'No cross-hospital links found' });
    }

    const patientIds = links.rows.map(l => l.patient_id);

    const admissions = await pool.query(`
        SELECT a.id, a.ipd_number, a.admission_date, a.discharge_date, a.status, a.ward,
               p.name, p.uhid, h.name as hospital_name
        FROM admissions a
        JOIN patients p ON a.patient_id = p.id
        JOIN hospitals h ON a.hospital_id = h.id
        WHERE a.patient_id = ANY($1)
        ORDER BY a.admission_date DESC LIMIT 50
    `, [patientIds]);

    const visits = await pool.query(`
        SELECT ov.id, ov.visit_date, ov.complaint,
               p.name, p.uhid, h.name as hospital_name
        FROM opd_visits ov
        JOIN patients p ON ov.patient_id = p.id
        JOIN hospitals h ON p.hospital_id = h.id
        WHERE ov.patient_id = ANY($1)
        ORDER BY ov.visit_date DESC LIMIT 50
    `, [patientIds]);

    ResponseHandler.success(res, {
        abha_id,
        linked_hospitals: links.rows.length,
        admissions: admissions.rows,
        opd_visits: visits.rows
    });
}));

module.exports = router;
