/**
 * Dental Controller
 * WOLF HMS — Horizon 2 Dental Module
 * Production Deployment — August 2026
 */

const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// ======================================
// DENTAL VISITS (<spec ref="schema/dental_visits">)
// ======================================

const createDentalVisit = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { patient_id, chief_complaint, diagnosis, treatment_plan, notes, odontogram } = req.body;
    const doctor_id = req.user.id;

    if (!patient_id) {
        return ResponseHandler.error(res, 'patient_id is required', 400);
    }

    const result = await pool.query(
        `INSERT INTO dental_visits 
         (patient_id, chief_complaint, diagnosis, treatment_plan, notes, odontogram, doctor_id, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [patient_id, chief_complaint, diagnosis, treatment_plan, notes,
            JSON.stringify(odontogram || {}), doctor_id, hospitalId]
    );

    ResponseHandler.success(res, result.rows[0], 'Dental visit created', 201);
});

const getDentalVisits = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { patient_id, status } = req.query;
    let query = `
        SELECT dv.*, p.name as patient_name, u.username as doctor_name
        FROM dental_visits dv
        LEFT JOIN patients p ON dv.patient_id = p.id
        LEFT JOIN users u ON dv.doctor_id = u.id
        WHERE dv.hospital_id = $1`
    const params = [hospitalId];
    let idx = 2;

    if (patient_id) { query += ` AND dv.patient_id = $${idx++}`; params.push(patient_id); }
    if (status && status !== 'All') { query += ` AND dv.status = $${idx++}`; params.push(status); }

    query += ' ORDER BY dv.created_at DESC Limit 100';
    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

const getDentalVisitsById = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { id } = req.params;

    const result = await pool.query(
        `SELECT dv.*, p.name as patient_name, u.username as doctor_name
         FROM dental_visits dv
         LEFT JOIN patients p ON dv.patient_id = p.id
         LEFT JOIN users u ON dv.doctor_id = u.id
         WHERE dv.id = $1 AND dv.hospital_id = $2`,
        [id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Visit not found', 404);
    ResponseHandler.success(res, result.rows[0]);
});

// ======================================
// DENTAL PROCEDURES
// ======================================

const logDentalProcedure = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { visit_id, procedure_code, procedure_name, tooth_number, quadrant, surface, fee, discount, notes, patient_id } = req.body;
    const performed_by = req.user.id;

    if (!visit_id || !procedure_code) {
        return ResponseHandler.error(res, 'visit_id and procedure_code are required', 400);
    }

    // Resolve patient_id from the visit if not explicitly provided
    let resolvedPatientId = patient_id;
    if (!resolvedPatientId) {
        const visitRes = await pool.query(
            `SELECT patient_id FROM dental_visits WHERE id = $1 AND hospital_id = $2`,
            [visit_id, hospitalId]
        );
        if (visitRes.rows.length === 0) {
            return ResponseHandler.error(res, 'Visit not found', 404);
        }
        resolvedPatientId = visitRes.rows[0].patient_id;
    }

    // [RED TEAM PATCH] Odontogram Logic — prevent procedures on extracted teeth.
    const EXTRACTION_CODES = ['D7140', 'D7210', 'D7220', 'D7230', 'D7240', 'D7241'];
    // Only run the check if the new procedure is NOT itself an extraction or
    // a post-operative evaluation (D0140, D0170 — "limited oral evaluation").
    const isExtraction = EXTRACTION_CODES.includes(procedure_code?.toUpperCase());
    const isPostOpEval = procedure_code?.toUpperCase() === 'D0140' || procedure_code?.toUpperCase() === 'D0170';

    if (!isExtraction && !isPostOpEval && tooth_number) {
        const priorExtraction = await pool.query(
            `SELECT id, procedure_code
         FROM dental_procedures
         WHERE visit_id = $1
           AND tooth_number = $2
           AND procedure_code = ANY($3::text[])
           AND status = 'Completed'
           AND hospital_id = $4
         LIMIT 1`,
            [visit_id, tooth_number, EXTRACTION_CODES, hospitalId]
        );

        if (priorExtraction.rows.length > 0) {
            return ResponseHandler.error(
                res,
                `Cannot perform procedure on tooth ${tooth_number}. Tooth is marked as extracted.`,
                409
            );
        }
    }

    const result = await pool.query(
        `INSERT INTO dental_procedures 
         (visit_id, patient_id, procedure_code, procedure_name, tooth_number, quadrant, surface, fee, discount, notes, performed_by, hospital_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Completed') RETURNING *`,
        [visit_id, resolvedPatientId, procedure_code, procedure_name || null, tooth_number, quadrant, surface, fee || 0, discount || 0, notes, performed_by, hospitalId]
    );

    ResponseHandler.success(res, result.rows[0], 'Procedure logged', 201);
});

const getProcedures = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { visit_id, status } = req.query;
    let query = `
        SELECT dp.*, u.username as performer_name
        FROM dental_procedures dp
        LEFT JOIN users u ON dp.performed_by = u.id
        WHERE dp.hospital_id = $1`
    const params = [hospitalId];
    let idx = 2;

    if (visit_id) { query += ` AND dp.visit_id = $${idx++}`; params.push(visit_id); }
    if (status && status !== 'All') { query += ` AND dp.status = $${idx++}`; params.push(status); }

    query += ' ORDER BY dp.created_at DESC Limit 200';
    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// ======================================
// DENTAL INVENTORY (<spec ref="schema/dental_inventory">)
// ======================================

const getInventory = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { category, low_number, lot_number } = req.query;
    let query = `SELECT * FROM dental_inventory WHERE hospital_id = $1`;
    const params = [hospitalId];
    let idx = 2;

    if (category && category !== 'All') { query += ` AND category = $${idx++}`; params.push(category); }
    if (lot_number) { query += ` AND lot_number = $${idx++}`; params.push(lot_number); }

    query += ' ORDER BY expiry_date ASC, stock_quantity ASC Limit 200';
    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

const addInventoryItem = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { item_name, category, brand, model, lot_number, stock_qty, expiry_date, reorder_level, unit_price } = req.body;

    if (!item_name || !category) {
        return ResponseHandler.error(res, 'item_name and category are required', 400);
    }

    const result = await pool.query(
        `INSERT INTO dental_inventory 
         (item_name, category, brand, model, lot_number, stock_qty, expiry_date, reorder_level, unit_price, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [item_name, category, brand, model, lot_number, stock_qty || 0, expiry_date, reorder_level || 5, unit_price || 0, hospitalId]
    );

    ResponseHandler.success(res, result.rows[0], 'Inventory item added', 201);
});

// ======================================
// DENTAL LAB ORDERS (<spec ref="schema/dental_lab_orders">)
// ======================================

const createLabOrder = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { patient_id, restoration_type, shade, lab_instructions, teeth, due_date, preferred_lab } = req.body;
    const ordered_by = req.user.id;

    if (!patient_id || !restoration_type) {
        return ResponseHandler.error(res, 'patient_id and restoration_type are required', 400);
    }

    const result = await pool.query(
        `INSERT INTO dental_lab_orders 
         (patient_id, restoration_type, shade, lab_instructions, teeth, due_date, preferred_lab, ordered_by, hospital_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending') RETURNING *`,
        [patient_id, restoration_type, shade, lab_instructions, JSON.stringify(teeth || []), due_date, preferred_lab, ordered_by, hospitalId]
    );

    ResponseHandler.success(res, result.rows[0], 'Lab order created', 201);
});

const getLabOrders = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { patient_id, status } = req.query;
    let query = `
        SELECT dlo.*, p.name as patient_name, u.username as ordered_by_name
        FROM dental_lab_orders dlo
        LEFT JOIN patients p ON dlo.patient_id = p.id
        LEFT JOIN users u ON dlo.ordered_by = u.id
        WHERE dlo.hospital_id = $1`;
    const params = [hospitalId];
    let idx = 2;

    if (patient_id) { query += ` AND dlo.patient_id = $${idx++}`; params.push(patient_id); }
    if (status && status !== 'All') { query += ` AND dlo.status = $${idx++}`; params.push(status); }

    query += ' ORDER BY dlo.created_at DESC Limit 100';
    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

module.exports = {
    createDentalVisit, getDentalVisits, getDentalVisitsById,
    logDentalProcedure, getProcedures,
    getInventory, addInventoryItem,
    createLabOrder, getLabOrders,
};