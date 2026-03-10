const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get or Create Discharge Plan - Multi-Tenant
const getDischargePlan = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = getHospitalId(req);
    
    let result = await pool.query('SELECT * FROM discharge_plans WHERE admission_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [admission_id, hospitalId]);

    if (result.rows.length === 0) {
        const admRes = await pool.query('SELECT patient_id FROM admissions WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [admission_id, hospitalId]);
        if (admRes.rows.length === 0) return ResponseHandler.error(res, 'Admission not found', 404);
        const patient_id = admRes.rows[0].patient_id;
        result = await pool.query(
            'INSERT INTO discharge_plans (admission_id, patient_id, hospital_id) VALUES ($1, $2, $3) RETURNING *',
            [admission_id, patient_id, hospitalId]
        );
    }
    ResponseHandler.success(res, result.rows[0]);
});

// Update Discharge Plan - Multi-Tenant
const updateDischargePlan = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const updates = req.body;
    const hospitalId = getHospitalId(req);

    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 3}`).join(', ');
    const values = Object.values(updates);
    if (fields.length === 0) return ResponseHandler.error(res, 'No updates provided', 400);

    const result = await pool.query(
        `UPDATE discharge_plans SET ${fields}, updated_at = NOW() WHERE admission_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL) RETURNING *`,
        [admission_id, hospitalId, ...values]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Discharge plan not found', 404);
    ResponseHandler.success(res, result.rows[0]);
});

// Create Handoff - Multi-Tenant
const createHandoff = asyncHandler(async (req, res) => {
    const { shift, unit, situation, background, assessment, recommendation } = req.body;
    const created_by = req.user.id;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `INSERT INTO handoff_reports (shift, unit, situation, background_json, assessment_json, recommendation, created_by, hospital_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [shift, unit, situation, background || {}, assessment || {}, recommendation, created_by, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Handoff created', 201);
});

// Get Recent Handoffs - Multi-Tenant
const getHandoffs = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(
        `SELECT h.*, u.username as doctor_name FROM handoff_reports h 
            JOIN users u ON h.created_by = u.id 
            WHERE (h.hospital_id = $1 OR h.hospital_id IS NULL)
            ORDER BY h.created_at DESC LIMIT 20`,
        [hospitalId]
    );
    ResponseHandler.success(res, result.rows);
});

module.exports = { getDischargePlan, updateDischargePlan, createHandoff, getHandoffs };
