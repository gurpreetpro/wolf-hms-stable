const { pool } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const ResponseHandler = require('../utils/responseHandler');

/**
 * Generate Unique Accession Number (Atomic)
 * Format: ACC-YYYYMMDD-XXXX (e.g., ACC-20250123-0001)
 */
const generateAccessionNumber = async (client, hospitalId) => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // 20250123
    const prefix = `ACC-${todayStr}-`;

    const res = await client.query(
        "SELECT accession_number FROM radiology_orders WHERE accession_number LIKE $1 ORDER BY id DESC LIMIT 1",
        [`${prefix}%`]
    );

    let nextSeq = 1;
    if (res.rows.length > 0) {
        const lastAcc = res.rows[0].accession_number;
        const lastSeq = parseInt(lastAcc.split('-')[2]);
        if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

/**
 * Create Radiology Order
 */
const createOrder = asyncHandler(async (req, res) => {
    const { patient_id, visit_id, admission_id, modality, study_description, clinical_history, priority } = req.body;
    const hospitalId = req.hospital_id;
    const userId = req.user.id; // User ordering (Doctor)

    if (!modality) return ResponseHandler.error(res, 'Modality (CT, MRI, XA) is required', 400);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Generate Accession Number (The Key for PACS/MWL)
        const accessionNumber = await generateAccessionNumber(client, hospitalId);

        // 2. Insert Order
        const result = await client.query(
            `INSERT INTO radiology_orders 
            (hospital_id, patient_id, visit_id, admission_id, accession_number, modality, study_description, clinical_history, priority, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Scheduled')
            RETURNING *`,
            [hospitalId, patient_id, visit_id, admission_id, accessionNumber, modality, study_description, clinical_history, priority || 'Routine']
        );

        await client.query('COMMIT');
        
        console.log(`[RIS] Order Created: ${accessionNumber} for ${modality}`);
        
        ResponseHandler.success(res, result.rows[0], 'Radiology Order Created Successfully', 201);

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
});

/**
 * Get Worklist (For Technicians / Worklist Providers)
 */
const getWorklist = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const { status, date } = req.query;

    let query = `
        SELECT ro.*, p.name as patient_name, p.dob, p.gender, p.uhid
        FROM radiology_orders ro
        JOIN patients p ON ro.patient_id = p.id
        WHERE ro.hospital_id = $1
    `;
    const params = [hospitalId];

    if (status) {
        query += ` AND ro.status = $2`;
        params.push(status);
    } else {
        query += ` AND ro.status != 'Reported'`; // Default: Active Items
    }

    query += ` ORDER BY ro.scheduled_date ASC`;

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

/**
 * Update Status (System or Manual)
 */
const updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, study_instance_uid, pacs_link } = req.body;

    const result = await pool.query(
        `UPDATE radiology_orders 
         SET status = COALESCE($1, status), 
             study_instance_uid = COALESCE($2, study_instance_uid),
             pacs_link = COALESCE($3, pacs_link),
             updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [status, study_instance_uid, pacs_link, id]
    );

    if (result.rows.length === 0) return ResponseHandler.error(res, 'Order not found', 404);

    ResponseHandler.success(res, result.rows[0]);
});

module.exports = { createOrder, getWorklist, updateStatus };
