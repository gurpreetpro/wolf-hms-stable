const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get all wards with bed counts - MULTI-TENANT
const getWards = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    // const hospitalId = 1; // [DEBUG] FORCE ID 1 - Reverted
    console.log(`[DEBUG] getWards - User: ${req.user?.username}, Role: ${req.user?.role}, HospitalID: ${hospitalId}`);
    
    // Check if is_active column exists (safety net)
    // Actually, purely logging for now.
    
    const result = await pool.query(`
        SELECT w.*, 
                COUNT(b.id) as total_beds,
                COUNT(b.id) FILTER (WHERE b.status = 'Available') as available_beds,
                COUNT(b.id) FILTER (WHERE b.status = 'Occupied') as occupied_beds
        FROM wards w
        LEFT JOIN beds b ON b.ward_id = w.id
        WHERE w.is_active IS NOT FALSE AND w.hospital_id = $1
        GROUP BY w.id
        ORDER BY w.name
    `, [hospitalId]);
    
    console.log(`[DEBUG] getWards - Found ${result.rows.length} wards`);
    ResponseHandler.success(res, result.rows);
});

// Create new ward - MULTI-TENANT
const createWard = asyncHandler(async (req, res) => {
    const { name, type, floor, capacity, billing_cycle } = req.body;
    const hospitalId = req.hospital_id;
    
    try {
        const result = await pool.query(
            `INSERT INTO wards (name, type, floor, capacity, billing_cycle, hospital_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, type || 'General', floor, capacity || 10, billing_cycle || 24, hospitalId]
        );
        ResponseHandler.success(res, result.rows[0], 'Ward created successfully', 201);
    } catch (err) {
        if (err.code === '23505') {
            return ResponseHandler.error(res, 'Ward with this name already exists', 400);
        }
        throw err;
    }
});

// Update ward - MULTI-TENANT
const updateWard = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, type, floor, capacity, billing_cycle, is_active } = req.body;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `UPDATE wards SET name = COALESCE($1, name), type = COALESCE($2, type),
                floor = COALESCE($3, floor), capacity = COALESCE($4, capacity), 
                billing_cycle = COALESCE($5, billing_cycle), is_active = COALESCE($6, is_active)
            WHERE id = $7 AND hospital_id = $8 RETURNING *`,
        [name, type, floor, capacity, billing_cycle, is_active, id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Ward not found', 404);
    ResponseHandler.success(res, result.rows[0]);
});

// Delete ward - MULTI-TENANT
const deleteWard = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `UPDATE wards SET is_active = false WHERE id = $1 AND hospital_id = $2 RETURNING *`,
        [id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Ward not found', 404);
    ResponseHandler.success(res, { message: 'Ward deleted successfully' });
});

// Get beds by ward - MULTI-TENANT (with patient info for occupied beds)
const getBeds = asyncHandler(async (req, res) => {
    const { ward_id } = req.query;
    const hospitalId = req.hospital_id;
    
    // Join with admissions and patients to get patient name for occupied beds
    // [FIX] Derive status from admission existence because 'beds.status' might be out of sync
    let query = `
        SELECT b.id, b.ward_id, b.bed_number, b.bed_type, b.daily_rate, b.hospital_id,
               w.name as ward_name, 
               a.id as admission_id, p.name as patient_name, p.id as patient_id, p.uhid as patient_uhid, a.ipd_number,
               CASE 
                   WHEN a.id IS NOT NULL THEN 'Occupied' 
                   ELSE b.status 
               END as status
        FROM beds b
        JOIN wards w ON w.id = b.ward_id
        LEFT JOIN admissions a ON a.bed_number = b.bed_number AND TRIM(LOWER(a.ward)) = TRIM(LOWER(w.name)) AND a.status = 'Admitted'
        LEFT JOIN patients p ON a.patient_id = p.id
        WHERE w.hospital_id = $1`;
    const params = [hospitalId];

    if (ward_id) {
        params.push(ward_id);
        query += ` AND b.ward_id = $${params.length}`;
    }
    query += ' ORDER BY w.name, b.bed_number';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// Create new bed - MULTI-TENANT
const createBed = asyncHandler(async (req, res) => {
    const { ward_id, bed_number, bed_type, daily_rate } = req.body;
    const hospitalId = req.hospital_id;

    // Verify ward belongs to hospital
    const wardCheck = await pool.query('SELECT id FROM wards WHERE id = $1 AND hospital_id = $2', [ward_id, hospitalId]);
    if (wardCheck.rows.length === 0) return ResponseHandler.error(res, 'Ward not found', 404);

    try {
        const result = await pool.query(
            `INSERT INTO beds (ward_id, bed_number, bed_type, daily_rate, hospital_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [ward_id, bed_number, bed_type || 'Standard', daily_rate || 2000, hospitalId]
        );
        ResponseHandler.success(res, result.rows[0], 'Bed created successfully', 201);
    } catch (err) {
        if (err.code === '23505') {
            return ResponseHandler.error(res, 'Bed number already exists in this ward', 400);
        }
        throw err;
    }
});

// Update bed - MULTI-TENANT
const updateBed = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { bed_number, bed_type, daily_rate, status } = req.body;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `UPDATE beds SET bed_number = COALESCE($1, bed_number), bed_type = COALESCE($2, bed_type), 
                daily_rate = COALESCE($3, daily_rate), status = COALESCE($4, status)
            WHERE id = $5 AND hospital_id = $6 RETURNING *`,
        [bed_number, bed_type, daily_rate, status, id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Bed not found', 404);
    ResponseHandler.success(res, result.rows[0]);
});

// Delete bed - MULTI-TENANT
const deleteBed = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = req.hospital_id;

    const check = await pool.query(`SELECT status FROM beds WHERE id = $1 AND hospital_id = $2`, [id, hospitalId]);
    if (check.rows.length === 0) return ResponseHandler.error(res, 'Bed not found', 404);
    if (check.rows[0].status === 'Occupied') return ResponseHandler.error(res, 'Cannot delete an occupied bed', 400);

    await pool.query(`DELETE FROM beds WHERE id = $1 AND hospital_id = $2`, [id, hospitalId]);
    ResponseHandler.success(res, { message: 'Bed deleted successfully' });
});

// Consumables & Charges - MULTI-TENANT
const getConsumables = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const result = await pool.query("SELECT * FROM ward_consumables WHERE hospital_id = $1 ORDER BY name", [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

const getCharges = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const result = await pool.query("SELECT * FROM ward_service_charges WHERE hospital_id = $1 ORDER BY name", [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

const requestChange = asyncHandler(async (req, res) => {
    const { request_type, item_type, item_id, new_name, new_price, notes } = req.body;
    const requested_by = req.user.id;
    const hospitalId = req.hospital_id;

    await pool.query(
        `INSERT INTO ward_change_requests (request_type, item_type, item_id, new_name, new_price, requested_by, notes, hospital_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [request_type, item_type, item_id, new_name, new_price, requested_by, notes, hospitalId]
    );
    ResponseHandler.success(res, { message: 'Request submitted successfully' }, 'Success', 201);
});

const getRequests = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const result = await pool.query(`
        SELECT r.*, u.username as requested_by_name,
                CASE WHEN r.item_type = 'CONSUMABLE' THEN wc.name WHEN r.item_type = 'SERVICE' THEN wsc.name ELSE 'New Item' END as item_name,
                CASE WHEN r.item_type = 'CONSUMABLE' THEN wc.price WHEN r.item_type = 'SERVICE' THEN wsc.price ELSE 0 END as current_price
        FROM ward_change_requests r
        LEFT JOIN users u ON r.requested_by = u.id
        LEFT JOIN ward_consumables wc ON r.item_type = 'CONSUMABLE' AND r.item_id = wc.id
        LEFT JOIN ward_service_charges wsc ON r.item_type = 'SERVICE' AND r.item_id = wsc.id
        WHERE r.status = 'Pending' AND r.hospital_id = $1
        ORDER BY r.created_at DESC
    `, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

const handleRequest = asyncHandler(async (req, res) => {
    const { id, action } = req.params;
    const processed_by = req.user.id;
    const hospitalId = req.hospital_id;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        const reqResult = await client.query("SELECT * FROM ward_change_requests WHERE id = $1 AND hospital_id = $2", [id, hospitalId]);
        if (reqResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return ResponseHandler.error(res, 'Request not found', 404);
        }
        const request = reqResult.rows[0];
        if (request.status !== 'Pending') {
            await client.query('ROLLBACK');
            return ResponseHandler.error(res, 'Request already processed', 400);
        }

        if (action === 'approve') {
            if (request.item_type === 'CONSUMABLE') {
                if (request.request_type === 'PRICE_CHANGE') {
                    await client.query("UPDATE ward_consumables SET price = $1 WHERE id = $2", [request.new_price, request.item_id]);
                } else if (request.request_type === 'NEW_ITEM') {
                    await client.query("INSERT INTO ward_consumables (name, price, stock_quantity, hospital_id) VALUES ($1, $2, 0, $3)", [request.new_name, request.new_price, hospitalId]);
                } else if (request.request_type === 'TOGGLE_STATUS') {
                    await client.query("UPDATE ward_consumables SET active = NOT active WHERE id = $1", [request.item_id]);
                }
            } else if (request.item_type === 'SERVICE') {
                if (request.request_type === 'PRICE_CHANGE') {
                    await client.query("UPDATE ward_service_charges SET price = $1 WHERE id = $2", [request.new_price, request.item_id]);
                }
            }
        }

        const status = action === 'approve' ? 'Approved' : 'Denied';
        await client.query("UPDATE ward_change_requests SET status = $1, processed_at = NOW(), processed_by = $2 WHERE id = $3", [status, processed_by, id]);
        await client.query('COMMIT');
        ResponseHandler.success(res, { message: `Request ${status} successfully` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        throw err;
    } finally {
        client.release();
    }
});

// Get My Assignments - Multi-Tenant
const getAssignments = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    // For demo, return all active admissions
    const result = await pool.query(`
        SELECT a.id, a.patient_id, p.name as patient_name, a.ward, a.bed_number, a.status 
        FROM admissions a 
        JOIN patients p ON a.patient_id = p.id 
        WHERE a.status = 'Admitted' AND a.hospital_id = $1
    `, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Get Vitals - Multi-Tenant
const getVitals = asyncHandler(async (req, res) => {
    const { admissionId } = req.params;
    const hospitalId = req.hospital_id;
    const result = await pool.query(
        'SELECT v.*, u.username as recorded_by_name FROM patient_vitals v LEFT JOIN users u ON v.recorded_by = u.id WHERE v.admission_id = $1 AND v.hospital_id = $2 ORDER BY v.recorded_at DESC',
        [admissionId, hospitalId]
    );
    ResponseHandler.success(res, result.rows);
});

// Add Vitals - Multi-Tenant
const addVitals = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, temperature, systolic_bp, diastolic_bp, heart_rate, spo2, respiratory_rate, consciousness_level, notes } = req.body;
    const hospitalId = req.hospital_id;
    const recorded_by = req.user.id;
    
    const result = await pool.query(
        `INSERT INTO patient_vitals 
        (admission_id, patient_id, recorded_by, temperature, systolic_bp, diastolic_bp, heart_rate, spo2, respiratory_rate, consciousness_level, notes, hospital_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [admission_id, patient_id, recorded_by, temperature, systolic_bp, diastolic_bp, heart_rate, spo2, respiratory_rate, consciousness_level, notes, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Vitals recorded', 201);
});

// Get eMAR - Multi-Tenant
const getEMAR = asyncHandler(async (req, res) => {
    const { admissionId } = req.params;
    const hospitalId = req.hospital_id;
    
    // Get Patient ID from Admission
    const admRes = await pool.query('SELECT patient_id FROM admissions WHERE id = $1 AND hospital_id = $2', [admissionId, hospitalId]);
    if (admRes.rows.length === 0) return ResponseHandler.error(res, 'Admission not found', 404);
    const patientId = admRes.rows[0].patient_id;

    // Get Active Prescription
    const prescRes = await pool.query(
        'SELECT * FROM prescriptions WHERE patient_id = $1 AND is_active = true AND hospital_id = $2 ORDER BY created_at DESC LIMIT 1',
        [patientId, hospitalId]
    );
    
    // Get Logs
    const logsRes = await pool.query(
        'SELECT l.*, u.username as administered_by_name FROM emar_logs l LEFT JOIN users u ON l.administered_by = u.id WHERE l.admission_id = $1 AND l.hospital_id = $2 ORDER BY l.administered_at DESC',
        [admissionId, hospitalId]
    );

    ResponseHandler.success(res, {
        prescription: prescRes.rows[0] || null,
        logs: logsRes.rows
    });
});

// Add eMAR Log - Multi-Tenant
const addEMAR = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, medication_name, dosage, status, notes } = req.body;
    const hospitalId = req.hospital_id;
    const administered_by = req.user.id;

    const result = await pool.query(
        `INSERT INTO emar_logs 
        (admission_id, patient_id, medication_name, dosage, administered_by, status, notes, hospital_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [admission_id, patient_id, medication_name, dosage, administered_by, status, notes, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Medication admin logged', 201);
});

// Mark Bed Clean (Phase 3)
const markBedClean = asyncHandler(async (req, res) => {
    const { bed_id, status } = req.body; // status should be 'Available'
    const hospitalId = req.hospital_id;

    if (status !== 'Available') {
         return ResponseHandler.error(res, 'Invalid status. Only marking as Available is allowed here.', 400);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update Bed Status
        const bedRes = await client.query(
            `UPDATE beds SET status = 'Available' WHERE id = $1 AND hospital_id = $2 RETURNING *`,
            [bed_id, hospitalId]
        );

        if (bedRes.rows.length === 0) {
            throw new Error('Bed not found');
        }

        const bed = bedRes.rows[0];

        // 2. Close Housekeeping Task (if any)
        // Find task matching bed number and ward
        const wardRes = await client.query('SELECT name FROM wards WHERE id = $1', [bed.ward_id]);
        const wardName = wardRes.rows[0].name;

        // Auto-close associated cleaning task
        const taskDescPattern = `Terminal Cleaning - Bed ${bed.bed_number} (${wardName})`;
        await client.query(
            `UPDATE care_tasks SET status = 'Completed', completed_at = CURRENT_TIMESTAMP 
             WHERE description = $1 AND status = 'Pending' AND hospital_id = $2`,
            [taskDescPattern, hospitalId]
        );

        await client.query('COMMIT');
        ResponseHandler.success(res, { bed: bedRes.rows[0] }, 'Bed marked as Clean and Available');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
});

module.exports = {
    getWards, createWard, updateWard, deleteWard,
    getBeds, createBed, updateBed, deleteBed,
    markBedClean, // [PHASE 3]
    getConsumables, getCharges, requestChange, getRequests, handleRequest,
    getAssignments,
    getVitals, addVitals, getEMAR, addEMAR
};
