const pool = require('../config/db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get System Logs - Global (system logs don't have hospital_id)
const getLogs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT l.*, u.username FROM system_logs l LEFT JOIN users u ON l.user_id = u.id WHERE 1=1`;
    let countQuery = 'SELECT COUNT(*) FROM system_logs WHERE 1=1';
    let params = [];
    let paramIndex = 1;

    if (type) {
        query += ` AND l.action = $${paramIndex}`;
        countQuery += ` AND action = $${paramIndex}`;
        params.push(type);
        paramIndex++;
    }

    query += ` ORDER BY l.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query(countQuery, type ? [type] : []);

    ResponseHandler.success(res, {
        logs: result.rows,
        totalPages: Math.ceil(countResult.rows[0].count / limit),
        currentPage: parseInt(page)
    });
});

// Get Recent Patients - Multi-Tenant
const getRecentPatients = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    // Fixed: Calculate age from DOB as 'age' column might not exist
    const result = await pool.query(`
        SELECT id, name, EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(dob, CURRENT_DATE))) as age, 
                CASE WHEN EXISTS (SELECT 1 FROM admissions WHERE patient_id = patients.id AND discharge_date IS NULL) THEN 'Admitted' ELSE 'Outpatient' END as status
        FROM patients WHERE (hospital_id = $1 OR hospital_id IS NULL) ORDER BY created_at DESC LIMIT 10
    `, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Get Daily Tasks - Multi-Tenant
const getDailyTasks = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const invoiceRes = await pool.query("SELECT COUNT(*) FROM invoices WHERE status = 'Pending' AND (hospital_id = $1 OR hospital_id IS NULL)", [hospitalId]);
    const pendingInvoices = parseInt(invoiceRes.rows[0].count);

    const stockRes = await pool.query("SELECT COUNT(*) FROM inventory_items WHERE stock_quantity < reorder_level AND (hospital_id = $1 OR hospital_id IS NULL)", [hospitalId]);
    const lowStock = parseInt(stockRes.rows[0].count);

    const admissionRes = await pool.query("SELECT COUNT(*) FROM admissions WHERE discharge_date IS NULL AND (hospital_id = $1 OR hospital_id IS NULL)", [hospitalId]);
    const activeAdmissions = parseInt(admissionRes.rows[0].count);

    const tasks = [
        { id: 1, text: `Review ${pendingInvoices} Pending Invoices`, completed: pendingInvoices === 0 },
        { id: 2, text: `Reorder ${lowStock} Low Stock Items`, completed: lowStock === 0 },
        { id: 3, text: `Monitor ${activeAdmissions} Active Admissions`, completed: false },
        { id: 4, text: 'Check System Logs for Errors', completed: false }
    ];
    ResponseHandler.success(res, tasks);
});

// Get Analytics - Multi-Tenant
const getAnalytics = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const revenueRes = await pool.query(`
        SELECT DATE(generated_at) as date, SUM(total_amount) as total FROM invoices
        WHERE generated_at >= NOW() - INTERVAL '7 days' AND (hospital_id = $1 OR hospital_id IS NULL)
        GROUP BY DATE(generated_at) ORDER BY DATE(generated_at) ASC
    `, [hospitalId]);

    const patientsRes = await pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count FROM patients
        WHERE created_at >= NOW() - INTERVAL '7 days' AND (hospital_id = $1 OR hospital_id IS NULL)
        GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC
    `, [hospitalId]);

    ResponseHandler.success(res, { revenue: revenueRes.rows, patients: patientsRes.rows });
});

// Get Dashboard Stats - Multi-Tenant
const getStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const patientsRes = await pool.query('SELECT COUNT(*) FROM patients WHERE (hospital_id = $1 OR hospital_id IS NULL)', [hospitalId]);
    const totalPatients = parseInt(patientsRes.rows[0].count);

    const todayOPDRes = await pool.query("SELECT COUNT(*) FROM opd_visits WHERE visit_date = CURRENT_DATE AND (hospital_id = $1 OR hospital_id IS NULL)", [hospitalId]);
    const todayOPD = parseInt(todayOPDRes.rows[0].count);

    const admissionsRes = await pool.query("SELECT COUNT(*) FROM admissions WHERE status = 'Admitted' AND (hospital_id = $1 OR hospital_id IS NULL)", [hospitalId]);
    const activeAdmissions = parseInt(admissionsRes.rows[0].count);

    const revenueRes = await pool.query("SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE DATE(generated_at) = CURRENT_DATE AND (hospital_id = $1 OR hospital_id IS NULL)", [hospitalId]);
    const todayRevenue = parseFloat(revenueRes.rows[0].total);

    const staffRes = await pool.query("SELECT role, COUNT(*) FROM users WHERE is_active = true AND (hospital_id = $1 OR hospital_id IS NULL) GROUP BY role", [hospitalId]);
    const staffByRole = {};
    staffRes.rows.forEach(r => staffByRole[r.role] = parseInt(r.count));

    const pendingRes = await pool.query("SELECT COUNT(*) FROM users WHERE approval_status = 'PENDING' AND (hospital_id = $1 OR hospital_id IS NULL)", [hospitalId]);
    const pendingApprovals = parseInt(pendingRes.rows[0].count);

    ResponseHandler.success(res, {
        totalPatients,
        todayOPD,
        activeAdmissions,
        todayRevenue,
        staffByRole,
        pendingApprovals,
        totalStaff: Object.values(staffByRole).reduce((a, b) => a + b, 0)
    });
});

// [PHASE 5] Recovery: Force Create Patient (Manual ID/UHID)
const forceCreatePatient = asyncHandler(async (req, res) => {
    const { name, phone, age, gender, address, manual_uhid, manual_created_at } = req.body;
    const hospitalId = getHospitalId(req);

    // Validate inputs
    if (!name || !phone || !manual_uhid) {
        return ResponseHandler.error(res, 'Name, Phone, and Manual UHID are required', 400);
    }

    // Check if UHID exists
    const existing = await pool.query("SELECT id FROM patients WHERE uhid = $1 AND (hospital_id = $2 OR hospital_id IS NULL)", [manual_uhid, hospitalId]);
    if (existing.rows.length > 0) {
        return ResponseHandler.error(res, `Patient with UHID ${manual_uhid} already exists`, 400);
    }

    // Calculate DOB
    let dob = null;
    if (age) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - parseInt(age);
        dob = new Date(birthYear, 0, 1);
    }

    // Insert with explicit UHID and Timestamp
    // Note: We are depending on the DB schema allowing manual Insert into UHID
    const createdAt = manual_created_at || new Date();

    const result = await pool.query(`
        INSERT INTO patients (name, phone, dob, gender, address, uhid, created_at, hospital_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `, [name, phone, dob, gender, address, manual_uhid, createdAt, hospitalId]);

    // Audit
    // AuditService.log('RECOVERY_INSERT', 'PATIENT', result.rows[0].id, { manual_uhid, recovery_mode: true }, req);

    ResponseHandler.success(res, result.rows[0], 'Patient manually recovered successfully');
});

module.exports = { getLogs, getRecentPatients, getDailyTasks, getAnalytics, getStats, forceCreatePatient };
