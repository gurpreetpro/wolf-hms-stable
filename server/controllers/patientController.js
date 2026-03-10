const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const AuditService = require('../services/AuditService');

// Search patients by name, phone, or ID - MULTI-TENANT
const searchPatients = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const hospitalId = req.hospital_id; // From tenantResolver

    if (!q || q.length < 2) {
        return ResponseHandler.success(res, []);
    }

    // Note: hospital_id can be NULL for legacy records, so we use OR hospital_id IS NULL
    const result = await pool.query(`
        SELECT 
            id, 
            uhid,
            name, 
            dob, 
            gender, 
            phone, 
            address,
            history_json,
            created_at,
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(dob, CURRENT_DATE))) as age
        FROM patients
        WHERE 
            (hospital_id = $1 OR hospital_id IS NULL)
            AND (
                LOWER(name) LIKE LOWER($2) 
                OR phone = $3
                OR phone LIKE $2
                OR CAST(id AS TEXT) LIKE $4
                OR uhid LIKE $4
                OR uhid = $3
            )
        ORDER BY created_at DESC
        LIMIT 20
    `, [hospitalId, `%${q}%`, q, `%${q}%`]);

    // [AUDIT] Log search performed (optional, maybe high volume)
    // AuditService.log('SEARCH_PATIENT', 'PATIENT', 'QUERY', { query: q }, req);

    ResponseHandler.success(res, result.rows);
});

// Get patient by ID - MULTI-TENANT
const getPatientById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = req.hospital_id;

    const result = await pool.query(`
        SELECT 
            id, 
            uhid,
            name, 
            dob, 
            gender, 
            phone, 
            address,
            history_json,
            created_at,
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(dob, CURRENT_DATE))) as age
        FROM patients
        WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)
    `, [id, hospitalId]);

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Patient not found', 404);
    }

    // [AUDIT] Log patient access
    AuditService.log('VIEW_PATIENT', 'PATIENT', id, { name: result.rows[0].name }, req);

    ResponseHandler.success(res, result.rows[0]);
});

// Update patient details - MULTI-TENANT
const updatePatient = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, age, gender, phone } = req.body;
    const hospitalId = req.hospital_id;

    let updateQuery = 'UPDATE patients SET name = $1, gender = $2, phone = $3';
    let params = [name, gender, phone];
    let paramIndex = 4;

    if (age) {
        updateQuery += `, dob = $${paramIndex}`;
        params.push(new Date(new Date().getFullYear() - age, 0, 1));
        paramIndex++;
    }

    updateQuery += ` WHERE id = $${paramIndex} AND hospital_id = $${paramIndex + 1} RETURNING *`;
    params.push(id);
    params.push(hospitalId);

    const result = await pool.query(updateQuery, params);

    if (result.rows.length === 0) {
        // [AUDIT] Log failed update attempt
        AuditService.log('UPDATE_PATIENT_FAILED', 'PATIENT', id, { reason: 'Not found or access denied' }, req);
        return ResponseHandler.error(res, 'Patient not found', 404);
    }

    // [AUDIT] Log successful update
    AuditService.log('UPDATE_PATIENT', 'PATIENT', id, { updatedFields: { name, age, gender, phone } }, req);

    ResponseHandler.success(res, result.rows[0]);
});

module.exports = { searchPatients, getPatientById, updatePatient };
