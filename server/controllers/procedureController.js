const pool = require('../config/db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get All Procedures - Multi-Tenant
const getProcedures = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query('SELECT * FROM procedures WHERE (hospital_id = $1 OR hospital_id IS NULL) ORDER BY name', [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Add Procedure - Multi-Tenant
const addProcedure = asyncHandler(async (req, res) => {
    const { name, code, price, description } = req.body;
    const hospitalId = getHospitalId(req);

    try {
        const result = await pool.query('INSERT INTO procedures (name, code, price, description, hospital_id) VALUES ($1, $2, $3, $4, $5) RETURNING *', [name, code, price, description, hospitalId]);
        ResponseHandler.success(res, result.rows[0], 'Procedure added successfully', 201);
    } catch (error) {
        if (error.code === '23505') return ResponseHandler.error(res, 'Procedure already exists', 400);
        throw error;
    }
});

// Update Procedure - Multi-Tenant
const updateProcedure = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, code, price, description } = req.body;
    const hospitalId = getHospitalId(req);

    const result = await pool.query('UPDATE procedures SET name = $1, code = $2, price = $3, description = $4 WHERE id = $5 AND (hospital_id = $6 OR hospital_id IS NULL) RETURNING *', [name, code, price, description, id, hospitalId]);
    
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Procedure not found', 404);
    
    ResponseHandler.success(res, result.rows[0], 'Procedure updated successfully');
});

// Delete Procedure - Multi-Tenant
const deleteProcedure = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query('DELETE FROM procedures WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL) RETURNING id', [id, hospitalId]);
    
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Procedure not found', 404);

    ResponseHandler.success(res, { message: 'Procedure deleted' });
});

module.exports = { getProcedures, addProcedure, updateProcedure, deleteProcedure };
