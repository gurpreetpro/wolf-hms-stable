const pool = require('../config/db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get Problems - Multi-Tenant
const getProblems = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const hospitalId = getHospitalId(req);
    const result = await pool.query(
        'SELECT * FROM problem_list WHERE patient_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL) ORDER BY status, priority, created_at DESC',
        [patient_id, hospitalId]
    );
    ResponseHandler.success(res, result.rows);
});

// Add Problem - Multi-Tenant
const addProblem = asyncHandler(async (req, res) => {
    const { patient_id, diagnosis, icd10_code, status, priority, notes } = req.body;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `INSERT INTO problem_list (patient_id, diagnosis, icd10_code, status, priority, notes, created_by, hospital_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [patient_id, diagnosis, icd10_code, status || 'Active', priority || 'Primary', notes, req.user.id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Problem added successfully', 201);
});

// Update Problem - Multi-Tenant
const updateProblem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, resolved_date, notes } = req.body;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `UPDATE problem_list SET status = COALESCE($1, status), resolved_date = COALESCE($2, resolved_date), notes = COALESCE($3, notes), updated_at = NOW()
            WHERE id = $4 AND (hospital_id = $5 OR hospital_id IS NULL) RETURNING *`,
        [status, resolved_date, notes, id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Problem not found', 404);
    ResponseHandler.success(res, result.rows[0], 'Problem updated successfully');
});

// Delete Problem - Multi-Tenant
const deleteProblem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);

    const result = await pool.query('DELETE FROM problem_list WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL) RETURNING id', [id, hospitalId]);
    if (result.rowCount === 0) return ResponseHandler.error(res, 'Problem not found', 404);
    
    ResponseHandler.success(res, { message: 'Problem deleted' });
});

module.exports = { getProblems, addProblem, updateProblem, deleteProblem };
