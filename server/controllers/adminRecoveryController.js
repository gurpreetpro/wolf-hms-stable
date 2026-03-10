const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// ===========================================================================
// AUDIT LOGGING HELPER
// ===========================================================================
const logAdminAction = async (req, action, entityType, entityId, entityName, beforeData, afterData, reason) => {
    try {
        const hospitalId = getHospitalId(req);
        const userId = req.user?.id;
        const username = req.user?.username;
        const role = req.user?.role;
        const ipAddress = req.ip || req.connection?.remoteAddress;
        const userAgent = req.headers['user-agent'];

        await pool.query(`
            INSERT INTO admin_audit_log 
            (hospital_id, user_id, username, role, action, entity_type, entity_id, entity_name, before_data, after_data, reason, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [hospitalId, userId, username, role, action, entityType, entityId, entityName, 
            beforeData ? JSON.stringify(beforeData) : null, 
            afterData ? JSON.stringify(afterData) : null, 
            reason, ipAddress, userAgent]);
    } catch (err) {
        console.error('[Audit Log Error]', err.message);
        // Don't throw - audit failure shouldn't break the operation
    }
};

// Log patient history specifically
const logPatientHistory = async (req, patientId, action, beforeData, afterData, reason) => {
    try {
        const hospitalId = getHospitalId(req);
        const ipAddress = req.ip || req.connection?.remoteAddress;

        await pool.query(`
            INSERT INTO patient_history 
            (patient_id, hospital_id, changed_by, action, before_data, after_data, reason, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [patientId, hospitalId, req.user?.id, action, 
            beforeData ? JSON.stringify(beforeData) : null, 
            afterData ? JSON.stringify(afterData) : null, 
            reason, ipAddress]);
    } catch (err) {
        console.error('[Patient History Error]', err.message);
    }
};

// ===========================================================================
// PATIENT MANAGEMENT ENDPOINTS
// ===========================================================================

// Get all patients (including soft-deleted) - Admin Only
exports.getAllPatients = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { includeDeleted, search, page = 1, limit = 50 } = req.query;
    
    let query = `
        SELECT p.*, 
            CASE WHEN p.deleted_at IS NOT NULL THEN true ELSE false END as is_deleted,
            u.username as deleted_by_name
        FROM patients p 
        LEFT JOIN users u ON p.deleted_by = u.id
        WHERE p.hospital_id = $1
    `;
    const params = [hospitalId];
    
    // Filter by deleted status
    if (includeDeleted !== 'true') {
        query += ` AND p.deleted_at IS NULL`;
    }
    
    // Search filter
    if (search) {
        params.push(`%${search}%`);
        query += ` AND (p.name ILIKE $${params.length} OR p.uhid ILIKE $${params.length} OR p.phone ILIKE $${params.length} OR p.abha_id ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY p.deleted_at DESC NULLS LAST, p.created_at DESC`;
    
    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM patients WHERE hospital_id = $1`;
    const countParams = [hospitalId];
    if (includeDeleted !== 'true') {
        countQuery += ` AND deleted_at IS NULL`;
    }
    if (search) {
        countParams.push(`%${search}%`);
        countQuery += ` AND (name ILIKE $${countParams.length} OR uhid ILIKE $${countParams.length} OR phone ILIKE $${countParams.length})`;
    }
    const countResult = await pool.query(countQuery, countParams);
    
    await logAdminAction(req, 'VIEW_ALL_PATIENTS', 'patient', null, null, null, { count: result.rows.length, includeDeleted }, null);
    
    ResponseHandler.success(res, {
        patients: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
    });
});

// Get single patient with full details
exports.getPatientDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`
        SELECT p.*, 
            CASE WHEN p.deleted_at IS NOT NULL THEN true ELSE false END as is_deleted,
            u.username as deleted_by_name
        FROM patients p 
        LEFT JOIN users u ON p.deleted_by = u.id
        WHERE p.id = $1 AND p.hospital_id = $2
    `, [id, hospitalId]);
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Patient not found', 404);
    }
    
    // Get patient history
    const history = await pool.query(`
        SELECT ph.*, u.username as changed_by_name
        FROM patient_history ph
        LEFT JOIN users u ON ph.changed_by = u.id
        WHERE ph.patient_id = $1
        ORDER BY ph.changed_at DESC
        LIMIT 50
    `, [id]);
    
    // Get current admissions
    const admissions = await pool.query(`
        SELECT * FROM admissions 
        WHERE patient_id = $1 AND deleted_at IS NULL
        ORDER BY admission_date DESC
    `, [id]);
    
    ResponseHandler.success(res, {
        patient: result.rows[0],
        history: history.rows,
        admissions: admissions.rows
    });
});

// Create patient directly (bypass normal flow)
exports.createPatient = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { name, phone, dob, gender, address, uhid, abha_id } = req.body;
    
    if (!name || !phone) {
        return ResponseHandler.error(res, 'Name and phone are required', 400);
    }
    
    // Generate UHID if not provided
    let finalUhid = uhid;
    if (!finalUhid) {
        // Get hospital settings for UHID format
        const hospitalRes = await pool.query('SELECT code, settings FROM hospitals WHERE id = $1', [hospitalId]);
        const hospitalCode = hospitalRes.rows[0]?.code?.toUpperCase() || 'HMS';
        const settings = hospitalRes.rows[0]?.settings || {};
        const uhidConfig = settings.uhid_format || {};
        
        const prefix = uhidConfig.prefix || hospitalCode;
        const separator = uhidConfig.separator || '-';
        const suffixType = uhidConfig.suffix || 'YEAR';
        const seqLength = parseInt(uhidConfig.length) || 4;
        const startSequence = parseInt(uhidConfig.start_sequence) || 1;
        
        const currentYear = new Date().getFullYear();
        const suffix = suffixType === 'YEAR' ? `/${currentYear}` : '';
        const searchPattern = `${prefix}${separator}%${suffix}`;
        
        const allUhidsRes = await pool.query(
            "SELECT uhid FROM patients WHERE uhid LIKE $1 AND hospital_id = $2", 
            [searchPattern, hospitalId]
        );

        const usedSeqs = allUhidsRes.rows.map(r => {
            let core = r.uhid;
            if (core.startsWith(`${prefix}${separator}`)) {
                core = core.substring(prefix.length + separator.length);
            }
            if (suffix && core.endsWith(suffix)) {
                core = core.substring(0, core.length - suffix.length);
            }
            return parseInt(core, 10);
        }).filter(n => !isNaN(n)).sort((a, b) => a - b);

        let nextSeq = startSequence;
        for (const seq of usedSeqs) {
            if (seq === nextSeq) nextSeq++;
            else if (seq > nextSeq) break;
        }
        
        finalUhid = `${prefix}${separator}${String(nextSeq).padStart(seqLength, '0')}${suffix}`;
    }
    
    const result = await pool.query(`
        INSERT INTO patients (name, phone, dob, gender, address, uhid, hospital_id, abha_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `, [name, phone, dob || null, gender || null, address || null, finalUhid, hospitalId, abha_id || null]);
    
    const patient = result.rows[0];
    
    await logPatientHistory(req, patient.id, 'CREATE', null, patient, 'Direct creation via Admin Recovery Console');
    await logAdminAction(req, 'CREATE_PATIENT', 'patient', patient.id, patient.name, null, patient, 'Direct creation');
    
    ResponseHandler.success(res, patient, 'Patient created successfully', 201);
});

// Update patient
exports.updatePatient = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    const { name, phone, dob, gender, address, blood_group, emergency_contact, reason } = req.body;
    
    // Get current data for audit
    const current = await pool.query('SELECT * FROM patients WHERE id = $1 AND hospital_id = $2', [id, hospitalId]);
    if (current.rows.length === 0) {
        return ResponseHandler.error(res, 'Patient not found', 404);
    }
    const beforeData = current.rows[0];
    
    const result = await pool.query(`
        UPDATE patients SET
            name = COALESCE($1, name),
            phone = COALESCE($2, phone),
            dob = COALESCE($3, dob),
            gender = COALESCE($4, gender),
            address = COALESCE($5, address),
            blood_group = COALESCE($6, blood_group),
            emergency_contact = COALESCE($7, emergency_contact),
            updated_at = NOW()
        WHERE id = $8 AND hospital_id = $9
        RETURNING *
    `, [name, phone, dob, gender, address, blood_group, emergency_contact, id, hospitalId]);
    
    const afterData = result.rows[0];
    
    await logPatientHistory(req, id, 'UPDATE', beforeData, afterData, reason || 'Updated via Admin Recovery Console');
    await logAdminAction(req, 'UPDATE_PATIENT', 'patient', id, afterData.name, beforeData, afterData, reason);
    
    ResponseHandler.success(res, afterData, 'Patient updated successfully');
});

// Soft delete patient
exports.deletePatient = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    const { reason } = req.body;
    
    if (!reason) {
        return ResponseHandler.error(res, 'Deletion reason is required for compliance', 400);
    }
    
    // Get current data
    const current = await pool.query('SELECT * FROM patients WHERE id = $1 AND hospital_id = $2', [id, hospitalId]);
    if (current.rows.length === 0) {
        return ResponseHandler.error(res, 'Patient not found', 404);
    }
    
    if (current.rows[0].deleted_at) {
        return ResponseHandler.error(res, 'Patient is already deleted', 400);
    }
    
    const beforeData = current.rows[0];
    
    // Soft delete
    const result = await pool.query(`
        UPDATE patients SET
            deleted_at = NOW(),
            deleted_by = $1,
            deletion_reason = $2
        WHERE id = $3 AND hospital_id = $4
        RETURNING *
    `, [req.user?.id, reason, id, hospitalId]);
    
    const afterData = result.rows[0];
    
    await logPatientHistory(req, id, 'DELETE', beforeData, afterData, reason);
    await logAdminAction(req, 'DELETE_PATIENT', 'patient', id, beforeData.name, beforeData, afterData, reason);
    
    ResponseHandler.success(res, { id, deleted_at: afterData.deleted_at }, 'Patient soft-deleted successfully');
});

// Restore deleted patient
exports.restorePatient = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    const { reason } = req.body;
    
    if (!reason) {
        return ResponseHandler.error(res, 'Restoration reason is required for compliance', 400);
    }
    
    // Get current data
    const current = await pool.query('SELECT * FROM patients WHERE id = $1 AND hospital_id = $2', [id, hospitalId]);
    if (current.rows.length === 0) {
        return ResponseHandler.error(res, 'Patient not found', 404);
    }
    
    if (!current.rows[0].deleted_at) {
        return ResponseHandler.error(res, 'Patient is not deleted', 400);
    }
    
    const beforeData = current.rows[0];
    
    // Restore
    const result = await pool.query(`
        UPDATE patients SET
            deleted_at = NULL,
            deleted_by = NULL,
            deletion_reason = NULL
        WHERE id = $1 AND hospital_id = $2
        RETURNING *
    `, [id, hospitalId]);
    
    const afterData = result.rows[0];
    
    await logPatientHistory(req, id, 'RESTORE', beforeData, afterData, reason);
    await logAdminAction(req, 'RESTORE_PATIENT', 'patient', id, afterData.name, beforeData, afterData, reason);
    
    ResponseHandler.success(res, afterData, 'Patient restored successfully');
});

// Export patient data (Right to Access - DPDP Act)
exports.exportPatientData = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    
    // Get patient
    const patient = await pool.query('SELECT * FROM patients WHERE id = $1 AND hospital_id = $2', [id, hospitalId]);
    if (patient.rows.length === 0) {
        return ResponseHandler.error(res, 'Patient not found', 404);
    }
    
    // Get all related data
    const admissions = await pool.query('SELECT * FROM admissions WHERE patient_id = $1', [id]);
    const visits = await pool.query('SELECT * FROM opd_visits WHERE patient_id = $1', [id]);
    const vitals = await pool.query('SELECT * FROM vitals_logs WHERE patient_id = $1', [id]);
    const labs = await pool.query('SELECT * FROM lab_requests WHERE patient_id = $1', [id]);
    const invoices = await pool.query('SELECT * FROM invoices WHERE patient_id = $1', [id]);
    const history = await pool.query('SELECT * FROM patient_history WHERE patient_id = $1 ORDER BY changed_at DESC', [id]);
    
    const exportData = {
        exported_at: new Date().toISOString(),
        exported_by: req.user?.username,
        patient: patient.rows[0],
        admissions: admissions.rows,
        opd_visits: visits.rows,
        vitals: vitals.rows,
        lab_requests: labs.rows,
        invoices: invoices.rows,
        change_history: history.rows
    };
    
    await logAdminAction(req, 'EXPORT_PATIENT_DATA', 'patient', id, patient.rows[0].name, null, { exported_tables: Object.keys(exportData) }, 'Right to Access request');
    
    ResponseHandler.success(res, exportData, 'Patient data exported successfully');
});

// ===========================================================================
// AUDIT LOG ENDPOINTS
// ===========================================================================

// Get audit logs
exports.getAuditLogs = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { entityType, entityId, userId, startDate, endDate, page = 1, limit = 100 } = req.query;
    
    let query = `
        SELECT * FROM admin_audit_log
        WHERE hospital_id = $1
    `;
    const params = [hospitalId];
    
    if (entityType) {
        params.push(entityType);
        query += ` AND entity_type = $${params.length}`;
    }
    if (entityId) {
        params.push(entityId);
        query += ` AND entity_id = $${params.length}`;
    }
    if (userId) {
        params.push(userId);
        query += ` AND user_id = $${params.length}`;
    }
    if (startDate) {
        params.push(startDate);
        query += ` AND created_at >= $${params.length}`;
    }
    if (endDate) {
        params.push(endDate);
        query += ` AND created_at <= $${params.length}`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    
    const result = await pool.query(query, params);
    
    ResponseHandler.success(res, result.rows);
});

// Get patient history
exports.getPatientHistory = asyncHandler(async (req, res) => {
    const { patientId } = req.params;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`
        SELECT ph.*, u.username as changed_by_name
        FROM patient_history ph
        LEFT JOIN users u ON ph.changed_by = u.id
        WHERE ph.patient_id = $1 AND ph.hospital_id = $2
        ORDER BY ph.changed_at DESC
    `, [patientId, hospitalId]);
    
    ResponseHandler.success(res, result.rows);
});

// ===========================================================================
// DASHBOARD STATS (Enhanced with Financial Overview)
// ===========================================================================

exports.getRecoveryStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    
    // Helper function for safe queries (returns empty rows if table doesn't exist)
    const safeQuery = async (query, params) => {
        try {
            const result = await pool.query(query, params);
            return result.rows;
        } catch (err) {
            console.log(`[Stats Query Warning] ${err.message}`);
            return [];
        }
    };
    
    // Basic patient/admission stats
    const basicStats = await pool.query(`
        SELECT 
            (SELECT COUNT(*) FROM patients WHERE hospital_id = $1 AND deleted_at IS NULL) as active_patients,
            (SELECT COUNT(*) FROM patients WHERE hospital_id = $1 AND deleted_at IS NOT NULL) as deleted_patients,
            (SELECT COUNT(*) FROM admissions WHERE hospital_id = $1 AND status = 'Admitted') as current_admissions,
            (SELECT COUNT(*) FROM admin_audit_log WHERE hospital_id = $1 AND created_at > NOW() - INTERVAL '24 hours') as actions_today
    `, [hospitalId]);
    
    // Financial Overview - Revenue by periods (payments table may not exist)
    const revenueRows = await safeQuery(`
        SELECT 
            COALESCE(SUM(CASE WHEN p.received_at >= CURRENT_DATE THEN p.amount ELSE 0 END), 0) as revenue_today,
            COALESCE(SUM(CASE WHEN p.received_at >= CURRENT_DATE - INTERVAL '7 days' THEN p.amount ELSE 0 END), 0) as revenue_week,
            COALESCE(SUM(CASE WHEN p.received_at >= DATE_TRUNC('month', CURRENT_DATE) THEN p.amount ELSE 0 END), 0) as revenue_month,
            COALESCE(SUM(CASE WHEN p.received_at >= DATE_TRUNC('year', CURRENT_DATE) THEN p.amount ELSE 0 END), 0) as revenue_year,
            COALESCE(SUM(p.amount), 0) as revenue_total
        FROM payments p
        WHERE p.hospital_id = $1 AND p.status = 'Completed' AND p.refund_amount IS NULL
    `, [hospitalId]);
    
    // Outstanding/Pending amounts (uses amount_paid and generated_at columns)
    const outstandingRows = await safeQuery(`
        SELECT 
            COALESCE(SUM(CASE WHEN i.status = 'Pending' THEN i.total_amount - COALESCE(i.amount_paid, 0) ELSE 0 END), 0) as outstanding_total,
            COUNT(CASE WHEN i.status = 'Pending' THEN 1 END) as pending_invoices_count,
            COALESCE(SUM(CASE WHEN i.status = 'Pending' AND i.generated_at < CURRENT_DATE - INTERVAL '30 days' THEN i.total_amount - COALESCE(i.amount_paid, 0) ELSE 0 END), 0) as overdue_30_days,
            COALESCE(SUM(CASE WHEN i.status = 'Pending' AND i.generated_at < CURRENT_DATE - INTERVAL '60 days' THEN i.total_amount - COALESCE(i.amount_paid, 0) ELSE 0 END), 0) as overdue_60_days,
            COALESCE(SUM(CASE WHEN i.status = 'Pending' AND i.generated_at < CURRENT_DATE - INTERVAL '90 days' THEN i.total_amount - COALESCE(i.amount_paid, 0) ELSE 0 END), 0) as overdue_90_days
        FROM invoices i
        WHERE i.hospital_id = $1
    `, [hospitalId]);
    
    // Refunds (using refund_amount column)
    const refundRows = await safeQuery(`
        SELECT 
            COALESCE(SUM(CASE WHEN p.refund_date >= CURRENT_DATE THEN p.refund_amount ELSE 0 END), 0) as refunds_today,
            COALESCE(SUM(CASE WHEN p.refund_date >= DATE_TRUNC('month', CURRENT_DATE) THEN p.refund_amount ELSE 0 END), 0) as refunds_month,
            COALESCE(SUM(p.refund_amount), 0) as refunds_total,
            COUNT(*) as refunds_count
        FROM payments p
        WHERE p.hospital_id = $1 AND p.refund_amount IS NOT NULL AND p.refund_amount > 0
    `, [hospitalId]);
    
    // Payment method breakdown (this month) - uses payment_mode column
    const paymentBreakdownRows = await safeQuery(`
        SELECT 
            COALESCE(payment_mode, 'Cash') as method,
            COALESCE(SUM(amount), 0) as total,
            COUNT(*) as count
        FROM payments
        WHERE hospital_id = $1 
            AND status = 'Completed' 
            AND received_at >= DATE_TRUNC('month', CURRENT_DATE)
            AND (refund_amount IS NULL OR refund_amount = 0)
        GROUP BY payment_mode
        ORDER BY total DESC
    `, [hospitalId]);
    
    // Insurance claims (table may not exist)
    const insuranceRows = await safeQuery(`
        SELECT 
            COUNT(CASE WHEN status = 'Pending' THEN 1 END) as claims_pending,
            COUNT(CASE WHEN status = 'Approved' THEN 1 END) as claims_approved,
            COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as claims_rejected,
            COALESCE(SUM(CASE WHEN status = 'Pending' THEN claim_amount ELSE 0 END), 0) as pending_amount
        FROM insurance_claims
        WHERE hospital_id = $1
    `, [hospitalId]);
    
    // Recent large transactions (> 50000)
    const largeTransactionRows = await safeQuery(`
        SELECT p.id, p.amount, p.payment_method, p.payment_date, 
               pt.name as patient_name, i.invoice_number
        FROM payments p
        LEFT JOIN patients pt ON p.patient_id = pt.id
        LEFT JOIN invoices i ON p.invoice_id = i.id
        WHERE p.hospital_id = $1 
            AND p.status = 'Completed'
            AND p.amount >= 50000
            AND p.payment_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY p.payment_date DESC
        LIMIT 10
    `, [hospitalId]);
    
    const revenueStats = revenueRows[0] || {};
    const outstandingStats = outstandingRows[0] || {};
    const refundStats = refundRows[0] || {};
    const insuranceStats = insuranceRows[0] || {};
    
    const result = {
        // Basic stats
        ...basicStats.rows[0],
        
        // Financial Overview
        financial: {
            revenue: {
                today: parseFloat(revenueStats.revenue_today || 0),
                week: parseFloat(revenueStats.revenue_week || 0),
                month: parseFloat(revenueStats.revenue_month || 0),
                year: parseFloat(revenueStats.revenue_year || 0),
                total: parseFloat(revenueStats.revenue_total || 0)
            },
            outstanding: {
                total: parseFloat(outstandingStats.outstanding_total || 0),
                count: parseInt(outstandingStats.pending_invoices_count || 0),
                overdue_30: parseFloat(outstandingStats.overdue_30_days || 0),
                overdue_60: parseFloat(outstandingStats.overdue_60_days || 0),
                overdue_90: parseFloat(outstandingStats.overdue_90_days || 0)
            },
            refunds: {
                today: parseFloat(refundStats.refunds_today || 0),
                month: parseFloat(refundStats.refunds_month || 0),
                total: parseFloat(refundStats.refunds_total || 0),
                count: parseInt(refundStats.refunds_count || 0)
            },
            payment_breakdown: paymentBreakdownRows.map(r => ({
                method: r.method,
                total: parseFloat(r.total),
                count: parseInt(r.count)
            })),
            insurance: {
                pending: parseInt(insuranceStats.claims_pending || 0),
                approved: parseInt(insuranceStats.claims_approved || 0),
                rejected: parseInt(insuranceStats.claims_rejected || 0),
                pending_amount: parseFloat(insuranceStats.pending_amount || 0)
            }
        },
        
        // Large transactions for oversight
        large_transactions: largeTransactionRows
    };
    
    ResponseHandler.success(res, result);
});

// ===========================================================================
// MANUAL ENTRY (DISASTER RECOVERY) ENDPOINTS
// ===========================================================================

/**
 * Create Manual Invoice - For disaster recovery (system was down)
 * Allows backdating invoice to when it actually occurred
 */
exports.createManualInvoice = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const userId = req.user?.id;
    const {
        patient_id,
        admission_id,
        total_amount,
        invoice_date,  // Backdated date
        status = 'Pending',
        items = [],
        notes,
        reason  // Required: why manual entry
    } = req.body;
    
    if (!patient_id || !total_amount || !invoice_date || !reason) {
        return ResponseHandler.error(res, 'Patient ID, amount, date, and reason are required', 400);
    }
    
    // Generate invoice number
    const invoiceNum = `MAN-${Date.now()}`;
    
    // Create invoice with backdated generated_at
    const result = await pool.query(`
        INSERT INTO invoices 
        (hospital_id, patient_id, admission_id, total_amount, status, generated_at, generated_by, invoice_number, payment_mode, amount_paid)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Cash', 0)
        RETURNING *
    `, [hospitalId, patient_id, admission_id || null, total_amount, status, invoice_date, userId, invoiceNum]);
    
    const invoice = result.rows[0];
    
    // Insert invoice items if provided
    if (items.length > 0) {
        for (const item of items) {
            await pool.query(`
                INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
                VALUES ($1, $2, $3, $4, $5)
            `, [invoice.id, item.description, item.quantity || 1, item.unit_price || item.total_price, item.total_price]);
        }
    }
    
    // Log to audit trail with manual_recovery source
    await logAdminAction(
        req, 
        'MANUAL_INVOICE_CREATE', 
        'invoice', 
        invoice.id, 
        invoiceNum,
        null,
        { ...invoice, source: 'manual_recovery', notes },
        reason
    );
    
    ResponseHandler.success(res, { 
        message: 'Manual invoice created successfully',
        invoice: { ...invoice, source: 'manual_recovery' }
    }, 'Invoice created', 201);
});

/**
 * Create Manual Payment - For disaster recovery
 * Allows backdating payment to when it was received
 */
exports.createManualPayment = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const userId = req.user?.id;
    const {
        invoice_id,
        patient_id,
        amount,
        payment_date,  // Backdated date
        payment_mode = 'Cash',
        reference_number,
        notes,
        reason  // Required: why manual entry
    } = req.body;
    
    if (!amount || !payment_date || !reason) {
        return ResponseHandler.error(res, 'Amount, date, and reason are required', 400);
    }
    
    if (!invoice_id && !patient_id) {
        return ResponseHandler.error(res, 'Either invoice_id or patient_id is required', 400);
    }
    
    // Create payment with backdated received_at
    const result = await pool.query(`
        INSERT INTO payments 
        (hospital_id, invoice_id, patient_id, amount, payment_mode, received_at, received_by, notes, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Completed', $9)
        RETURNING *
    `, [hospitalId, invoice_id || null, patient_id || null, amount, payment_mode, payment_date, userId, 
        `[MANUAL RECOVERY] ${notes || ''} | Reason: ${reason}`, userId]);
    
    const payment = result.rows[0];
    
    // Update invoice amount_paid if invoice_id provided
    if (invoice_id) {
        await pool.query(`
            UPDATE invoices 
            SET amount_paid = COALESCE(amount_paid, 0) + $1,
                status = CASE 
                    WHEN COALESCE(amount_paid, 0) + $1 >= total_amount THEN 'Paid'
                    ELSE 'Partial'
                END
            WHERE id = $2
        `, [amount, invoice_id]);
    }
    
    // Log to audit trail
    await logAdminAction(
        req,
        'MANUAL_PAYMENT_CREATE',
        'payment',
        payment.id,
        `₹${amount}`,
        null,
        { ...payment, source: 'manual_recovery' },
        reason
    );
    
    ResponseHandler.success(res, {
        message: 'Manual payment recorded successfully',
        payment: { ...payment, source: 'manual_recovery' }
    }, 'Payment recorded', 201);
});

/**
 * Get Manual Entries - List all manually entered invoices/payments
 */
exports.getManualEntries = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { type = 'all', days = 30 } = req.query;
    
    // Get manual invoices (invoice_number starts with MAN-)
    let invoices = [];
    if (type === 'all' || type === 'invoices') {
        const invResult = await pool.query(`
            SELECT i.*, p.name as patient_name, p.uhid,
                   u.username as created_by_name
            FROM invoices i
            LEFT JOIN patients p ON i.patient_id::text = p.id::text
            LEFT JOIN users u ON i.generated_by = u.id
            WHERE i.hospital_id = $1 
              AND i.invoice_number LIKE 'MAN-%'
              AND i.generated_at >= CURRENT_DATE - $2::integer
            ORDER BY i.generated_at DESC
        `, [hospitalId, days]);
        invoices = invResult.rows;
    }
    
    // Get manual payments (notes contain [MANUAL RECOVERY])
    let payments = [];
    if (type === 'all' || type === 'payments') {
        const payResult = await pool.query(`
            SELECT p.*, pt.name as patient_name, pt.uhid,
                   i.invoice_number, u.username as created_by_name
            FROM payments p
            LEFT JOIN patients pt ON p.patient_id::text = pt.id::text
            LEFT JOIN invoices i ON p.invoice_id = i.id
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.hospital_id = $1 
              AND p.notes LIKE '%[MANUAL RECOVERY]%'
              AND p.received_at >= CURRENT_DATE - $2::integer
            ORDER BY p.received_at DESC
        `, [hospitalId, days]);
        payments = payResult.rows;
    }
    
    ResponseHandler.success(res, {
        invoices,
        payments,
        summary: {
            total_invoices: invoices.length,
            total_payments: payments.length,
            invoice_amount: invoices.reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0),
            payment_amount: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
        }
    });
});

/**
 * Search patients for manual entry dropdown
 */
exports.searchPatientsForEntry = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { q } = req.query;
    
    if (!q || q.length < 2) {
        return ResponseHandler.success(res, []);
    }
    
    const result = await pool.query(`
        SELECT id, name, uhid, phone, gender
        FROM patients 
        WHERE hospital_id = $1 
          AND deleted_at IS NULL
          AND (name ILIKE $2 OR uhid ILIKE $2 OR phone ILIKE $2 OR abha_id ILIKE $2)
        ORDER BY name
        LIMIT 20
    `, [hospitalId, `%${q}%`]);
    
    ResponseHandler.success(res, result.rows);
});
