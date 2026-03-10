// ============================================================================
// specialistController.js
// Controller for Specialist Categories and Visiting Doctor Management
// ============================================================================
const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { getHospitalId } = require('../utils/tenantHelper');

// ============================================================================
// SPECIALIST CATEGORIES
// ============================================================================

/**
 * Get all specialist categories
 * GET /api/specialists/categories
 */
exports.getCategories = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`
        SELECT sc.*, 
               COUNT(u.id) as doctor_count
        FROM specialist_categories sc
        LEFT JOIN users u ON u.specialist_category_id = sc.id AND u.is_visiting = TRUE
        WHERE sc.hospital_id = $1 OR sc.hospital_id IS NULL
        GROUP BY sc.id
        ORDER BY sc.name
    `, [hospitalId]);
    
    ResponseHandler.success(res, result.rows);
});

/**
 * Get single specialist category
 * GET /api/specialists/categories/:id
 */
exports.getCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`
        SELECT * FROM specialist_categories 
        WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)
    `, [id, hospitalId]);
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Category not found', 404);
    }
    
    ResponseHandler.success(res, result.rows[0]);
});

/**
 * Create specialist category
 * POST /api/specialists/categories
 */
exports.createCategory = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const userId = req.user?.id;
    
    const { 
        name, 
        description, 
        consultation_fee, 
        followup_fee, 
        emergency_fee_percent,
        home_visit_fee,
        default_revenue_share 
    } = req.body;
    
    if (!name) {
        return ResponseHandler.error(res, 'Category name is required', 400);
    }
    
    const result = await pool.query(`
        INSERT INTO specialist_categories 
        (name, description, consultation_fee, followup_fee, emergency_fee_percent, 
         home_visit_fee, default_revenue_share, hospital_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    `, [
        name, 
        description || null, 
        consultation_fee || 500, 
        followup_fee || 250,
        emergency_fee_percent || 100,
        home_visit_fee || 0,
        default_revenue_share || 50, 
        hospitalId,
        userId
    ]);
    
    ResponseHandler.success(res, result.rows[0], 201, 'Category created successfully');
});

/**
 * Update specialist category
 * PUT /api/specialists/categories/:id
 */
exports.updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    
    const { 
        name, 
        description, 
        consultation_fee, 
        followup_fee, 
        emergency_fee_percent,
        home_visit_fee,
        default_revenue_share,
        is_active 
    } = req.body;
    
    const result = await pool.query(`
        UPDATE specialist_categories 
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            consultation_fee = COALESCE($3, consultation_fee),
            followup_fee = COALESCE($4, followup_fee),
            emergency_fee_percent = COALESCE($5, emergency_fee_percent),
            home_visit_fee = COALESCE($6, home_visit_fee),
            default_revenue_share = COALESCE($7, default_revenue_share),
            is_active = COALESCE($8, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $9 AND hospital_id = $10
        RETURNING *
    `, [
        name, description, consultation_fee, followup_fee, 
        emergency_fee_percent, home_visit_fee, default_revenue_share, 
        is_active, id, hospitalId
    ]);
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Category not found', 404);
    }
    
    ResponseHandler.success(res, result.rows[0], 200, 'Category updated successfully');
});

/**
 * Delete specialist category
 * DELETE /api/specialists/categories/:id
 */
exports.deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    
    // Check if category is in use
    const checkUsage = await pool.query(`
        SELECT COUNT(*) FROM users WHERE specialist_category_id = $1
    `, [id]);
    
    if (parseInt(checkUsage.rows[0].count) > 0) {
        return ResponseHandler.error(res, 'Cannot delete category - it is assigned to doctors', 400);
    }
    
    const result = await pool.query(`
        DELETE FROM specialist_categories 
        WHERE id = $1 AND hospital_id = $2
        RETURNING id
    `, [id, hospitalId]);
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Category not found', 404);
    }
    
    ResponseHandler.success(res, { deleted: true }, 200, 'Category deleted successfully');
});

// ============================================================================
// VISITING DOCTORS
// ============================================================================

/**
 * Get all visiting doctors
 * GET /api/specialists/doctors
 */
exports.getVisitingDoctors = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`
        SELECT u.id, u.username, u.name, u.email, u.is_active,
               u.specialist_category_id, u.revenue_share_override,
               u.visit_schedule, u.consultation_fee, u.min_guarantee,
               u.payout_frequency,
               sc.name as specialty_name,
               sc.consultation_fee as category_consultation_fee,
               sc.followup_fee as category_followup_fee,
               sc.default_revenue_share,
               COALESCE(u.revenue_share_override, sc.default_revenue_share) as effective_revenue_share
        FROM users u
        LEFT JOIN specialist_categories sc ON u.specialist_category_id = sc.id
        WHERE u.is_visiting = TRUE AND u.hospital_id = $1
        ORDER BY u.name
    `, [hospitalId]);
    
    ResponseHandler.success(res, result.rows);
});

/**
 * Get visiting doctor details with earnings summary
 * GET /api/specialists/doctors/:id
 */
exports.getVisitingDoctor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    
    // Get doctor details
    const doctorResult = await pool.query(`
        SELECT u.*, sc.name as specialty_name,
               sc.consultation_fee as category_consultation_fee,
               sc.followup_fee as category_followup_fee,
               sc.default_revenue_share
        FROM users u
        LEFT JOIN specialist_categories sc ON u.specialist_category_id = sc.id
        WHERE u.id = $1 AND u.is_visiting = TRUE AND u.hospital_id = $2
    `, [id, hospitalId]);
    
    if (doctorResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Visiting doctor not found', 404);
    }
    
    // Get earnings summary
    const earningsResult = await pool.query(`
        SELECT 
            COUNT(*) as total_consultations,
            SUM(gross_amount) as total_gross,
            SUM(doctor_share) as total_doctor_share,
            SUM(CASE WHEN is_settled = FALSE THEN doctor_share ELSE 0 END) as pending_payout
        FROM doctor_consultations
        WHERE doctor_id = $1
    `, [id]);
    
    const doctor = doctorResult.rows[0];
    doctor.earnings = earningsResult.rows[0];
    
    ResponseHandler.success(res, doctor);
});

/**
 * Register/update a user as visiting doctor
 * PUT /api/specialists/doctors/:id
 */
exports.updateVisitingDoctor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    
    const {
        specialist_category_id,
        revenue_share_override,
        visit_schedule,
        bank_details,
        min_guarantee,
        payout_frequency,
        consultation_fee
    } = req.body;
    
    const result = await pool.query(`
        UPDATE users 
        SET is_visiting = TRUE,
            specialist_category_id = COALESCE($1, specialist_category_id),
            revenue_share_override = $2,
            visit_schedule = COALESCE($3, visit_schedule),
            bank_details = COALESCE($4, bank_details),
            min_guarantee = COALESCE($5, min_guarantee),
            payout_frequency = COALESCE($6, payout_frequency),
            consultation_fee = COALESCE($7, consultation_fee)
        WHERE id = $8 AND hospital_id = $9 AND role = 'doctor'
        RETURNING id, username, name, specialist_category_id, revenue_share_override, visit_schedule
    `, [
        specialist_category_id, revenue_share_override, 
        visit_schedule ? JSON.stringify(visit_schedule) : null,
        bank_details ? JSON.stringify(bank_details) : null,
        min_guarantee, payout_frequency, consultation_fee,
        id, hospitalId
    ]);
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Doctor not found', 404);
    }
    
    ResponseHandler.success(res, result.rows[0], 200, 'Visiting doctor updated successfully');
});

/**
 * Remove visiting doctor status
 * DELETE /api/specialists/doctors/:id
 */
exports.removeVisitingDoctor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`
        UPDATE users 
        SET is_visiting = FALSE,
            specialist_category_id = NULL
        WHERE id = $1 AND hospital_id = $2
        RETURNING id
    `, [id, hospitalId]);
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Doctor not found', 404);
    }
    
    ResponseHandler.success(res, { removed: true }, 200, 'Visiting doctor status removed');
});

// ============================================================================
// CONSULTATIONS & BILLING
// ============================================================================

/**
 * Record a consultation for a visiting doctor
 * POST /api/specialists/consultations
 */
exports.createConsultation = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const userId = req.user?.id;
    
    const {
        doctor_id,
        patient_id,
        consultation_type = 'first_visit',
        appointment_id,
        notes
    } = req.body;
    
    // Get doctor's fee structure
    const doctorResult = await pool.query(`
        SELECT u.id, u.revenue_share_override, u.consultation_fee as custom_fee,
               sc.consultation_fee, sc.followup_fee, sc.emergency_fee_percent,
               sc.default_revenue_share
        FROM users u
        LEFT JOIN specialist_categories sc ON u.specialist_category_id = sc.id
        WHERE u.id = $1 AND u.is_visiting = TRUE
    `, [doctor_id]);
    
    if (doctorResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Visiting doctor not found', 404);
    }
    
    const doctor = doctorResult.rows[0];
    const revenueShare = doctor.revenue_share_override || doctor.default_revenue_share || 50;
    
    // Calculate fee based on consultation type
    let baseFee = doctor.custom_fee || doctor.consultation_fee || 500;
    
    if (consultation_type === 'followup') {
        baseFee = doctor.followup_fee || baseFee * 0.5;
    } else if (consultation_type === 'emergency') {
        baseFee = baseFee * (1 + (doctor.emergency_fee_percent || 100) / 100);
    }
    
    const grossAmount = parseFloat(baseFee);
    const doctorShare = grossAmount * (revenueShare / 100);
    const hospitalShare = grossAmount - doctorShare;
    
    const result = await pool.query(`
        INSERT INTO doctor_consultations 
        (doctor_id, patient_id, consultation_type, appointment_id, 
         gross_amount, doctor_share, hospital_share, revenue_share_percent,
         consultation_date, notes, hospital_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, $10, $11)
        RETURNING *
    `, [
        doctor_id, patient_id, consultation_type, appointment_id,
        grossAmount, doctorShare, hospitalShare, revenueShare,
        notes, hospitalId, userId
    ]);
    
    ResponseHandler.success(res, result.rows[0], 201, 'Consultation recorded');
});

/**
 * Get consultations for a doctor
 * GET /api/specialists/doctors/:id/consultations
 */
exports.getDoctorConsultations = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    const { start_date, end_date, settled } = req.query;
    
    let query = `
        SELECT dc.*, p.name as patient_name
        FROM doctor_consultations dc
        LEFT JOIN patients p ON dc.patient_id = p.id
        WHERE dc.doctor_id = $1 AND dc.hospital_id = $2
    `;
    const params = [id, hospitalId];
    let paramIndex = 3;
    
    if (start_date) {
        query += ` AND dc.consultation_date >= $${paramIndex++}`;
        params.push(start_date);
    }
    if (end_date) {
        query += ` AND dc.consultation_date <= $${paramIndex++}`;
        params.push(end_date);
    }
    if (settled !== undefined) {
        query += ` AND dc.is_settled = $${paramIndex++}`;
        params.push(settled === 'true');
    }
    
    query += ` ORDER BY dc.consultation_date DESC, dc.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    ResponseHandler.success(res, result.rows);
});

// ============================================================================
// PAYOUTS
// ============================================================================

/**
 * Get payout history for a doctor
 * GET /api/specialists/doctors/:id/payouts
 */
exports.getDoctorPayouts = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`
        SELECT dp.*, u.name as approved_by_name
        FROM doctor_payouts dp
        LEFT JOIN users u ON dp.approved_by = u.id
        WHERE dp.doctor_id = $1 AND dp.hospital_id = $2
        ORDER BY dp.period_end DESC
    `, [id, hospitalId]);
    
    ResponseHandler.success(res, result.rows);
});

/**
 * Generate payout for a doctor
 * POST /api/specialists/payouts
 */
exports.generatePayout = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const userId = req.user?.id;
    
    const { doctor_id, period_start, period_end, deductions = {}, adjustment_notes } = req.body;
    
    if (!doctor_id || !period_start || !period_end) {
        return ResponseHandler.error(res, 'doctor_id, period_start, and period_end are required', 400);
    }
    
    // Calculate unsettled consultations for the period
    const consultationsResult = await pool.query(`
        SELECT COUNT(*) as count, 
               COALESCE(SUM(gross_amount), 0) as gross,
               COALESCE(SUM(doctor_share), 0) as doctor_share
        FROM doctor_consultations
        WHERE doctor_id = $1 
          AND consultation_date BETWEEN $2 AND $3
          AND is_settled = FALSE
          AND hospital_id = $4
    `, [doctor_id, period_start, period_end, hospitalId]);
    
    const { count, gross, doctor_share } = consultationsResult.rows[0];
    
    if (parseInt(count) === 0) {
        return ResponseHandler.error(res, 'No unsettled consultations found for this period', 400);
    }
    
    // Calculate net payout after deductions
    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + parseFloat(val || 0), 0);
    const netPayout = parseFloat(doctor_share) - totalDeductions;
    
    // Create payout record
    const payoutResult = await pool.query(`
        INSERT INTO doctor_payouts 
        (doctor_id, period_start, period_end, total_consultations, gross_revenue, 
         net_payout, deductions, adjustment_notes, hospital_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    `, [
        doctor_id, period_start, period_end, count, gross,
        netPayout, JSON.stringify(deductions), adjustment_notes,
        hospitalId, userId
    ]);
    
    const payout = payoutResult.rows[0];
    
    // Mark consultations as settled
    await pool.query(`
        UPDATE doctor_consultations 
        SET is_settled = TRUE, settlement_id = $1
        WHERE doctor_id = $2
          AND consultation_date BETWEEN $3 AND $4
          AND is_settled = FALSE
          AND hospital_id = $5
    `, [payout.id, doctor_id, period_start, period_end, hospitalId]);
    
    ResponseHandler.success(res, payout, 201, 'Payout generated successfully');
});

/**
 * Approve/mark payout as paid
 * PUT /api/specialists/payouts/:id
 */
exports.updatePayout = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    const userId = req.user?.id;
    
    const { status, payment_reference, payment_mode, paid_date } = req.body;
    
    let updateQuery = 'UPDATE doctor_payouts SET ';
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (status) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
        
        if (status === 'approved') {
            updates.push(`approved_by = $${paramIndex++}`, `approved_at = CURRENT_TIMESTAMP`);
            params.push(userId);
        }
        if (status === 'paid') {
            updates.push(`paid_date = COALESCE($${paramIndex++}, CURRENT_DATE)`);
            params.push(paid_date);
        }
    }
    
    if (payment_reference) {
        updates.push(`payment_reference = $${paramIndex++}`);
        params.push(payment_reference);
    }
    
    if (payment_mode) {
        updates.push(`payment_mode = $${paramIndex++}`);
        params.push(payment_mode);
    }
    
    updateQuery += updates.join(', ');
    updateQuery += ` WHERE id = $${paramIndex++} AND hospital_id = $${paramIndex++} RETURNING *`;
    params.push(id, hospitalId);
    
    const result = await pool.query(updateQuery, params);
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Payout not found', 404);
    }
    
    ResponseHandler.success(res, result.rows[0], 200, 'Payout updated successfully');
});

/**
 * Get earnings summary for visiting doctors
 * GET /api/specialists/earnings-summary
 */
exports.getEarningsSummary = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { start_date, end_date } = req.query;
    
    let query = `
        SELECT 
            u.id as doctor_id,
            u.name as doctor_name,
            sc.name as specialty,
            COUNT(dc.id) as total_consultations,
            COALESCE(SUM(dc.gross_amount), 0) as total_gross,
            COALESCE(SUM(dc.doctor_share), 0) as total_doctor_share,
            COALESCE(SUM(dc.hospital_share), 0) as total_hospital_share,
            COALESCE(SUM(CASE WHEN dc.is_settled = FALSE THEN dc.doctor_share ELSE 0 END), 0) as pending_payout
        FROM users u
        LEFT JOIN specialist_categories sc ON u.specialist_category_id = sc.id
        LEFT JOIN doctor_consultations dc ON dc.doctor_id = u.id
    `;
    
    const params = [hospitalId];
    let paramIndex = 2;
    
    if (start_date && end_date) {
        query += ` AND dc.consultation_date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
        params.push(start_date, end_date);
    }
    
    query += `
        WHERE u.is_visiting = TRUE AND u.hospital_id = $1
        GROUP BY u.id, u.name, sc.name
        ORDER BY total_gross DESC
    `;
    
    const result = await pool.query(query, params);
    
    ResponseHandler.success(res, result.rows);
});
