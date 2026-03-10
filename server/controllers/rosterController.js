const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { getHospitalId } = require('../utils/tenantHelper');
const { asyncHandler } = require('../middleware/errorHandler');

const rosterController = {
    // Assign beds to a nurse - Multi-Tenant
    assignShift: asyncHandler(async (req, res) => {
        const { nurse_id, ward_id, shift_type, assignment_date, bed_ids } = req.body;
        const hospitalId = getHospitalId(req);

        const existing = await pool.query(
            `SELECT id FROM nurse_assignments WHERE nurse_id = $1 AND assignment_date = $2 AND shift_type = $3 AND (hospital_id = $4 OR hospital_id IS NULL)`,
            [nurse_id, assignment_date, shift_type, hospitalId]
        );

        let result;
        if (existing.rows.length > 0) {
            result = await pool.query(
                `UPDATE nurse_assignments SET bed_ids = $1, ward_id = $2 WHERE id = $3 RETURNING *`,
                [JSON.stringify(bed_ids), ward_id, existing.rows[0].id]
            );
        } else {
            result = await pool.query(
                `INSERT INTO nurse_assignments (nurse_id, ward_id, shift_type, assignment_date, bed_ids, hospital_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [nurse_id, ward_id, shift_type, assignment_date, JSON.stringify(bed_ids), hospitalId]
            );
        }
        ResponseHandler.success(res, result.rows[0], 'Shift assigned successfully');
    }),

    // Get assignments for a ward - Multi-Tenant
    getRoster: asyncHandler(async (req, res) => {
        const { ward_id, date } = req.query;
        const hospitalId = getHospitalId(req);
        
        const result = await pool.query(
            `SELECT na.*, u.username as nurse_name FROM nurse_assignments na
                JOIN users u ON u.id = na.nurse_id
                WHERE na.ward_id = $1 AND na.assignment_date = $2 AND (na.hospital_id = $3 OR na.hospital_id IS NULL)`,
            [ward_id, date, hospitalId]
        );
        ResponseHandler.success(res, result.rows);
    }),

    // Get my assignments for today - Multi-Tenant
    getMyAssignments: asyncHandler(async (req, res) => {
        const nurse_id = req.user.id;
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const hospitalId = getHospitalId(req);

        const result = await pool.query(
            `SELECT bed_ids, shift_type FROM nurse_assignments WHERE nurse_id = $1 AND assignment_date = $2 AND (hospital_id = $3 OR hospital_id IS NULL)`,
            [nurse_id, date, hospitalId]
        );
        let allBedIds = [];
        result.rows.forEach(row => { 
            // Safe null check - bed_ids may be NULL in DB
            if (row.bed_ids && Array.isArray(row.bed_ids)) {
                allBedIds = [...allBedIds, ...row.bed_ids]; 
            }
        });
        allBedIds = [...new Set(allBedIds)];
        ResponseHandler.success(res, { bed_ids: allBedIds });
    }),

    // Get list of nurses - Multi-Tenant
    getNurses: asyncHandler(async (req, res) => {
        const hospitalId = getHospitalId(req);
        const result = await pool.query(
            "SELECT id, username, department FROM users WHERE role IN ('nurse', 'ward_incharge') AND is_active = true AND (hospital_id = $1 OR hospital_id IS NULL)",
            [hospitalId]
        );
        ResponseHandler.success(res, result.rows);
    })
};

module.exports = rosterController;
