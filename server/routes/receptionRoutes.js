const express = require('express');
const router = express.Router();
const { getReceptionStats, getOPDCollections, getCollectionSummary } = require('../controllers/receptionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get reception stats
router.get('/stats', protect, authorize('receptionist', 'admin'), getReceptionStats);

// OPD Payment Collection Reports
// GET /api/reception/collections?start_date=2026-01-01&end_date=2026-01-02&collected_by=123&payment_mode=Cash
router.get('/collections', protect, authorize('receptionist', 'admin', 'billing'), getOPDCollections);

// Cashier Collection Summary (Admin only - shows all cashiers' totals)
// GET /api/reception/collections/summary?date=2026-01-02
router.get('/collections/summary', protect, authorize('admin', 'billing'), getCollectionSummary);

// ──────────────────────────────────────────────────────────────────────────────
// Phase 4: ABHA 3-Step OTP Verification (NHA M1 Compliant)
// ──────────────────────────────────────────────────────────────────────────────

const db = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { abdmService } = require('../services/ABDMService');

// Step 1 — POST /api/reception/abha/init-verify
// Accepts an ABHA number, returns a txnId and masked mobile.

router.post('/abha/init-verify', protect, async (req, res) => {
    try {
        const { abha_number } = req.body;
        if (!abha_number) {
            return ResponseHandler.error(res, 'abha_number is required', 400);
        }

        const result = await abdmService.requestOTP(abha_number);
        if (!result.success) {
            return ResponseHandler.error(res, result.message, 400);
        }

        // Check pre-existing patient link (non-blocking)
        const normalised = abha_number.replace(/[\s-]/g, '');
        let existingPatient = null;
        try {
            const linked = await db.pool.query(
                `SELECT pa.patient_id, p.name, p.uhid
                 FROM patient_links pa JOIN patients p ON pa.patient_id = p.id
                 WHERE pa.link_type = 'ABHA' AND pa.link_value = $1 LIMIT 1`,
                [normalised]
            );
            if (linked.rows.length > 0) {
                existingPatient = { id: linked.rows[0].patient_id, name: linked.rows[0].name, uhid: linked.rows[0].uhid };
            }
        } catch (_) { /* patient_links may not exist */ }

        return ResponseHandler.success(res, {
            txnId: result.txnId,
            maskedMobile: result.maskedMobile,
            message: result.message,
            existingPatient
        });
    } catch (error) {
        console.error('[ABHA init-verify] Error:', error);
        return ResponseHandler.error(res, error.message, 500);
    }
});

// Step 2 — POST /api/reception/abha/confirm-otp
// Accepts txnId + OTP, returns verified ABHA profile.

router.post('/abha/confirm-otp', protect, async (req, res) => {
    try {
        const { txnId, otp } = req.body;
        if (!txnId || !otp) {
            return ResponseHandler.error(res, 'txnId and otp are required', 400);
        }

        const result = await abdmService.verifyOTP(txnId, otp);
        if (!result.success) {
            return ResponseHandler.error(res, result.message, 400);
        }

        // Check pre-existing patient link (non-blocking)
        const normalised = result.profile.healthId || '';
        let existingPatient = null;
        try {
            const linked = await db.pool.query(
                `SELECT pa.patient_id, p.name, p.uhid
                 FROM patient_links pa JOIN patients p ON pa.patient_id = p.id
                 WHERE pa.link_type = 'ABHA' AND pa.link_value = $1 LIMIT 1`,
                [normalised]
            );
            if (linked.rows.length > 0) {
                existingPatient = { id: linked.rows[0].patient_id, name: linked.rows[0].name, uhid: linked.rows[0].uhid };
            }
        } catch (_) { /* patient_links may not exist */ }

        const profile = { ...result.profile, existingPatient };

        return ResponseHandler.success(res, { valid: true, profile });
    } catch (error) {
        console.error('[ABHA confirm-otp] Error:', error);
        return ResponseHandler.error(res, error.message, 500);
    }
});

// POST /api/reception/rapid-triage
router.post('/rapid-triage', protect, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { gender, approximate_age, age_bucket_label, complaint, is_mlc, notes } = req.body;
        const hospitalId = req.hospital_id || req.hospitalId;

        if (!gender || !complaint) {
            return ResponseHandler.error(res, 'gender and complaint are required', 400);
        }

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        await client.query('BEGIN');

        const counterRes = await client.query(
            `SELECT COUNT(*) + 1 AS next_seq FROM patients
       WHERE uhid LIKE 'PROV-${today}-%' AND (hospital_id = $1 OR $1 IS NULL)`,
            [hospitalId]
        );
        const provisionalUHID = `PROV-${today}-${String(counterRes.rows[0].next_seq).padStart(4, '0')}`;

        let dob = null;
        if (approximate_age !== null && approximate_age !== undefined) {
            dob = `${new Date().getFullYear() - approximate_age}-01-01`;
        }

        const patientRes = await client.query(
            `INSERT INTO patients (name, uhid, dob, gender, phone, history_json, hospital_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING id, uhid, name, gender`,
            [
                `UNKNOWN — ${age_bucket_label || 'Triage'}`,
                provisionalUHID,
                dob,
                gender,
                '0000000000',
                JSON.stringify({ triage: true, is_mlc: is_mlc || false, approximate_age, age_bucket_label, notes, registered_by: req.user?.id }),
                hospitalId
            ]
        );

        const patient = patientRes.rows[0];

        let doctorId = null;
        try {
            const docRes = await client.query(
                `SELECT id FROM users WHERE role='doctor' AND is_active=true AND (hospital_id=$1 OR $1 IS NULL) ORDER BY RANDOM() LIMIT 1`,
                [hospitalId]
            );
            if (docRes.rows.length > 0) doctorId = docRes.rows[0].id;
        } catch (_) { }

        const tokenRes = await client.query(
            `SELECT COALESCE(MAX(token_number),0)+1 AS next_token FROM opd_visits
       WHERE visit_date=CURRENT_DATE AND (hospital_id=$1 OR $1 IS NULL)`,
            [hospitalId]
        );
        const tokenNumber = tokenRes.rows[0].next_token;

        const visitRes = await client.query(
            `INSERT INTO opd_visits (patient_id, doctor_id, visit_date, token_number, status, complaint, consultation_type, notes, hospital_id, created_at)
       VALUES ($1,$2,CURRENT_DATE,$3,'Waiting',$4,$5,$6,$7,NOW()) RETURNING id, token_number, status`,
            [patient.id, doctorId, tokenNumber, complaint, is_mlc ? 'Emergency — MLC' : 'Emergency', `RAPID TRIAGE — ${is_mlc ? 'MLC ' : ''}${notes || ''}`.trim(), hospitalId]
        );

        await client.query('COMMIT');

        console.log(`[Rapid Triage] PROV=${provisionalUHID} | Token=${tokenNumber} | MLC=${is_mlc ? 'YES' : 'NO'}`);

        if (global.io) {
            global.io.emit('opd_update', { type: 'rapid_triage', patient_id: patient.id, provisional_uhid: provisionalUHID, token_number: tokenNumber, is_mlc });
        }

        return ResponseHandler.success(res, {
            patient: { id: patient.id, uhid: provisionalUHID, name: patient.name, gender: patient.gender, approximate_age },
            visit: { id: visitRes.rows[0].id, token_number: visitRes.rows[0].token_number, status: visitRes.rows[0].status },
            provisional_uhid: provisionalUHID,
            is_mlc: is_mlc || false,
            message: 'Provisional ID created. Patient can now be treated.'
        }, 201);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Rapid Triage] Error:', error);
        return ResponseHandler.error(res, error.message, 500);
    } finally {
        client.release();
    }
});

module.exports = router;
