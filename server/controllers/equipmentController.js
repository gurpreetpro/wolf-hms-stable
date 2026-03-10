const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

function calculateEquipmentCycles(assignedAt, removedAt) {
    const hours = (new Date(removedAt) - new Date(assignedAt)) / (1000 * 60 * 60);
    return Math.max(1, Math.ceil(hours / 24));
}

const calculateEquipmentCharges = (assignedAt, removedAt, ratePer24Hr) => {
    const start = new Date(assignedAt); const end = removedAt ? new Date(removedAt) : new Date();
    if (end < start) return { cycles: 0, amount: 0 };
    const diffHours = (end - start) / (1000 * 60 * 60); const cycles = Math.max(1, Math.ceil(diffHours / 24));
    return { cycles, amount: cycles * Number.parseFloat(ratePer24Hr || 0) };
};

// Get Equipment Types - Multi-Tenant
const getEquipmentTypes = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`SELECT * FROM equipment_types WHERE is_active = true AND (hospital_id = $1 OR hospital_id IS NULL) ORDER BY category, name`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Get Equipment Type - Multi-Tenant
const getEquipmentType = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    const result = await pool.query('SELECT * FROM equipment_types WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [id, hospitalId]); 
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Equipment type not found', 404);
    ResponseHandler.success(res, result.rows[0]);
});

// Request Add Equipment - Multi-Tenant
const requestAddEquipment = asyncHandler(async (req, res) => {
    const { name, category, rate_per_24hr, description } = req.body;
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`INSERT INTO equipment_change_requests (action, name, category, rate_per_24hr, description, requested_by, hospital_id) VALUES ('add', $1, $2, $3, $4, $5, $6) RETURNING *`, [name, category, rate_per_24hr, description, req.user.id, hospitalId]); 
    ResponseHandler.success(res, { message: 'Add request submitted for admin approval', request: result.rows[0] }, 'Add request submitted for admin approval', 201);
});

// Request Edit Equipment - Multi-Tenant
const requestEditEquipment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, category, rate_per_24hr, description } = req.body;
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`INSERT INTO equipment_change_requests (equipment_type_id, action, name, category, rate_per_24hr, description, requested_by, hospital_id) VALUES ($1, 'edit', $2, $3, $4, $5, $6, $7) RETURNING *`, [id, name, category, rate_per_24hr, description, req.user.id, hospitalId]); 
    ResponseHandler.success(res, { message: 'Edit request submitted for admin approval', request: result.rows[0] }, 'Edit request submitted for admin approval', 201);
});

// Request Delete Equipment - Multi-Tenant
const requestDeleteEquipment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    const eqResult = await pool.query('SELECT * FROM equipment_types WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [id, hospitalId]); 
    if (eqResult.rows.length === 0) return ResponseHandler.error(res, 'Equipment type not found', 404); 
    const eq = eqResult.rows[0];
    const result = await pool.query(`INSERT INTO equipment_change_requests (equipment_type_id, action, name, category, rate_per_24hr, requested_by, hospital_id) VALUES ($1, 'delete', $2, $3, $4, $5, $6) RETURNING *`, [id, eq.name, eq.category, eq.rate_per_24hr, req.user.id, hospitalId]); 
    ResponseHandler.success(res, { message: 'Delete request submitted for admin approval', request: result.rows[0] }, 'Delete request submitted for admin approval', 201);
});

// Get Pending Requests - Multi-Tenant
const getPendingRequests = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`SELECT r.*, u.username as requested_by_name FROM equipment_change_requests r LEFT JOIN users u ON u.id = r.requested_by WHERE r.status = 'Pending' AND (r.hospital_id = $1 OR r.hospital_id IS NULL) ORDER BY r.requested_at DESC`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Approve Request - Multi-Tenant
const approveRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const reqResult = await client.query('SELECT * FROM equipment_change_requests WHERE id = $1 AND status = $2 AND (hospital_id = $3 OR hospital_id IS NULL)', [id, 'Pending', hospitalId]);
        if (reqResult.rows.length === 0) { await client.query('ROLLBACK'); return ResponseHandler.error(res, 'Request not found or already processed', 404); }
        const request = reqResult.rows[0];
        if (request.action === 'add') { await client.query(`INSERT INTO equipment_types (name, category, rate_per_24hr, description, hospital_id) VALUES ($1, $2, $3, $4, $5)`, [request.name, request.category, request.rate_per_24hr, request.description, hospitalId]); }
        else if (request.action === 'edit') { await client.query(`UPDATE equipment_types SET name = $1, category = $2, rate_per_24hr = $3, description = $4, updated_at = NOW() WHERE id = $5`, [request.name, request.category, request.rate_per_24hr, request.description, request.equipment_type_id]); }
        else if (request.action === 'delete') { await client.query(`UPDATE equipment_types SET is_active = false, updated_at = NOW() WHERE id = $1`, [request.equipment_type_id]); }
        await client.query(`UPDATE equipment_change_requests SET status = 'Approved', admin_id = $1, resolved_at = NOW() WHERE id = $2`, [req.user.id, id]);
        await client.query('COMMIT'); 
        ResponseHandler.success(res, { message: `Request approved and ${request.action} applied successfully` });
    } catch (err) { 
        await client.query('ROLLBACK'); 
        throw err;
    } finally { 
        client.release(); 
    }
});

// Deny Request - Multi-Tenant
const denyRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { denial_reason } = req.body;
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`UPDATE equipment_change_requests SET status = 'Denied', admin_id = $1, denial_reason = $2, resolved_at = NOW() WHERE id = $3 AND status = 'Pending' AND (hospital_id = $4 OR hospital_id IS NULL) RETURNING *`, [req.user.id, denial_reason, id, hospitalId]); 
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Request not found or already processed', 404); 
    ResponseHandler.success(res, { message: 'Request denied', request: result.rows[0] });
});

// Assign Equipment - Multi-Tenant
const assignEquipment = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, bed_id, equipment_type_id, notes } = req.body;
    const hospitalId = getHospitalId(req);
    
    const eqResult = await pool.query('SELECT * FROM equipment_types WHERE id = $1 AND is_active = true AND (hospital_id = $2 OR hospital_id IS NULL)', [equipment_type_id, hospitalId]); 
    if (eqResult.rows.length === 0) return ResponseHandler.error(res, 'Equipment type not found', 404);
    
    const existingResult = await pool.query(`SELECT * FROM equipment_assignments WHERE admission_id = $1 AND equipment_type_id = $2 AND removed_at IS NULL AND (hospital_id = $3 OR hospital_id IS NULL)`, [admission_id, equipment_type_id, hospitalId]); 
    if (existingResult.rows.length > 0) return ResponseHandler.error(res, 'This equipment is already assigned to this patient', 400);
    
    const result = await pool.query(`INSERT INTO equipment_assignments (admission_id, patient_id, bed_id, equipment_type_id, assigned_by, assigned_by_role, notes, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [admission_id, patient_id, bed_id, equipment_type_id, req.user.id, req.user.role, notes, hospitalId]); 
    ResponseHandler.success(res, result.rows[0], 'Equipment assigned successfully', 201);
});

// Remove Equipment - Multi-Tenant
const removeEquipment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    
    const assignResult = await pool.query(`SELECT a.*, e.rate_per_24hr FROM equipment_assignments a JOIN equipment_types e ON e.id = a.equipment_type_id WHERE a.id = $1 AND a.removed_at IS NULL AND (a.hospital_id = $2 OR a.hospital_id IS NULL)`, [id, hospitalId]); 
    if (assignResult.rows.length === 0) return ResponseHandler.error(res, 'Assignment not found or already removed', 404);
    
    const assignment = assignResult.rows[0]; const now = new Date(); const billing = calculateEquipmentCharges(assignment.assigned_at, now, assignment.rate_per_24hr);
    const result = await pool.query(`UPDATE equipment_assignments SET removed_at = $1, removed_by = $2, cycles_charged = $3, total_amount = $4 WHERE id = $5 RETURNING *`, [now, req.user.id, billing.cycles, billing.amount, id]);
    
    ResponseHandler.success(res, { ...result.rows[0], billing: { cycles: billing.cycles, amount: billing.amount, ratePer24Hr: assignment.rate_per_24hr } });
});

// Get Patient Equipment - Multi-Tenant
const getPatientEquipment = asyncHandler(async (req, res) => {
    const { admissionId } = req.params;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`SELECT a.*, e.name, e.category, COALESCE(e.rate_per_24hr, 100) as rate_per_24hr, u.username as assigned_by_name FROM equipment_assignments a LEFT JOIN equipment_types e ON e.id = a.equipment_type_id LEFT JOIN users u ON u.id = a.assigned_by
        WHERE a.admission_id = $1 AND (a.hospital_id = $2 OR a.hospital_id IS NULL) ORDER BY a.removed_at NULLS FIRST, a.assigned_at DESC`, [admissionId, hospitalId]);
    const assignments = result.rows.map(a => { if (!a.removed_at) { const billing = calculateEquipmentCharges(a.assigned_at, new Date(), a.rate_per_24hr); a.current_cycles = billing.cycles; a.current_amount = billing.amount; } return a; }); 
    ResponseHandler.success(res, assignments);
});

// Get Equipment Billing - Multi-Tenant
const getEquipmentBilling = asyncHandler(async (req, res) => {
    const { admissionId } = req.params;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`SELECT a.*, e.name, e.category, COALESCE(e.rate_per_24hr, 100) as rate_per_24hr FROM equipment_assignments a LEFT JOIN equipment_types e ON e.id = a.equipment_type_id WHERE a.admission_id = $1 AND (a.hospital_id = $2 OR a.hospital_id IS NULL) ORDER BY a.assigned_at`, [admissionId, hospitalId]);
    let totalAmount = 0;
    const lineItems = result.rows.map(a => { let cycles, amount; if (a.removed_at) { cycles = a.cycles_charged; amount = Number.parseFloat(a.total_amount); } else { const billing = calculateEquipmentCharges(a.assigned_at, new Date(), a.rate_per_24hr); cycles = billing.cycles; amount = billing.amount; } totalAmount += amount;
        return { id: a.id, name: a.name, category: a.category, assignedAt: a.assigned_at, removedAt: a.removed_at, ratePer24Hr: a.rate_per_24hr, cycles, amount, status: a.removed_at ? 'Completed' : 'Active' }; });
    ResponseHandler.success(res, { lineItems, totalAmount });
});

// DEBUG: Get Schema Info
const getEquipmentSchema = asyncHandler(async (req, res) => {
    const tableInfo = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'equipment_change_requests'
    `);
    
    // Also try to get requests to see the error
    let queryError = null;
    try {
        await pool.query('SELECT * FROM equipment_change_requests LIMIT 1');
    } catch (e) {
        queryError = e.message;
    }

    ResponseHandler.success(res, { 
        columns: tableInfo.rows, 
        queryError,
        dbUser: process.env.DB_USER,
        dbHost: process.env.DB_HOST 
    });
});

// ============================================
// BIOMED DASHBOARD
// ============================================
const getBiomedDashboard = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const [totalR, duePmR, overdueR, activeAmcR, pendingCalibR] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM equipment_types WHERE is_active = true AND (hospital_id = $1 OR hospital_id IS NULL)', [hospitalId]),
        pool.query("SELECT COUNT(*) FROM equipment_pm_schedules WHERE hospital_id = $1 AND next_pm_date <= CURRENT_DATE + INTERVAL '7 days' AND status = 'SCHEDULED'", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM equipment_pm_schedules WHERE hospital_id = $1 AND next_pm_date < CURRENT_DATE AND status = 'SCHEDULED'", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM equipment_amc_contracts WHERE hospital_id = $1 AND status = 'ACTIVE' AND end_date >= CURRENT_DATE", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM equipment_calibrations WHERE hospital_id = $1 AND next_calibration_date <= CURRENT_DATE + INTERVAL '30 days'", [hospitalId]),
    ]);

    ResponseHandler.success(res, {
        total_equipment: Number.parseInt(totalR.rows[0].count),
        pm_due_this_week: Number.parseInt(duePmR.rows[0].count),
        overdue_pm: Number.parseInt(overdueR.rows[0].count),
        active_amc: Number.parseInt(activeAmcR.rows[0].count),
        calibration_due: Number.parseInt(pendingCalibR.rows[0].count),
    });
});

// ============================================
// PREVENTIVE MAINTENANCE (PM) SCHEDULES
// ============================================
const getPMSchedules = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { status } = req.query;

    let query = `SELECT pm.*, et.name AS equipment_name, et.category
                 FROM equipment_pm_schedules pm
                 LEFT JOIN equipment_types et ON pm.equipment_type_id = et.id
                 WHERE pm.hospital_id = $1`;
    const params = [hospitalId];
    let idx = 2;
    if (status && status !== 'All') { query += ` AND pm.status = $${idx++}`; params.push(status); }
    query += ' ORDER BY pm.next_pm_date ASC';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

const createPMSchedule = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { equipment_type_id, frequency_days, next_pm_date, checklist, notes } = req.body;

    if (!equipment_type_id) return ResponseHandler.error(res, 'equipment_type_id required', 400);

    const result = await pool.query(
        `INSERT INTO equipment_pm_schedules 
         (equipment_type_id, frequency_days, next_pm_date, checklist, notes, created_by, hospital_id, status)
         VALUES ($1, $2, COALESCE($3, CURRENT_DATE + make_interval(days => $2)), $4, $5, $6, $7, 'SCHEDULED') RETURNING *`,
        [equipment_type_id, frequency_days || 90, next_pm_date, JSON.stringify(checklist || []), notes, req.user.id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'PM schedule created', 201);
});

const completePM = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { id } = req.params;
    const { findings, actions_taken, next_pm_date } = req.body;

    const result = await pool.query(
        `UPDATE equipment_pm_schedules 
         SET status = 'COMPLETED', completed_date = CURRENT_DATE, completed_by = $1,
             findings = $2, actions_taken = $3, 
             next_pm_date = COALESCE($4, next_pm_date + make_interval(days => frequency_days)),
             updated_at = NOW()
         WHERE id = $5 AND hospital_id = $6 RETURNING *`,
        [req.user.id, findings, actions_taken, next_pm_date, id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'PM not found', 404);
    ResponseHandler.success(res, result.rows[0], 'PM completed');
});

// ============================================
// CALIBRATION
// ============================================
const getCalibrations = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `SELECT ec.*, et.name AS equipment_name, u.username AS calibrated_by_name
         FROM equipment_calibrations ec
         LEFT JOIN equipment_types et ON ec.equipment_type_id = et.id
         LEFT JOIN users u ON ec.calibrated_by = u.id
         WHERE ec.hospital_id = $1 ORDER BY ec.calibration_date DESC LIMIT 50`,
        [hospitalId]
    );
    ResponseHandler.success(res, result.rows);
});

const logCalibration = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { equipment_type_id, calibration_date, certificate_number, vendor, readings, next_calibration_date, notes } = req.body;

    if (!equipment_type_id) return ResponseHandler.error(res, 'equipment_type_id required', 400);

    const result = await pool.query(
        `INSERT INTO equipment_calibrations 
         (equipment_type_id, calibration_date, certificate_number, vendor, readings, next_calibration_date, notes, calibrated_by, hospital_id)
         VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [equipment_type_id, calibration_date, certificate_number, vendor, 
         JSON.stringify(readings || {}), next_calibration_date, notes, req.user.id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Calibration logged', 201);
});

// ============================================
// AMC CONTRACTS
// ============================================
const getAMCContracts = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { status } = req.query;

    let query = `SELECT amc.*, et.name AS equipment_name
                 FROM equipment_amc_contracts amc
                 LEFT JOIN equipment_types et ON amc.equipment_type_id = et.id
                 WHERE amc.hospital_id = $1`;
    const params = [hospitalId];
    let idx = 2;
    if (status && status !== 'All') { query += ` AND amc.status = $${idx++}`; params.push(status); }
    query += ' ORDER BY amc.end_date ASC';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

const createAMCContract = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { equipment_type_id, vendor, start_date, end_date, amount, terms, sla_response_hours, coverage_type } = req.body;

    if (!equipment_type_id || !vendor) return ResponseHandler.error(res, 'equipment_type_id and vendor required', 400);

    const result = await pool.query(
        `INSERT INTO equipment_amc_contracts 
         (equipment_type_id, vendor, start_date, end_date, amount, terms, sla_response_hours, coverage_type, created_by, hospital_id, status)
         VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5, $6, $7, $8, $9, $10, 'ACTIVE') RETURNING *`,
        [equipment_type_id, vendor, start_date, end_date, amount, terms, sla_response_hours || 4, coverage_type || 'COMPREHENSIVE', req.user.id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'AMC contract created', 201);
});

module.exports = { getEquipmentTypes, getEquipmentType, requestAddEquipment, requestEditEquipment, requestDeleteEquipment, getPendingRequests, approveRequest, denyRequest, assignEquipment, removeEquipment, getPatientEquipment, getEquipmentBilling, calculateEquipmentCycles, calculateEquipmentCharges, getEquipmentSchema,
    getBiomedDashboard, getPMSchedules, createPMSchedule, completePM,
    getCalibrations, logCalibration, getAMCContracts, createAMCContract,
};

