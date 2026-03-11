/**
 * Pre-Authorization Controller - Multi-Tenant
 */
const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const generatePreauthNumber = () => {
    const date = new Date();
    const y = date.getFullYear().toString().slice(-2);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PA${y}${m}${d}-${rand}`;
};

// Get Insurance Providers - Multi-Tenant
const getInsuranceProviders = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`SELECT id, name, code, type, contact_email, contact_phone, is_active FROM insurance_providers WHERE is_active = true AND (hospital_id = $1) ORDER BY name`, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Get Patient Insurance - Multi-Tenant
const getPatientInsurance = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`SELECT pi.*, ip.name as provider_name, ip.code as provider_code, ip.type as provider_type FROM patient_insurance pi
        JOIN insurance_providers ip ON pi.provider_id = ip.id WHERE pi.patient_id = $1 AND (pi.hospital_id = $2 OR pi.hospital_id IS NULL) ORDER BY pi.is_primary DESC, pi.created_at DESC`, [patient_id, hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Save Patient Insurance - Multi-Tenant
const savePatientInsurance = asyncHandler(async (req, res) => {
    const { patient_id, provider_id, policy_number, group_number, member_id, policy_holder_name, relationship, coverage_start, coverage_end, plan_type, copay_percentage, max_coverage_amount, is_primary } = req.body;
    const hospitalId = getHospitalId(req);

    if (is_primary) await pool.query('UPDATE patient_insurance SET is_primary = false WHERE patient_id = $1 AND (hospital_id = $2)', [patient_id, hospitalId]);
    const result = await pool.query(`INSERT INTO patient_insurance (patient_id, provider_id, policy_number, group_number, member_id, policy_holder_name, relationship, coverage_start, coverage_end, plan_type, copay_percentage, max_coverage_amount, is_primary, hospital_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`, [patient_id, provider_id, policy_number, group_number, member_id, policy_holder_name, relationship, coverage_start, coverage_end, plan_type, copay_percentage || 20, max_coverage_amount, is_primary, hospitalId]);
    ResponseHandler.success(res, result.rows[0], 'Patient insurance saved', 201);
});

// Verify Eligibility - Multi-Tenant
const verifyEligibility = asyncHandler(async (req, res) => {
    const { patient_insurance_id } = req.body;
    const user_id = req.user?.id;
    const hospitalId = getHospitalId(req);

    const insResult = await pool.query(`SELECT pi.*, ip.name as provider_name, ip.api_endpoint FROM patient_insurance pi JOIN insurance_providers ip ON pi.provider_id = ip.id WHERE pi.id = $1`, [patient_insurance_id]);
    if (insResult.rows.length === 0) return ResponseHandler.error(res, 'Insurance policy not found', 404);
    const insurance = insResult.rows[0];
    const now = new Date(); const coverageEnd = new Date(insurance.coverage_end);
    const isEligible = coverageEnd > now && insurance.coverage_start <= now;
    const checkResult = await pool.query(`INSERT INTO eligibility_checks (patient_id, patient_insurance_id, check_type, checked_by, is_eligible, coverage_active, coverage_start, coverage_end, copay_percentage, network_status, response_data, hospital_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`, [insurance.patient_id, patient_insurance_id, 'Manual', user_id, isEligible, isEligible, insurance.coverage_start, insurance.coverage_end, insurance.copay_percentage, 'In-Network', JSON.stringify({ provider: insurance.provider_name, policy: insurance.policy_number, checked_at: new Date().toISOString(), simulated: true }), hospitalId]);
    await pool.query(`UPDATE patient_insurance SET verification_status = $1, verified_at = NOW() WHERE id = $2`, [isEligible ? 'Verified' : 'Failed', patient_insurance_id]);
    ResponseHandler.success(res, { eligible: isEligible, message: isEligible ? 'Coverage is active and verified' : 'Coverage has expired or is inactive', details: { provider: insurance.provider_name, policy_number: insurance.policy_number, coverage_end: insurance.coverage_end, copay: insurance.copay_percentage, max_coverage: insurance.max_coverage_amount }, check_id: checkResult.rows[0].id });
});

// Get Preauth Requests - Multi-Tenant
const getPreauthRequests = asyncHandler(async (req, res) => {
    const { status, patient_id } = req.query;
    const hospitalId = getHospitalId(req);

    let query = `SELECT pr.*, p.name as patient_name, p.patient_number, pi.policy_number, ip.name as provider_name FROM preauth_requests pr
        JOIN patients p ON pr.patient_id = p.id LEFT JOIN patient_insurance pi ON pr.patient_insurance_id = pi.id LEFT JOIN insurance_providers ip ON pi.provider_id = ip.id
        WHERE (pr.hospital_id = $1 OR pr.hospital_id IS NULL)`;
    const params = [hospitalId];
    if (status) { params.push(status); query += ` AND pr.status = $${params.length}`; }
    if (patient_id) { params.push(patient_id); query += ` AND pr.patient_id = $${params.length}`; }
    query += ' ORDER BY pr.created_at DESC LIMIT 100';
    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// Get Preauth Stats - Multi-Tenant
const getPreauthStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const result = await pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'Pending') as pending, COUNT(*) FILTER (WHERE status = 'Under Review') as under_review,
        COUNT(*) FILTER (WHERE status = 'Approved') as approved, COUNT(*) FILTER (WHERE status = 'Partially Approved') as partially_approved, COUNT(*) FILTER (WHERE status = 'Denied') as denied,
        COALESCE(SUM(requested_amount), 0) as total_requested, COALESCE(SUM(approved_amount), 0) as total_approved,
        AVG(EXTRACT(DAY FROM (approval_date - requested_date))) FILTER (WHERE approval_date IS NOT NULL) as avg_turnaround_days
        FROM preauth_requests WHERE created_at >= NOW() - INTERVAL '30 days' AND (hospital_id = $1)`, [hospitalId]);
    const stats = result.rows[0];
    ResponseHandler.success(res, { counts: { total: parseInt(stats.total), pending: parseInt(stats.pending), under_review: parseInt(stats.under_review), approved: parseInt(stats.approved), partially_approved: parseInt(stats.partially_approved), denied: parseInt(stats.denied) },
        amounts: { total_requested: parseFloat(stats.total_requested), total_approved: parseFloat(stats.total_approved), approval_rate: stats.total > 0 ? Math.round(((parseInt(stats.approved) + parseInt(stats.partially_approved)) / parseInt(stats.total)) * 100) : 0 },
        avg_turnaround: Math.round(parseFloat(stats.avg_turnaround_days) || 2) });
});

// Create Preauth Request - Multi-Tenant
const createPreauthRequest = asyncHandler(async (req, res) => {
    const { patient_id, patient_insurance_id, admission_id, procedure_type, procedure_name, procedure_code, icd_codes, estimated_cost, requested_amount, expected_admission, expected_los, priority, notes } = req.body;
    const user_id = req.user?.id;
    const hospitalId = getHospitalId(req);

    const request_number = generatePreauthNumber();
    const result = await pool.query(`INSERT INTO preauth_requests (request_number, patient_id, patient_insurance_id, admission_id, procedure_type, procedure_name, procedure_code, icd_codes,
        estimated_cost, requested_amount, expected_admission, expected_los, priority, notes, requested_by, status, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'Pending', $16) RETURNING *`,
        [request_number, patient_id, patient_insurance_id, admission_id, procedure_type, procedure_name, procedure_code, JSON.stringify(icd_codes || []), estimated_cost, requested_amount, expected_admission, expected_los || 1, priority || 'Normal', notes, user_id, hospitalId]);
    ResponseHandler.success(res, { message: 'Pre-authorization request created successfully', request: result.rows[0] }, 'Pre-authorization request created successfully', 201);
});

// Update Preauth Status - Multi-Tenant
const updatePreauthStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, approved_amount, tpa_reference, denial_reason, conditions, valid_until } = req.body;
    const hospitalId = getHospitalId(req);

    const updateFields = ['status = $2', 'updated_at = NOW()']; const params = [id, status]; let paramIndex = 3;
    if (status === 'Approved' || status === 'Partially Approved') { updateFields.push(`approved_amount = $${paramIndex++}`); params.push(approved_amount); updateFields.push(`approval_date = NOW()`); }
    if (tpa_reference) { updateFields.push(`tpa_reference = $${paramIndex++}`); params.push(tpa_reference); }
    if (denial_reason) { updateFields.push(`denial_reason = $${paramIndex++}`); params.push(denial_reason); }
    if (conditions) { updateFields.push(`conditions = $${paramIndex++}`); params.push(conditions); }
    if (valid_until) { updateFields.push(`valid_until = $${paramIndex++}`); params.push(valid_until); }
    params.push(hospitalId);
    const result = await pool.query(`UPDATE preauth_requests SET ${updateFields.join(', ')} WHERE id = $1 AND (hospital_id = $${params.length}) RETURNING *`, params);
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Pre-auth request not found', 404);
    ResponseHandler.success(res, { message: `Pre-authorization ${status.toLowerCase()}`, request: result.rows[0] });
});

module.exports = { getInsuranceProviders, getPatientInsurance, savePatientInsurance, verifyEligibility, getPreauthRequests, getPreauthStats, createPreauthRequest, updatePreauthStatus };
