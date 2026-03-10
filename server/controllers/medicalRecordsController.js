/**
 * Medical Records (HIM) Controller
 * WOLF HMS — Tier 3 Differentiator
 */

const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// ============================================
// DASHBOARD
// ============================================
const getDashboardStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const [totalR, pendingFileR, pendingCodeR, requestsR, mlcR, codedTodayR, filedTodayR] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM medical_records_tracking WHERE hospital_id = $1', [hospitalId]),
        pool.query("SELECT COUNT(*) FROM medical_records_tracking WHERE hospital_id = $1 AND status = 'PENDING_FILING'", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM medical_records_tracking WHERE hospital_id = $1 AND status = 'PENDING_CODING'", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM record_requests WHERE hospital_id = $1 AND status IN ('PENDING', 'RETRIEVED')", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM medical_records_tracking WHERE hospital_id = $1 AND record_type = 'MLC' AND status = 'ACTIVE'", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM icd_codings WHERE hospital_id = $1 AND coded_date = CURRENT_DATE", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM medical_records_tracking WHERE hospital_id = $1 AND filed_date = CURRENT_DATE", [hospitalId]),
    ]);

    ResponseHandler.success(res, {
        total_records: parseInt(totalR.rows[0].count),
        pending_filing: parseInt(pendingFileR.rows[0].count),
        pending_coding: parseInt(pendingCodeR.rows[0].count),
        active_requests: parseInt(requestsR.rows[0].count),
        mlc_pending: parseInt(mlcR.rows[0].count),
        coded_today: parseInt(codedTodayR.rows[0].count),
        filed_today: parseInt(filedTodayR.rows[0].count),
    });
});

// ============================================
// RECORDS
// ============================================
const getRecords = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { status, type, department } = req.query;

    let query = `
        SELECT mrt.*, p.name AS patient_name, u.username AS consultant_name
        FROM medical_records_tracking mrt
        LEFT JOIN patients p ON mrt.patient_id = p.id
        LEFT JOIN users u ON mrt.consultant_id = u.id
        WHERE mrt.hospital_id = $1
    `;
    const params = [hospitalId];
    let idx = 2;

    if (status && status !== 'All') { query += ` AND mrt.status = $${idx++}`; params.push(status); }
    if (type && type !== 'All') { query += ` AND mrt.record_type = $${idx++}`; params.push(type); }
    if (department && department !== 'All') { query += ` AND mrt.department = $${idx++}`; params.push(department); }

    query += ' ORDER BY mrt.created_at DESC LIMIT 100';
    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

const updateRecordStatus = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { id } = req.params;
    const { status, location } = req.body;

    const result = await pool.query(
        `UPDATE medical_records_tracking 
         SET status = COALESCE($1, status), location = COALESCE($2, location),
             filed_date = CASE WHEN $1 = 'FILED' THEN CURRENT_DATE ELSE filed_date END,
             updated_at = NOW()
         WHERE id = $3 AND hospital_id = $4 RETURNING *`,
        [status, location, id, hospitalId]
    );

    if (result.rows.length === 0) return ResponseHandler.error(res, 'Record not found', 404);

    // Log to audit trail
    await pool.query(
        `INSERT INTO him_audit_log (record_id, action, performed_by, ip_address, reason, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, status === 'FILED' ? 'FILED' : 'STATUS_UPDATED', req.user.id, req.ip, `Status changed to ${status}`, hospitalId]
    );

    ResponseHandler.success(res, result.rows[0], 'Record updated');
});

// ============================================
// RECORD REQUESTS
// ============================================
const getRequests = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { status } = req.query;

    let query = `
        SELECT rr.*, p.name AS patient_name, u.username AS requested_by_name
        FROM record_requests rr
        LEFT JOIN patients p ON rr.patient_id = p.id
        LEFT JOIN users u ON rr.requested_by = u.id
        WHERE rr.hospital_id = $1
    `;
    const params = [hospitalId];
    let idx = 2;
    if (status && status !== 'All') { query += ` AND rr.status = $${idx++}`; params.push(status); }
    query += ' ORDER BY rr.priority DESC, rr.due_date ASC';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

const createRequest = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { patient_id, mr_number, purpose, due_date, priority, notes } = req.body;
    const requested_by = req.user.id;

    if (!patient_id || !purpose) return ResponseHandler.error(res, 'patient_id and purpose required', 400);

    const result = await pool.query(
        `INSERT INTO record_requests 
         (patient_id, mr_number, purpose, due_date, priority, notes, requested_by, hospital_id, status)
         VALUES ($1, $2, $3, $4, COALESCE($5, 'ROUTINE'), $6, $7, $8, 'PENDING') RETURNING *`,
        [patient_id, mr_number, purpose, due_date, priority, notes, requested_by, hospitalId]
    );

    ResponseHandler.success(res, result.rows[0], 'Request created', 201);
});

const updateRequestStatus = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
        `UPDATE record_requests SET status = $1, updated_at = NOW()
         WHERE id = $2 AND hospital_id = $3 RETURNING *`,
        [status, id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Request not found', 404);
    ResponseHandler.success(res, result.rows[0], 'Request updated');
});

// ============================================
// ICD CODING
// ============================================
const submitCoding = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { record_id, mr_number, primary_diagnosis, primary_icd, secondary_diagnoses, procedures } = req.body;
    const coded_by = req.user.id;

    if (!record_id || !primary_icd) return ResponseHandler.error(res, 'record_id and primary_icd required', 400);

    const result = await pool.query(
        `INSERT INTO icd_codings 
         (record_id, mr_number, primary_diagnosis, primary_icd, secondary_diagnoses, procedures, coded_by, coded_date, hospital_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, 'CODED') RETURNING *`,
        [record_id, mr_number, primary_diagnosis, primary_icd, 
         JSON.stringify(secondary_diagnoses || []), JSON.stringify(procedures || []), coded_by, hospitalId]
    );

    // Update record status to CODED
    await pool.query(
        "UPDATE medical_records_tracking SET status = 'CODED', icd_codes = $1 WHERE id = $2 AND hospital_id = $3",
        [JSON.stringify([primary_icd, ...(secondary_diagnoses || []).map(d => d.icd)]), record_id, hospitalId]
    );

    ResponseHandler.success(res, result.rows[0], 'Coding submitted', 201);
});

const getCodingQueue = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `SELECT mrt.*, p.name AS patient_name, ic.primary_icd, ic.status AS coding_status, ic.coded_date
         FROM medical_records_tracking mrt
         LEFT JOIN patients p ON mrt.patient_id = p.id
         LEFT JOIN icd_codings ic ON ic.record_id = mrt.id
         WHERE mrt.hospital_id = $1 AND mrt.status IN ('PENDING_CODING', 'CODED')
         ORDER BY mrt.discharge_date DESC`, [hospitalId]
    );

    ResponseHandler.success(res, result.rows);
});

// ============================================
// MLC CASES
// ============================================
const getMLCCases = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `SELECT mrt.*, p.name AS patient_name, u.username AS consultant_name
         FROM medical_records_tracking mrt
         LEFT JOIN patients p ON mrt.patient_id = p.id
         LEFT JOIN users u ON mrt.consultant_id = u.id
         WHERE mrt.hospital_id = $1 AND mrt.record_type = 'MLC'
         ORDER BY mrt.created_at DESC`, [hospitalId]
    );

    ResponseHandler.success(res, result.rows);
});

// ============================================
// AUDIT TRAIL
// ============================================
const getAuditTrail = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { record_id, limit } = req.query;

    let query = `
        SELECT hal.*, u.username AS performed_by_name, u.role AS performed_by_role
        FROM him_audit_log hal
        LEFT JOIN users u ON hal.performed_by = u.id
        WHERE hal.hospital_id = $1
    `;
    const params = [hospitalId];
    let idx = 2;

    if (record_id) { query += ` AND hal.record_id = $${idx++}`; params.push(record_id); }
    query += ` ORDER BY hal.created_at DESC LIMIT $${idx++}`;
    params.push(parseInt(limit) || 50);

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

module.exports = {
    getDashboardStats, getRecords, updateRecordStatus,
    getRequests, createRequest, updateRequestStatus,
    submitCoding, getCodingQueue, getMLCCases, getAuditTrail,
};
