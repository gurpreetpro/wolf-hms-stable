/**
 * Orthopedic Controller
 * WOLF HMS — Horizon 2 Orthopedics Module
 */

const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

function getHid(req) {
    return req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;
}

// ======================================
// ORTHOPEDIC VISITS
// ======================================

const createVisit = asyncHandler(async (req, res) => {
    const hid = getHid(req);
    const {
        patient_id, affected_joint, affected_side, injury_mechanism,
        pain_score_nrs, swelling_present, deformity_present, range_of_motion_json,
        diagnosis, treatment_plan, xray_findings, mri_findings, notes
    } = req.body;
    const doctor_id = req.user.id;

    if (!patient_id) return ResponseHandler.error(res, 'patient_id required', 400);

    const r = await pool.query(
        `INSERT INTO orthopedic_visits
         (patient_id, affected_joint, affected_side, injury_mechanism, pain_score_nrs,
          swelling_present, deformity_present, range_of_motion_json, diagnosis, treatment_plan,
          xray_findings, mri_findings, notes, doctor_id, hospital_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [patient_id, affected_joint, affected_side, injury_mechanism, pain_score_nrs,
            swelling_present || false, deformity_present || false,
            JSON.stringify(range_of_motion_json || {}),
            diagnosis, treatment_plan, xray_findings, mri_findings, notes,
            doctor_id, hid]
    );
    ResponseHandler.success(res, r.rows[0], 'Visit created', 201);
});

const getVisits = asyncHandler(async (req, res) => {
    const hid = getHid(req);
    const { patient_id } = req.query;
    let q = `SELECT ov.*, p.name AS patient_name, u.username AS doctor_name
             FROM orthopedic_visits ov
             LEFT JOIN patients p ON ov.patient_id = p.id
             LEFT JOIN users u ON ov.doctor_id = u.id
             WHERE ov.hospital_id = $1`;
    const params = [hid];

    if (patient_id) { q += ' AND ov.patient_id = $2'; params.push(patient_id); }
    q += ' ORDER BY ov.created_at DESC LIMIT 100';

    const r = await pool.query(q, params);
    ResponseHandler.success(res, r.rows);
});

const getVisitById = asyncHandler(async (req, res) => {
    const hid = getHid(req);
    const { id } = req.params;
    const r = await pool.query(
        `SELECT ov.*, p.name AS patient_name, u.username AS doctor_name
         FROM orthopedic_visits ov
         LEFT JOIN patients p ON ov.patient_id = p.id
         LEFT JOIN users u ON ov.doctor_id = u.id
         WHERE ov.id = $1 AND ov.hospital_id = $2`,
        [id, hid]
    );
    if (r.rows.length === 0) return ResponseHandler.error(res, 'Not found', 404);
    ResponseHandler.success(res, r.rows[0]);
});

// ======================================
// ORTHOPEDIC PROCEDURES
// ======================================

const logProcedure = asyncHandler(async (req, res) => {
    const hid = getHid(req);
    const {
        visit_id, procedure_name, procedure_code, joint, side, approach,
        implants_used_json, tourniquet_time_min, blood_loss_ml, complications, notes
    } = req.body;
    const surgeon_id = req.body.surgeon_id || req.user.id;

    if (!visit_id || !procedure_name) {
        return ResponseHandler.error(res, 'visit_id and procedure_name required', 400);
    }

    // Resolve patient_id from the visit
    const visitRes = await pool.query(
        `SELECT patient_id FROM orthopedic_visits WHERE id = $1 AND hospital_id = $2`,
        [visit_id, hid]
    );
    if (visitRes.rows.length === 0) {
        return ResponseHandler.error(res, 'Visit not found', 404);
    }
    const patient_id = visitRes.rows[0].patient_id;

    // [RED TEAM PATCH] Infection Control — verify sterile implant batches
    // have not been used in any prior procedure within this hospital.
    let implantsUsed = implants_used_json;
    if (typeof implantsUsed === 'string') {
        try { implantsUsed = JSON.parse(implantsUsed); } catch (_) { implantsUsed = []; }
    }
    if (Array.isArray(implantsUsed) && implantsUsed.length > 0) {
        for (const implant of implantsUsed) {
            const batch = implant.batch_number || implant.lot_number || implant.lot_batch;
            if (!batch) continue; // no batch identifier — skip validation

            const existing = await pool.query(
                `SELECT id FROM orthopedic_procedures
           WHERE hospital_id = $1
             AND status = 'Completed'
             AND EXISTS (
               SELECT 1 FROM jsonb_array_elements(implants_used_json) AS imp
               WHERE imp->>'batch_number' = $2
                  OR imp->>'lot_number'   = $2
                  OR imp->>'lot_batch'    = $2
             )
           LIMIT 1`,
                [hid, batch]
            );

            if (existing.rows.length > 0) {
                return ResponseHandler.error(
                    res,
                    `Sterile implant batch ${batch} has already been logged. Infection control violation.`,
                    409
                );
            }
        }
    }

    const r = await pool.query(
        `INSERT INTO orthopedic_procedures
         (visit_id, patient_id, procedure_name, procedure_code, joint, side, approach,
          implants_used_json, tourniquet_time_min, blood_loss_ml,
          complications, notes, surgeon_id, hospital_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [visit_id, patient_id, procedure_name, procedure_code || null, joint, side, approach,
            JSON.stringify(implants_used_json || []), tourniquet_time_min, blood_loss_ml,
            complications, notes, surgeon_id, hid, 'Completed']
    );
    ResponseHandler.success(res, r.rows[0], 'Procedure logged', 201);
});

const getProcedures = asyncHandler(async (req, res) => {
    const hid = getHid(req);
    const { visit_id } = req.query;
    let q = `SELECT op.*, u.username AS surgeon_name
             FROM orthopedic_procedures op
             LEFT JOIN users u ON op.surgeon_id = u.id
             WHERE op.hospital_id = $1`;
    const params = [hid];

    if (visit_id) { q += ' AND op.visit_id = $2'; params.push(visit_id); }
    q += ' ORDER BY op.created_at DESC LIMIT 200';

    const r = await pool.query(q, params);
    ResponseHandler.success(res, r.rows);
});

// ======================================
// ORTHOPEDIC IMPLANTS
// ======================================

const getImplants = asyncHandler(async (req, res) => {
    const hid = getHid(req);
    const { category } = req.query;
    let q = 'SELECT * FROM orthopedic_implants WHERE hospital_id = $1';
    const params = [hid];

    if (category) { q += ' AND category = $2'; params.push(category); }
    q += ' ORDER BY expiry_date ASC, stock_quantity ASC LIMIT 200';

    const r = await pool.query(q, params);
    ResponseHandler.success(res, r.rows);
});

const addImplant = asyncHandler(async (req, res) => {
    const hid = getHid(req);
    const {
        implant_name, category, material, size, lot_number,
        stock_qty, expiry_date, sterile_status, unit_price
    } = req.body;

    if (!implant_name || !category) {
        return ResponseHandler.error(res, 'implant_name and category required', 400);
    }

    const r = await pool.query(
        `INSERT INTO orthopedic_implants
         (implant_name, category, material, size, lot_number,
          stock_qty, expiry_date, sterile_status, unit_price, hospital_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [implant_name, category, material, size, lot_number,
            stock_qty || 0, expiry_date, sterile_status || 'Sterile',
            unit_price || 0, hid]
    );
    ResponseHandler.success(res, r.rows[0], 'Implant added', 201);
});

// ======================================
// PHYSIOTHERAPY ORDERS
// ======================================

const createPhysioOrder = asyncHandler(async (req, res) => {
    const hid = getHid(req);
    const {
        patient_id, procedure_id, weight_bearing_status, rom_goals,
        session_frequency, total_sessions, start_date, notes
    } = req.body;
    const ordered_by = req.user.id;

    if (!patient_id) return ResponseHandler.error(res, 'patient_id required', 400);

    const r = await pool.query(
        `INSERT INTO orthopedic_physio_orders
         (patient_id, procedure_id, weight_bearing_status, rom_goals,
          session_frequency, total_sessions, start_date, notes,
          ordered_by, hospital_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [patient_id, procedure_id, weight_bearing_status,
            JSON.stringify(rom_goals || {}), session_frequency,
            total_sessions, start_date, notes, ordered_by, hid, 'Active']
    );
    ResponseHandler.success(res, r.rows[0], 'Physio order created', 201);
});

const getPhysioOrders = asyncHandler(async (req, res) => {
    const hid = getHid(req);
    const { patient_id } = req.query;
    let q = `SELECT opo.*, p.name AS patient_name, u.username AS ordered_by_name
             FROM orthopedic_physio_orders opo
             LEFT JOIN patients p ON opo.patient_id = p.id
             LEFT JOIN users u ON opo.ordered_by = u.id
             WHERE opo.hospital_id = $1`;
    const params = [hid];

    if (patient_id) { q += ' AND opo.patient_id = $2'; params.push(patient_id); }
    q += ' ORDER BY opo.created_at DESC LIMIT 200';

    const r = await pool.query(q, params);
    ResponseHandler.success(res, r.rows);
});

module.exports = {
    createVisit, getVisits, getVisitById,
    logProcedure, getProcedures,
    getImplants, addImplant,
    createPhysioOrder, getPhysioOrders
};