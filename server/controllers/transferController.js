const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

function calculateCycles(checkIn, checkOut) {
    const hours = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60);
    return Math.max(1, Math.ceil(hours / 12));
}

function calculateBedCharges(checkIn, checkOut, ratePer12Hr) {
    const cycles = calculateCycles(checkIn, checkOut);
    return { cycles, amount: cycles * ratePer12Hr };
}

async function executeTransferInternal(transferId, userId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const transferRes = await client.query('SELECT * FROM bed_transfers WHERE id = $1', [transferId]);
        const transfer = transferRes.rows[0];
        const fromBedRes = await client.query('SELECT b.*, w.name as ward_name FROM beds b JOIN wards w ON w.id = b.ward_id WHERE b.id = $1', [transfer.from_bed_id]);
        const toBedRes = await client.query('SELECT b.*, w.name as ward_name FROM beds b JOIN wards w ON w.id = b.ward_id WHERE b.id = $1', [transfer.to_bed_id]);
        const toBed = toBedRes.rows[0];
        const now = new Date();
        const activeSegmentRes = await client.query(`SELECT * FROM bed_stay_segments WHERE admission_id = $1 AND check_out IS NULL ORDER BY check_in DESC LIMIT 1`, [transfer.admission_id]);
        if (activeSegmentRes.rows.length > 0) {
            const segment = activeSegmentRes.rows[0];
            const billing = calculateBedCharges(segment.check_in, now, segment.rate_per_12hr);
            await client.query(`UPDATE bed_stay_segments SET check_out = $1, cycles_charged = $2, total_amount = $3 WHERE id = $4`, [now, billing.cycles, billing.amount, segment.id]);
        }
        await client.query(`INSERT INTO bed_stay_segments (admission_id, patient_id, bed_id, ward_id, bed_type, check_in, rate_per_12hr) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [transfer.admission_id, transfer.patient_id, transfer.to_bed_id, toBed.ward_id, toBed.bed_type || 'Standard', now, toBed.rate_per_12hr || 1000]);
        await client.query(`UPDATE beds SET status = 'Available', patient_id = NULL, admission_id = NULL WHERE id = $1`, [transfer.from_bed_id]);
        await client.query(`UPDATE beds SET status = 'Occupied', patient_id = $1, admission_id = $2 WHERE id = $3`, [transfer.patient_id, transfer.admission_id, transfer.to_bed_id]);
        await client.query(`UPDATE admissions SET bed_id = $1 WHERE id = $2`, [transfer.to_bed_id, transfer.admission_id]).catch(() => {});
        await client.query(`UPDATE bed_transfers SET status = 'Completed', completed_at = NOW() WHERE id = $1`, [transferId]);
        await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
}

// Create Transfer Request - Multi-Tenant
const createTransferRequest = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, from_bed_id, to_bed_id, urgency = 'Routine', initiated_from, assigned_doctor_id, transfer_reason, notes } = req.body;
    const hospitalId = getHospitalId(req);
    
    const status = urgency === 'Emergency' ? 'Approved' : 'Pending';
    const approved_at = urgency === 'Emergency' ? new Date() : null;
    const result = await pool.query(`INSERT INTO bed_transfers (admission_id, patient_id, from_bed_id, to_bed_id, urgency, status, initiated_by, initiated_from, assigned_doctor_id, approval_doctor_id, transfer_reason, notes, approved_at, hospital_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [admission_id, patient_id, from_bed_id, to_bed_id, urgency, status, req.user.id, initiated_from, assigned_doctor_id, urgency === 'Emergency' ? req.user.id : null, transfer_reason, notes, approved_at, hospitalId]);
    const transfer = result.rows[0];
    if (urgency === 'Emergency') { await executeTransferInternal(transfer.id, req.user.id); transfer.status = 'Completed'; }
    if (req.io) { req.io.emit('transfer_request', { type: initiated_from === 'doctor' ? 'doctor_order' : 'ward_request', transfer, doctorId: assigned_doctor_id }); }
    ResponseHandler.success(res, transfer, 'Transfer created successfully', 201);
});

// Get Pending Approvals - Multi-Tenant
const getPendingApprovals = asyncHandler(async (req, res) => {
    const doctorId = req.user.id;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`SELECT t.*, fb.bed_number as from_bed_number, fw.name as from_ward_name, tb.bed_number as to_bed_number, tw.name as to_ward_name, p.name as patient_name, u.username as initiated_by_name
        FROM bed_transfers t LEFT JOIN beds fb ON fb.id = t.from_bed_id LEFT JOIN wards fw ON fw.id = fb.ward_id LEFT JOIN beds tb ON tb.id = t.to_bed_id LEFT JOIN wards tw ON tw.id = tb.ward_id
        LEFT JOIN patients p ON p.id = t.patient_id LEFT JOIN users u ON u.id = t.initiated_by
        WHERE t.status = 'Pending' AND t.initiated_from = 'ward' AND t.assigned_doctor_id = $1 AND (t.hospital_id = $2 OR t.hospital_id IS NULL) ORDER BY t.requested_at DESC`, [doctorId, hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Get Ward Pending Transfers - Multi-Tenant
const getWardPendingTransfers = asyncHandler(async (req, res) => {
    const { wardId } = req.params;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`SELECT t.*, fb.bed_number as from_bed_number, tb.bed_number as to_bed_number, tw.name as to_ward_name, p.name as patient_name, u.username as ordered_by_name
        FROM bed_transfers t LEFT JOIN beds fb ON fb.id = t.from_bed_id LEFT JOIN beds tb ON tb.id = t.to_bed_id LEFT JOIN wards tw ON tw.id = tb.ward_id
        LEFT JOIN patients p ON p.id = t.patient_id LEFT JOIN users u ON u.id = t.initiated_by
        WHERE t.status IN ('Pending', 'Approved') AND t.initiated_from = 'doctor' AND fb.ward_id = $1 AND (t.hospital_id = $2 OR t.hospital_id IS NULL) ORDER BY t.requested_at DESC`, [wardId, hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Approve Transfer - Multi-Tenant
const approveTransfer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doctorId = req.user.id;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`UPDATE bed_transfers SET status = 'Approved', approval_doctor_id = $1, approved_at = NOW() WHERE id = $2 AND status = 'Pending' AND (hospital_id = $3) RETURNING *`, [doctorId, id, hospitalId]);
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Transfer not found or already processed', 404);
    if (req.io) req.io.emit('transfer_approved', result.rows[0]);
    ResponseHandler.success(res, result.rows[0]);
});

// Reject Transfer - Multi-Tenant
const rejectTransfer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const doctorId = req.user.id;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`UPDATE bed_transfers SET status = 'Rejected', approval_doctor_id = $1, rejection_reason = $2, approved_at = NOW() WHERE id = $3 AND status = 'Pending' AND (hospital_id = $4) RETURNING *`, [doctorId, rejection_reason, id, hospitalId]);
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Transfer not found or already processed', 404);
    if (req.io) req.io.emit('transfer_rejected', result.rows[0]);
    ResponseHandler.success(res, result.rows[0]);
});

// Acknowledge Transfer - Multi-Tenant
const acknowledgeTransfer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    
    const check = await pool.query('SELECT * FROM bed_transfers WHERE id = $1 AND (hospital_id = $2)', [id, hospitalId]);
    if (check.rows.length === 0) return ResponseHandler.error(res, 'Transfer not found', 404);

    await pool.query(`UPDATE bed_transfers SET status = 'Approved', approved_at = NOW() WHERE id = $1 AND status = 'Pending' AND initiated_from = 'doctor'`, [id]);
    await executeTransferInternal(id, req.user.id);
    const result = await pool.query('SELECT * FROM bed_transfers WHERE id = $1', [id]);
    if (req.io) req.io.emit('transfer_completed', result.rows[0]);
    ResponseHandler.success(res, result.rows[0]);
});

// Execute Transfer - Multi-Tenant
const executeTransfer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);

    const check = await pool.query('SELECT * FROM bed_transfers WHERE id = $1 AND (hospital_id = $2)', [id, hospitalId]);
    if (check.rows.length === 0) return ResponseHandler.error(res, 'Transfer not found', 404);

    await executeTransferInternal(id, req.user.id);
    const result = await pool.query('SELECT * FROM bed_transfers WHERE id = $1', [id]);
    if (req.io) req.io.emit('transfer_completed', result.rows[0]);
    ResponseHandler.success(res, result.rows[0]);
});

// Get Transfer History - Multi-Tenant
const getTransferHistory = asyncHandler(async (req, res) => {
    const { admissionId } = req.params;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`SELECT t.*, fb.bed_number as from_bed_number, tb.bed_number as to_bed_number, fw.name as from_ward_name, tw.name as to_ward_name, u1.username as initiated_by_name, u2.username as approved_by_name
        FROM bed_transfers t LEFT JOIN beds fb ON fb.id = t.from_bed_id LEFT JOIN beds tb ON tb.id = t.to_bed_id LEFT JOIN wards fw ON fw.id = fb.ward_id LEFT JOIN wards tw ON tw.id = tb.ward_id
        LEFT JOIN users u1 ON u1.id = t.initiated_by LEFT JOIN users u2 ON u2.id = t.approval_doctor_id
        WHERE t.admission_id = $1 AND (t.hospital_id = $2 OR t.hospital_id IS NULL) ORDER BY t.requested_at DESC`, [admissionId, hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Get Billing Segments - Multi-Tenant
const getBillingSegments = asyncHandler(async (req, res) => {
    const { admissionId } = req.params;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`SELECT s.*, b.bed_number, w.name as ward_name FROM bed_stay_segments s LEFT JOIN beds b ON b.id = s.bed_id LEFT JOIN wards w ON w.id = s.ward_id
        WHERE s.admission_id = $1 AND (s.hospital_id = $2 OR s.hospital_id IS NULL) ORDER BY s.check_in ASC`, [admissionId, hospitalId]);
    let total = 0;
    const segments = result.rows.map(s => {
        if (s.check_out) { total += parseFloat(s.total_amount) || 0; }
        else { const billing = calculateBedCharges(s.check_in, new Date(), s.rate_per_12hr); s.current_cycles = billing.cycles; s.current_amount = billing.amount; total += billing.amount; }
        return s;
    });
    ResponseHandler.success(res, { segments, total });
});

// Get Available Beds - Multi-Tenant
const getAvailableBeds = asyncHandler(async (req, res) => {
    const { excludeBedId } = req.query;
    const hospitalId = getHospitalId(req);
    
    let query = `SELECT b.*, w.name as ward_name FROM beds b JOIN wards w ON w.id = b.ward_id WHERE b.status = 'Available' AND (b.hospital_id = $1 OR b.hospital_id IS NULL)`;
    const params = [hospitalId];
    if (excludeBedId) { query += ` AND b.id != $2`; params.push(excludeBedId); }
    query += ` ORDER BY w.name, b.bed_number`;
    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

module.exports = { createTransferRequest, getPendingApprovals, getWardPendingTransfers, approveTransfer, rejectTransfer, acknowledgeTransfer, executeTransfer, getTransferHistory, getBillingSegments, getAvailableBeds, calculateCycles, calculateBedCharges };
