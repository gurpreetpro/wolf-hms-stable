const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Start or Get Active Case - Multi-Tenant
exports.startCase = asyncHandler(async (req, res) => {
    const { surgery_id, patient_id, anaesthetist_id, technique, asa_grade } = req.body;
    const hospitalId = getHospitalId(req);

    const check = await pool.query('SELECT * FROM anesthesia_records WHERE surgery_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [surgery_id, hospitalId]);
    if (check.rowCount > 0) return ResponseHandler.success(res, check.rows[0]);

    const insert = await pool.query(
        `INSERT INTO anesthesia_records (surgery_id, patient_id, anaesthetist_id, technique, asa_grade, hospital_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [surgery_id, patient_id, anaesthetist_id, technique, asa_grade, hospitalId]
    );
    ResponseHandler.success(res, insert.rows[0], 'Case started successfully', 201);
});

// Log Event - Multi-Tenant
exports.logEvent = asyncHandler(async (req, res) => {
    const { record_id, type, data, logged_by, timestamp } = req.body;
    const hospitalId = getHospitalId(req);

    const query = `INSERT INTO anesthesia_timeline (record_id, type, data, logged_by, timestamp, hospital_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const result = await pool.query(query, [record_id, type, JSON.stringify(data), logged_by, timestamp || new Date(), hospitalId]);
    ResponseHandler.success(res, result.rows[0], 'Event logged successfully', 201);
});

// Get Full Chart - Multi-Tenant
exports.getLiveChart = asyncHandler(async (req, res) => {
    const { recordId } = req.params;
    const hospitalId = getHospitalId(req);

    const record = await pool.query('SELECT * FROM anesthesia_records WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [recordId, hospitalId]);
    if (record.rowCount === 0) return ResponseHandler.error(res, 'Record not found', 404);

    const timeline = await pool.query('SELECT * FROM anesthesia_timeline WHERE record_id = $1 ORDER BY timestamp ASC', [recordId]);
    ResponseHandler.success(res, { header: record.rows[0], timeline: timeline.rows });
});

// End Case - Multi-Tenant
exports.endCase = asyncHandler(async (req, res) => {
    const { recordId } = req.params;
    const hospitalId = getHospitalId(req);

    const result = await pool.query('UPDATE anesthesia_records SET status = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2 AND (hospital_id = $3 OR hospital_id IS NULL) RETURNING *', ['Finalized', recordId, hospitalId]);
    
    if (result.rowCount === 0) return ResponseHandler.error(res, 'Record not found', 404);

    ResponseHandler.success(res, { message: 'Case Finalized' });
});
