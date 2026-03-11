const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Create a new housekeeping task - Multi-Tenant
const createTask = asyncHandler(async (req, res) => {
    const { type, location, description, priority } = req.body;
    const requested_by = req.user.id;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `INSERT INTO housekeeping_tasks 
        (type, location, description, priority, requested_by, status, hospital_id) 
        VALUES ($1, $2, $3, $4, $5, 'Pending', $6) RETURNING *`,
        [type, location, description, priority || 'Routine', requested_by, hospitalId]
    );

    ResponseHandler.success(res, result.rows[0], 'Task created successfully', 201);
});

// Get tasks (with optional filters) - Multi-Tenant
const getTasks = asyncHandler(async (req, res) => {
    const { status, type } = req.query;
    const hospitalId = getHospitalId(req);
    
    let query = `
        SELECT t.*, u.username as requester_name 
        FROM housekeeping_tasks t
        LEFT JOIN users u ON t.requested_by = u.id
        WHERE (t.hospital_id = $1 OR t.hospital_id IS NULL)
    `;
    const params = [hospitalId];
    let paramIndex = 2;

    if (status && status !== 'All') {
        query += ` AND t.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
    }

    if (type && type !== 'All') {
        query += ` AND t.type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// Update task status - Multi-Tenant
const updateTaskStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    const assigned_to = req.user.id;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `UPDATE housekeeping_tasks 
            SET status = $1, notes = $2, assigned_to = $3, completed_at = CASE WHEN $1 = 'Completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
            WHERE id = $4 AND (hospital_id = $5)
            RETURNING *`,
        [status, notes, assigned_to, id, hospitalId]
    );

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Task not found', 404);
    }

    ResponseHandler.success(res, result.rows[0], 'Task updated successfully');
});

module.exports = { createTask, getTasks, updateTaskStatus };
