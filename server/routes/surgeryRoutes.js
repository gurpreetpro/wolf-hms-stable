const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getHospitalId } = require('../utils/tenantHelper');
const otController = require('../controllers/otController');

// Standard OT Routes
router.get('/rooms', protect, otController.getOTRooms);
router.get('/schedule', protect, otController.getSchedule);
router.post('/book', protect, authorize('admin', 'doctor'), otController.bookSurgery);
router.put('/:id/status', protect, authorize('admin', 'doctor', 'nurse'), otController.updateStatus);

// ============================================
// WOLF Guard: WHO SURGICAL SAFETY CHECKLIST
// ============================================

// GET /api/surgery/:id/who-checklist
router.get('/:id/who-checklist', protect, async (req, res) => {
    try {
        const surgeryId = parseInt(req.params.id);
        const result = await pool.query(
            'SELECT * FROM who_safety_checklists WHERE surgery_id = $1',
            [surgeryId]
        );
        return res.status(200).json({
            success: true,
            checklist: result.rows[0] || {
                surgery_id: surgeryId,
                sign_in_completed: false,
                time_out_completed: false,
                sign_out_completed: false
            }
        });
    } catch (error) {
        console.error('[WHO Checklist GET] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/surgery/:id/who-checklist
// WOLF Guard Strict Stage Enforcement:
// SIGN_IN -> TIME_OUT -> SIGN_OUT
router.put('/:id/who-checklist', protect, authorize('admin', 'doctor', 'nurse', 'anesthesiologist'), async (req, res) => {
    try {
        const surgeryId = parseInt(req.params.id);
        const { stage } = req.body;

        if (!stage || !['SIGN_IN', 'TIME_OUT', 'SIGN_OUT'].includes(stage.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid stage. Must be SIGN_IN, TIME_OUT, or SIGN_OUT.'
            });
        }

        const normalizedStage = stage.toUpperCase();
        const userId = req.user?.id || 1;

        // Fetch existing checklist state
        const existingRes = await pool.query(
            'SELECT * FROM who_safety_checklists WHERE surgery_id = $1',
            [surgeryId]
        );
        const currentChecklist = existingRes.rows[0];

        // ── WOLF GUARD STAGE ENFORCEMENT ─────────────────────
        if (normalizedStage === 'TIME_OUT') {
            if (!currentChecklist || !currentChecklist.sign_in_completed) {
                return res.status(409).json({
                    success: false,
                    blocked: true,
                    stage: 'TIME_OUT',
                    message: 'HARD STOP: Surgical TIME_OUT is forbidden before SIGN_IN phase is fully completed and signed.'
                });
            }
        } else if (normalizedStage === 'SIGN_OUT') {
            if (!currentChecklist || !currentChecklist.time_out_completed) {
                return res.status(409).json({
                    success: false,
                    blocked: true,
                    stage: 'SIGN_OUT',
                    message: 'HARD STOP: Surgical SIGN_OUT is forbidden before TIME_OUT phase is fully completed.'
                });
            }
        }

        // Apply state transition
        let query = '';
        let params = [];

        if (!currentChecklist) {
            // Create new record
            if (normalizedStage === 'SIGN_IN') {
                query = `INSERT INTO who_safety_checklists (surgery_id, sign_in_completed, sign_in_by, sign_in_at)
                         VALUES ($1, TRUE, $2, NOW()) RETURNING *`;
                params = [surgeryId, userId];
            } else if (normalizedStage === 'TIME_OUT') {
                query = `INSERT INTO who_safety_checklists (surgery_id, time_out_completed, time_out_by, time_out_at)
                         VALUES ($1, TRUE, $2, NOW()) RETURNING *`;
                params = [surgeryId, userId];
            } else {
                query = `INSERT INTO who_safety_checklists (surgery_id, sign_out_completed, sign_out_by, sign_out_at)
                         VALUES ($1, TRUE, $2, NOW()) RETURNING *`;
                params = [surgeryId, userId];
            }
        } else {
            // Update existing record
            if (normalizedStage === 'SIGN_IN') {
                query = `UPDATE who_safety_checklists 
                            SET sign_in_completed = TRUE, sign_in_by = $2, sign_in_at = NOW()
                          WHERE surgery_id = $1 RETURNING *`;
                params = [surgeryId, userId];
            } else if (normalizedStage === 'TIME_OUT') {
                query = `UPDATE who_safety_checklists 
                            SET time_out_completed = TRUE, time_out_by = $2, time_out_at = NOW()
                          WHERE surgery_id = $1 RETURNING *`;
                params = [surgeryId, userId];
            } else {
                query = `UPDATE who_safety_checklists 
                            SET sign_out_completed = TRUE, sign_out_by = $2, sign_out_at = NOW()
                          WHERE surgery_id = $1 RETURNING *`;
                params = [surgeryId, userId];
            }
        }

        const updateRes = await pool.query(query, params);

        return res.status(200).json({
            success: true,
            stage: normalizedStage,
            message: `WHO Safety Checklist ${normalizedStage} phase signed successfully.`,
            checklist: updateRes.rows[0]
        });
    } catch (error) {
        console.error('[WHO Checklist PUT] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// INTRA-OPERATIVE ANESTHESIA LOGS
// ============================================

const BillingInterceptor = require('../services/BillingInterceptor');

const handleIntraOpLog = async (req, res) => {
    try {
        const surgeryId = parseInt(req.params.id);
        const hospitalId = getHospitalId(req);
        const userId = req.user?.id || 1;

        const {
            patientId, patient_id,
            vitalsData, bp_systolic, bp_diastolic, heart_rate, spo2,
            drugsArray, drugs_administered, remarks
        } = req.body;

        const pid = patientId || patient_id || null;
        const vitals = vitalsData || {
            bp_systolic: bp_systolic || null,
            bp_diastolic: bp_diastolic || null,
            heart_rate: heart_rate || null,
            spo2: spo2 || null
        };
        const drugs = drugsArray || drugs_administered || [];

        // 1. Insert intra-op anesthesia log record
        const logRes = await pool.query(
            `INSERT INTO intra_op_anesthesia_logs 
                (surgery_id, recorded_by, bp_systolic, bp_diastolic, heart_rate, spo2, vitals, drugs_administered, remarks, patient_id, hospital_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                surgeryId,
                userId,
                vitals.bp_systolic || null,
                vitals.bp_diastolic || null,
                vitals.heart_rate || null,
                vitals.spo2 || null,
                JSON.stringify(vitals),
                JSON.stringify(drugs),
                remarks || null,
                pid,
                hospitalId
            ]
        );

        // 2. Billing Interceptor: Auto-capture intra-op drug charges to patient folio
        if (pid && Array.isArray(drugs) && drugs.length > 0) {
            for (const drug of drugs) {
                const name = drug.drugName || drug.name || drug.item_name;
                const qty = parseFloat(drug.quantity || drug.qty || 1);
                const price = parseFloat(drug.price || drug.unit_price || drug.unitPrice || 0);

                if (name && price > 0) {
                    await BillingInterceptor.captureCharge(
                        pid,
                        BillingInterceptor.SOURCE_MODULES?.OT || 'OT',
                        name,
                        qty,
                        price,
                        { capturedBy: userId },
                        hospitalId
                    ).catch(err => console.warn('[Anesthesia BillingInterceptor] Charge capture failed:', err.message));
                }
            }
        }

        return res.status(201).json({
            success: true,
            message: 'Intra-op anesthesia vitals & drugs logged successfully.',
            log: logRes.rows[0]
        });
    } catch (error) {
        console.error('[Anesthesia Log POST] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/surgery/:id/anesthesia-log
router.post('/:id/anesthesia-log', protect, authorize('admin', 'doctor', 'anesthesiologist', 'nurse'), handleIntraOpLog);

// POST /api/surgery/:id/intra-op-log
router.post('/:id/intra-op-log', protect, authorize('admin', 'doctor', 'anesthesiologist', 'nurse'), handleIntraOpLog);

// ============================================
// OT EQUIPMENT RESERVATIONS
// ============================================

const handleEquipmentReservation = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        const {
            surgery_id, surgeryId: sId,
            equipment_id, equipmentId: eId,
            start_time, startTime: stTime, reserved_from,
            end_time, endTime: eTime, reserved_until
        } = req.body;

        const surgeryId = parseInt(surgery_id || sId || req.params.id);
        const equipmentId = parseInt(equipment_id || eId);
        const startTime = start_time || stTime || reserved_from;
        const endTime = end_time || eTime || reserved_until;
        const userId = req.user?.id || 1;

        if (isNaN(surgeryId) || isNaN(equipmentId) || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'surgeryId, equipmentId, startTime, and endTime are required.'
            });
        }

        // Conflict check
        const conflictRes = await pool.query(
            `SELECT * FROM ot_equipment_reservations
              WHERE equipment_id = $1 AND status != 'CANCELLED'
                AND ((reserved_from BETWEEN $2 AND $3) OR (reserved_until BETWEEN $2 AND $3) OR (reserved_from <= $2 AND reserved_until >= $3))
                AND (hospital_id = $4 OR hospital_id IS NULL)`,
            [equipmentId, startTime, endTime, hospitalId]
        );

        if (conflictRes.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Equipment is already reserved for this time window.'
            });
        }

        const result = await pool.query(
            `INSERT INTO ot_equipment_reservations (surgery_id, equipment_id, reserved_from, reserved_until, start_time, end_time, reserved_by, hospital_id)
             VALUES ($1, $2, $3, $4, $3, $4, $5, $6) RETURNING *`,
            [surgeryId, equipmentId, startTime, endTime, userId, hospitalId]
        );

        return res.status(201).json({
            success: true,
            message: 'OT Equipment reserved successfully.',
            reservation: result.rows[0]
        });
    } catch (error) {
        console.error('[OT Equipment Reserve] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/surgery/equipment/reserve
router.post('/equipment/reserve', protect, authorize('admin', 'doctor', 'nurse'), handleEquipmentReservation);

// POST /api/surgery/:id/equipment/reserve
router.post('/:id/equipment/reserve', protect, authorize('admin', 'doctor', 'nurse'), handleEquipmentReservation);

module.exports = router;
