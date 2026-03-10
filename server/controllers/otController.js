const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get all OT Rooms - Multi-Tenant
exports.getOTRooms = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query('SELECT * FROM ot_rooms WHERE (hospital_id = $1 OR hospital_id IS NULL) ORDER BY name', [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Get Schedule - Multi-Tenant
exports.getSchedule = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    // Note: Removed patients/users joins due to schema type mismatch (patients.id is UUID, surgeries.patient_id is INTEGER)
    // Patient and doctor info can be fetched separately if needed
    const query = `
        SELECT s.*, r.name as room_name
        FROM surgeries s 
        LEFT JOIN ot_rooms r ON s.ot_room_id = r.id 
        WHERE s.status != 'Cancelled' AND (s.hospital_id = $1 OR s.hospital_id IS NULL) 
        ORDER BY s.start_time
    `;
    const result = await pool.query(query, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Book Surgery - Multi-Tenant
exports.bookSurgery = asyncHandler(async (req, res) => {
    const { patient_id, doctor_id, ot_room_id, procedure_name, start_time, end_time, priority, notes } = req.body;
    const hospitalId = getHospitalId(req);

    const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1', [patient_id]);
    if (patientCheck.rowCount === 0) return ResponseHandler.error(res, 'Invalid Patient ID', 400);

    const conflictQuery = `SELECT id FROM surgeries WHERE ot_room_id = $1 AND status != 'Cancelled'
        AND ((start_time BETWEEN $2 AND $3) OR (end_time BETWEEN $2 AND $3) OR (start_time <= $2 AND end_time >= $3))
        AND (hospital_id = $4 OR hospital_id IS NULL)`;
    const conflict = await pool.query(conflictQuery, [ot_room_id, start_time, end_time, hospitalId]);
    if (conflict.rowCount > 0) return ResponseHandler.error(res, 'OT Room is already booked for this time slot.', 409);

    const insertQuery = `INSERT INTO surgeries (patient_id, doctor_id, ot_room_id, procedure_name, start_time, end_time, priority, notes, hospital_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
    const result = await pool.query(insertQuery, [patient_id, doctor_id, ot_room_id, procedure_name, start_time, end_time, priority, notes, hospitalId]);
    ResponseHandler.success(res, result.rows[0], 'Surgery booked successfully', 201);
});

// Update Status - Multi-Tenant
exports.updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const hospitalId = getHospitalId(req);

    const result = await pool.query('UPDATE surgeries SET status = $1 WHERE id = $2 AND (hospital_id = $3 OR hospital_id IS NULL) RETURNING *', [status, id, hospitalId]);
    if (result.rowCount === 0) return ResponseHandler.error(res, 'Surgery not found', 404);
    ResponseHandler.success(res, result.rows[0], 'Status updated successfully');
});
