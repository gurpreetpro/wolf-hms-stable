/**
 * handoverController.js
 * Handles guard shift handovers
 * Wolf Security - Guard Management
 */

const { pool } = require('../../db');
const ResponseHandler = require('../../utils/responseHandler');
const { asyncHandler } = require('../../middleware/errorHandler');

/**
 * Submit a shift handover
 */
const submitHandover = asyncHandler(async (req, res) => {
    const { outgoing_guard_id, incoming_guard_id, notes, equipment_status, pending_issues } = req.body;
    const hospital_id = req.hospital_id || req.hospitalId || 1;

    const result = await pool.query(`
        INSERT INTO guard_handovers (hospital_id, outgoing_guard_id, incoming_guard_id, notes, equipment_status, pending_issues, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
    `, [hospital_id, outgoing_guard_id, incoming_guard_id, notes, JSON.stringify(equipment_status || {}), JSON.stringify(pending_issues || [])]);

    ResponseHandler.success(res, { handover: result.rows[0] }, 'Handover submitted successfully');
});

/**
 * Get handover history
 */
const getHandoverHistory = asyncHandler(async (req, res) => {
    const hospital_id = req.hospital_id || req.hospitalId || 1;
    const limit = req.query.limit || 20;

    const result = await pool.query(`
        SELECT h.*, 
                og.username as outgoing_guard_name,
                ig.username as incoming_guard_name
        FROM guard_handovers h
        LEFT JOIN users og ON h.outgoing_guard_id = og.id
        LEFT JOIN users ig ON h.incoming_guard_id = ig.id
        WHERE h.hospital_id = $1
        ORDER BY h.created_at DESC
        LIMIT $2
    `, [hospital_id, limit]);

    ResponseHandler.success(res, result.rows);
});

module.exports = {
    submitHandover,
    getHandoverHistory
};
