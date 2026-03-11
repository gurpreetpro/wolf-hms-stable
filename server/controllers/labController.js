const pool = require('../config/db');
const { getHospitalId } = require('../utils/tenantHelper');
const { addToInvoice } = require('../services/billingService');
const { createChargeHelper } = require('./chargesController'); // Centralized Billing
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Helper: Log to Audit Trail
const logAudit = async (lab_order_id, action, performed_by, details = {}, ip_address = null, hospitalId = null) => { 
    try { 
        await pool.query(`INSERT INTO lab_audit_log (lab_order_id, action, performed_by, details, ip_address, hospital_id) VALUES ($1, $2, $3, $4, $5, $6)`, [lab_order_id, action, performed_by, JSON.stringify(details), ip_address, hospitalId]); 
    } catch (error) { 
        console.error('Audit log error:', error); 
    } 
};

// Check Critical Values
const checkCriticalValues = async (result_json) => { 
    const criticalFindings = []; 
    try { 
        const ranges = await pool.query('SELECT * FROM lab_reference_ranges'); 
        for (const range of ranges.rows) { 
            const param = range.parameter.toLowerCase(); 
            const value = result_json[param]; 
            if (value !== undefined && value !== null) { 
                const numValue = parseFloat(value); 
                if (!isNaN(numValue)) { 
                    if (numValue < range.critical_low || numValue > range.critical_high) 
                        criticalFindings.push({ parameter: range.parameter, value: numValue, unit: range.unit, critical_low: range.critical_low, critical_high: range.critical_high, status: numValue < range.critical_low ? 'CRITICAL_LOW' : 'CRITICAL_HIGH' }); 
                } 
            } 
        } 
    } catch (error) { 
        console.error('Critical value check error:', error); 
    } 
    return criticalFindings; 
};

// Flag Result Values
const flagResultValues = async (result_json) => { 
    const flaggedResults = {}; 
    try { 
        const ranges = await pool.query('SELECT * FROM lab_reference_ranges'); 
        for (const [key, value] of Object.entries(result_json)) { 
            const range = ranges.rows.find(r => r.parameter.toLowerCase() === key.toLowerCase()); 
            if (range && value !== null && value !== undefined) { 
                const numValue = parseFloat(value); 
                if (!isNaN(numValue)) { 
                    let flag = 'normal'; 
                    if (numValue < range.normal_min) flag = 'low'; 
                    else if (numValue > range.normal_max) flag = 'high'; 
                    if (numValue < range.critical_low) flag = 'critical_low'; 
                    else if (numValue > range.critical_high) flag = 'critical_high'; 
                    flaggedResults[key] = { value: numValue, unit: range.unit, flag, normal_range: `${range.normal_min} - ${range.normal_max}` }; 
                } else flaggedResults[key] = { value, flag: 'text' }; 
            } else flaggedResults[key] = { value, flag: 'unknown' }; 
        } 
    } catch (error) { 
        console.error('Flag result error:', error); 
        return result_json; 
    } 
    return flaggedResults; 
};

// Create Critical Alert
const createCriticalAlert = async (lab_request_id, patient_id, doctor_id, parameter, value, unit, alert_type, hospitalId = null) => { 
    try { 
        await pool.query(`INSERT INTO lab_critical_alerts (lab_request_id, patient_id, doctor_id, parameter, value, unit, alert_type, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [lab_request_id, patient_id, doctor_id, parameter, value, unit, alert_type, hospitalId]); 
    } catch (error) { 
        console.error('Create critical alert error:', error); 
    } 
};

// Delta Check
const checkDeltaValue = async (patient_id, parameter, new_value) => { 
    try { 
        const previous = await pool.query(`SELECT res.result_json FROM lab_results res JOIN lab_requests lr ON res.request_id = lr.id WHERE lr.patient_id = $1 ORDER BY res.created_at DESC LIMIT 1`, [patient_id]); 
        if (previous.rows.length === 0) return null; 
        const prevResults = previous.rows[0].result_json; 
        if (!prevResults || !prevResults[parameter]) return null; 
        const oldValue = parseFloat(prevResults[parameter]); 
        const newVal = parseFloat(new_value); 
        const rule = await pool.query('SELECT * FROM delta_check_rules WHERE parameter = $1 AND is_active = TRUE', [parameter]); 
        if (rule.rows.length === 0) return null; 
        const { max_percent_change, max_absolute_change } = rule.rows[0]; 
        const percentChange = Math.abs((newVal - oldValue) / oldValue * 100); 
        const absoluteChange = Math.abs(newVal - oldValue); 
        let alert = null; 
        if (max_percent_change && percentChange > max_percent_change) alert = { type: 'percent', change: percentChange, threshold: max_percent_change, old: oldValue, new: newVal }; 
        if (max_absolute_change && absoluteChange > max_absolute_change) alert = { type: 'absolute', change: absoluteChange, threshold: max_absolute_change, old: oldValue, new: newVal }; 
        return alert; 
    } catch (error) { 
        console.error('Delta check error:', error); 
        return null; 
    } 
};

// Order Lab Test - Multi-Tenant (Creates charge for billing queue)
const orderTest = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, test_type } = req.body;
    const doctor_id = req.user.id;
    const hospitalId = getHospitalId(req);

    const typeRes = await pool.query('SELECT id, price, name FROM lab_test_types WHERE name = $1 AND (hospital_id = $2)', [test_type, hospitalId]);
    if (typeRes.rows.length === 0) return ResponseHandler.error(res, 'Invalid test type', 400);
    
    const test_type_id = typeRes.rows[0].id; 
    const price = typeRes.rows[0].price || 0;
    const test_name = typeRes.rows[0].name;
    
    // Create lab request
    const result = await pool.query('INSERT INTO lab_requests (admission_id, patient_id, doctor_id, test_type_id, test_price, hospital_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [admission_id, patient_id, doctor_id, test_type_id, price, hospitalId]);
    const labRequest = result.rows[0];
    
    // Create pending charge for billing queue (Gold Standard Pattern)
    try {
        // [PHASE 6] Revenue Plumbing: Check Insurance
        const InsuranceWorkflowService = require('../services/insurance/InsuranceWorkflowService');
        const isInsured = await InsuranceWorkflowService.shouldBillToInsurance(patient_id);
        
        await createChargeHelper({
            hospital_id: hospitalId,
            patient_id,
            admission_id: admission_id || null,
            charge_type: 'lab',
            description: `Lab Test: ${test_name}`,
            quantity: 1,
            unit_price: price,
            source_table: 'lab_requests',
            source_id: labRequest.id,
            created_by: doctor_id,
            // [NEW] Flag for Claims Processor
            is_insurance: isInsured 
        });
        console.log(`📋 [Lab] Charge created for ${test_name} - ₹${price} (Insured: ${isInsured})`);
    } catch (chargeError) {
        console.warn('[Lab] Failed to create charge (non-blocking):', chargeError.message);
        // Fallback or Error Handling
    }
    
    ResponseHandler.success(res, labRequest, 201);
});

// Get Lab Queue - Multi-Tenant
const getLabQueue = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`SELECT r.*, COALESCE(t.name, r.test_name) as test_name, p.name as patient_name FROM lab_requests r LEFT JOIN lab_test_types t ON r.test_type_id = t.id LEFT JOIN patients p ON r.patient_id = p.id LEFT JOIN admissions a ON r.admission_id = a.id WHERE r.status != 'Completed' AND (r.hospital_id = $1 OR r.hospital_id IS NULL)`, [hospitalId]); 
    ResponseHandler.success(res, result.rows.map(row => ({ ...row, patient_name: row.patient_name || 'Admitted Patient' })));
});

// Upload Result - Multi-Tenant
const uploadResult = asyncHandler(async (req, res) => {
    const { request_id, result_json } = req.body;
    const technician_id = req.user.id;
    const hospitalId = getHospitalId(req);

    let parsedData = result_json || { hemoglobin: 14.2, platelets: 250000, wbc: 7500, impression: 'Normal' };
    await pool.query('INSERT INTO lab_results (request_id, result_json, technician_id, hospital_id) VALUES ($1, $2, $3, $4) RETURNING *', [request_id, JSON.stringify(parsedData), technician_id, hospitalId]);
    await pool.query('UPDATE lab_requests SET status = $1 WHERE id = $2 AND (hospital_id = $3)', ['Completed', request_id, hospitalId]);
    
    ResponseHandler.success(res, { message: 'Result uploaded', data: parsedData });
});

// Get Lab Stats - Multi-Tenant
const getLabStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const completedResult = await pool.query(`SELECT COUNT(*) as count FROM lab_requests WHERE status = 'Completed' AND DATE(updated_at) = CURRENT_DATE AND (hospital_id = $1)`, [hospitalId]);
    const samplesResult = await pool.query(`SELECT COUNT(*) as count FROM lab_requests WHERE sample_collected_at IS NOT NULL AND DATE(sample_collected_at) = CURRENT_DATE AND (hospital_id = $1)`, [hospitalId]);
    const turnaroundResult = await pool.query(`SELECT AVG(EXTRACT(EPOCH FROM (updated_at - requested_at))/3600) as avg_hours FROM lab_requests WHERE status = 'Completed' AND DATE(updated_at) = CURRENT_DATE AND (hospital_id = $1)`, [hospitalId]);
    
    ResponseHandler.success(res, { completed_today: parseInt(completedResult.rows[0]?.count) || 0, samples_collected: parseInt(samplesResult.rows[0]?.count) || 0, avg_turnaround_hours: parseFloat(turnaroundResult.rows[0]?.avg_hours) || 0 });
});

// Get Lab Tests - Multi-Tenant
const getLabTests = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`SELECT t.id, t.name, t.price, c.name as category FROM lab_test_types t LEFT JOIN lab_test_categories c ON t.category_id = c.id WHERE (t.hospital_id = $1 OR t.hospital_id IS NULL) ORDER BY c.name, t.name`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});


// Get Lab Results By Patient - Multi-Tenant
const getLabResultsByPatient = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`SELECT lr.id, lr.test_type_id, t.name as test_name, lr.status, lr.requested_at, lr.updated_at, res.result_json FROM lab_requests lr JOIN lab_test_types t ON lr.test_type_id = t.id LEFT JOIN lab_results res ON lr.id = res.request_id WHERE lr.patient_id = $1 AND (lr.hospital_id = $2 OR lr.hospital_id IS NULL) ORDER BY lr.requested_at DESC`, [patient_id, hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Get Lab History - Multi-Tenant
const getLabHistory = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`SELECT lr.id, lr.test_type_id, COALESCE(t.name, lr.test_name) as test_name, lr.status, lr.requested_at, lr.updated_at, res.result_json, p.name as patient_name FROM lab_requests lr LEFT JOIN lab_test_types t ON lr.test_type_id = t.id LEFT JOIN lab_results res ON lr.id = res.request_id LEFT JOIN patients p ON lr.patient_id = p.id WHERE lr.status = 'Completed' AND (lr.hospital_id = $1 OR lr.hospital_id IS NULL) ORDER BY lr.updated_at DESC LIMIT 100`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Get Packages - Multi-Tenant
const getPackages = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const pkgRes = await pool.query('SELECT * FROM lab_packages WHERE active = TRUE AND (hospital_id = $1) ORDER BY price', [hospitalId]); 
    const packages = []; 
    for (const pkg of pkgRes.rows) { 
        const itemsRes = await pool.query(`SELECT t.name FROM lab_package_items pi JOIN lab_test_types t ON pi.test_type_id = t.id WHERE pi.package_id = $1`, [pkg.id]); 
        packages.push({ ...pkg, tests: itemsRes.rows.map(r => r.name) }); 
    } 
    ResponseHandler.success(res, packages);
});

// Request Lab Change - Multi-Tenant
const requestLabChange = asyncHandler(async (req, res) => {
    const { request_type, test_id, new_name, new_price, new_category_id, notes } = req.body;
    const requested_by = req.user.id;
    const hospitalId = getHospitalId(req);
    
    // Store change details in JSONB data column
    const data = JSON.stringify({ new_name, new_price, new_category_id, notes });
    
    await pool.query(
        'INSERT INTO lab_change_requests (request_type, test_id, data, requested_by, hospital_id) VALUES ($1, $2, $3, $4, $5)', 
        [request_type, test_id, data, requested_by, hospitalId]
    ); 
    ResponseHandler.success(res, { message: 'Request submitted successfully' });
});

// Get Lab Requests - Multi-Tenant
const getLabRequests = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`
        SELECT lcr.*, 
               lcr.data->>'new_price' as new_price,
               lcr.data->>'new_name' as new_name,
               lcr.data->>'notes' as notes,
               COALESCE(u.username, 'Unknown') as requested_by_name, 
               COALESCE(t.name, lcr.data->>'new_name', 'N/A') as current_name, 
               COALESCE(t.price, 0) as current_price,
               t.id as matched_test_id
        FROM lab_change_requests lcr 
        LEFT JOIN users u ON lcr.requested_by = u.id 
        LEFT JOIN lab_test_types t ON lcr.test_id = t.id 
        WHERE lcr.status = 'Pending' AND (lcr.hospital_id = $1 OR lcr.hospital_id IS NULL) 
        ORDER BY lcr.created_at DESC`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});


// Approve Lab Change - Multi-Tenant
const approveLabChange = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const approved_by = req.user.id;
    const hospitalId = getHospitalId(req);
    
    await pool.query('BEGIN');
    try {
        const reqRes = await pool.query('SELECT * FROM lab_change_requests WHERE id = $1 AND (hospital_id = $2)', [id, hospitalId]);
        if (reqRes.rows.length === 0) { 
            await pool.query('ROLLBACK'); 
            return ResponseHandler.error(res, 'Request not found', 404); 
        }
        const request = reqRes.rows[0];
        if (request.status !== 'Pending') { 
            await pool.query('ROLLBACK'); 
            return ResponseHandler.error(res, 'Request already processed', 400); 
        }
        
        // Parse data from JSONB
        const data = request.data || {};
        const new_price = data.new_price;
        const new_name = data.new_name;
        const new_category_id = data.new_category_id;
        
        if (request.request_type === 'PRICE_CHANGE') {
            await pool.query('UPDATE lab_test_types SET price = $1 WHERE id = $2', [new_price, request.test_id]);
        } else if (request.request_type === 'NEW_TEST') {
            await pool.query('INSERT INTO lab_test_types (name, price, category_id, normal_range, hospital_id) VALUES ($1, $2, $3, $4, $5)', [new_name, new_price, new_category_id, 'See Lab Reference', hospitalId]);
        }
        
        await pool.query("UPDATE lab_change_requests SET status = 'Approved', processed_at = CURRENT_TIMESTAMP, processed_by = $1 WHERE id = $2", [approved_by, id]);
        await pool.query('COMMIT'); 
        ResponseHandler.success(res, { message: 'Request approved successfully' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('[LabController.approveLabChange] Error:', error);
        throw error;
    }
});


const denyLabChange = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const denied_by = req.user.id; 
    const hospitalId = getHospitalId(req); 
    await pool.query("UPDATE lab_change_requests SET status = 'Denied', processed_at = CURRENT_TIMESTAMP, processed_by = $1 WHERE id = $2 AND (hospital_id = $3)", [denied_by, id, hospitalId]); 
    ResponseHandler.success(res, { message: 'Request denied' });
});

// Generate Barcode - Multi-Tenant
const generateBarcode = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const hospitalId = getHospitalId(req); 
    const barcode = 'LAB' + String(id).padStart(8, '0'); 
    await pool.query('UPDATE lab_requests SET barcode = $1 WHERE id = $2 AND (hospital_id = $3)', [barcode, id, hospitalId]); 
    await logAudit(id, 'BARCODE_GENERATED', req.user.id, { barcode }, null, hospitalId); 
    ResponseHandler.success(res, { barcode });
});

// Process Payment - Multi-Tenant
const processPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { payment_method, amount, transaction_ref, payment_location } = req.body;
    const received_by = req.user.id;
    const received_by_username = req.user.username;
    const hospitalId = getHospitalId(req);

    const labReq = await pool.query('SELECT * FROM lab_requests WHERE id = $1 AND (hospital_id = $2)', [id, hospitalId]);
    if (labReq.rows.length === 0) return ResponseHandler.error(res, 'Lab request not found', 404);
    
    await pool.query(`UPDATE lab_requests SET payment_status = 'Paid', payment_method = $1, payment_received_at = NOW(), payment_received_by = $2, paid_by_username = $3, payment_location = $4, payment_reference = $5, paid_amount = $6 WHERE id = $7`, [payment_method, received_by, received_by_username, payment_location || 'billing', transaction_ref || null, amount || labReq.rows[0].test_price, id]);
    await logAudit(id, 'PAYMENT_RECEIVED', received_by, { method: payment_method, amount: amount || labReq.rows[0].test_price, reference: transaction_ref, collected_by: received_by_username, location: payment_location || 'billing' }, null, hospitalId);
    
    ResponseHandler.success(res, { message: 'Payment recorded successfully', payment: { status: 'Paid', method: payment_method, amount, collected_by: received_by_username, location: payment_location || 'billing', timestamp: new Date().toISOString() } });
});

// Collect Sample - Multi-Tenant
const collectSample = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const collected_by = req.user.id;
    const hospitalId = getHospitalId(req);

    const reqCheck = await pool.query('SELECT admission_id, payment_status, payment_method FROM lab_requests WHERE id = $1 AND (hospital_id = $2)', [id, hospitalId]);
    if (reqCheck.rows.length === 0) return ResponseHandler.error(res, 'Request not found', 404);
    
    const request = reqCheck.rows[0];
    if (!request.admission_id && request.payment_status !== 'Paid') return ResponseHandler.error(res, 'Payment required for OPD sample collection', 402, null, { requires_payment: true });
    
    const barcode = 'LAB' + String(id).padStart(8, '0');
    await pool.query(`UPDATE lab_requests SET barcode = COALESCE(barcode, $1), sample_collected_at = NOW(), collected_by = $2, status = 'Sample Collected' WHERE id = $3`, [barcode, collected_by, id]);
    await logAudit(id, 'SAMPLE_COLLECTED', collected_by, { barcode }, null, hospitalId);
    
    ResponseHandler.success(res, { message: 'Sample collected', barcode });
});

// Get Audit Log - Multi-Tenant
const getAuditLog = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`SELECT a.*, u.username as performed_by_name FROM lab_audit_log a LEFT JOIN users u ON a.performed_by = u.id WHERE a.lab_order_id = $1 AND (a.hospital_id = $2 OR a.hospital_id IS NULL) ORDER BY a.created_at DESC`, [id, hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Get Reference Ranges - Multi-Tenant
const getReferenceRanges = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query('SELECT * FROM lab_reference_ranges WHERE (hospital_id = $1) ORDER BY test_name, parameter', [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Get Critical Alerts - Multi-Tenant
const getCriticalAlerts = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`SELECT lr.id, lr.barcode, lr.has_critical_value, t.name as test_name, p.name as patient_name, res.result_json, lr.updated_at FROM lab_requests lr JOIN lab_test_types t ON lr.test_type_id = t.id LEFT JOIN patients p ON lr.patient_id = p.id LEFT JOIN lab_results res ON lr.id = res.request_id WHERE lr.has_critical_value = TRUE AND lr.status = 'Completed' AND (lr.hospital_id = $1 OR lr.hospital_id IS NULL) ORDER BY lr.updated_at DESC LIMIT 50`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Get TAT Analytics - Multi-Tenant
const getTATAnalytics = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const tatByTest = await pool.query(`SELECT t.name as test_name, COUNT(*) as total_tests, AVG(EXTRACT(EPOCH FROM (lr.updated_at - lr.requested_at))/3600) as avg_tat_hours, MIN(EXTRACT(EPOCH FROM (lr.updated_at - lr.requested_at))/3600) as min_tat_hours, MAX(EXTRACT(EPOCH FROM (lr.updated_at - lr.requested_at))/3600) as max_tat_hours FROM lab_requests lr JOIN lab_test_types t ON lr.test_type_id = t.id WHERE lr.status = 'Completed' AND lr.updated_at > NOW() - INTERVAL '30 days' AND (lr.hospital_id = $1 OR lr.hospital_id IS NULL) GROUP BY t.name ORDER BY total_tests DESC LIMIT 10`, [hospitalId]);
    const dailyTrend = await pool.query(`SELECT DATE(updated_at) as date, COUNT(*) as completed, AVG(EXTRACT(EPOCH FROM (updated_at - requested_at))/3600) as avg_tat_hours FROM lab_requests WHERE status = 'Completed' AND updated_at > NOW() - INTERVAL '7 days' AND (hospital_id = $1) GROUP BY DATE(updated_at) ORDER BY date`, [hospitalId]);
    const overall = await pool.query(`SELECT COUNT(*) as total_completed, AVG(EXTRACT(EPOCH FROM (updated_at - requested_at))/3600) as overall_avg_tat FROM lab_requests WHERE status = 'Completed' AND updated_at > NOW() - INTERVAL '30 days' AND (hospital_id = $1)`, [hospitalId]);
    
    ResponseHandler.success(res, { by_test: tatByTest.rows, daily_trend: dailyTrend.rows, overall: overall.rows[0] });
});

// Amend Result - Multi-Tenant
const amendResult = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { result_json, amendment_reason } = req.body;
    const amended_by = req.user.id;
    const hospitalId = getHospitalId(req);
    
    await pool.query('BEGIN');
    try {
        const current = await pool.query('SELECT * FROM lab_results WHERE id = $1 AND (hospital_id = $2)', [id, hospitalId]);
        if (current.rows.length === 0) { 
            await pool.query('ROLLBACK'); 
            return ResponseHandler.error(res, 'Result not found', 404); 
        }
        const currentResult = current.rows[0]; 
        const newVersion = (currentResult.amendment_count || 0) + 1;
        await pool.query(`INSERT INTO lab_result_versions (result_id, version, result_json, amendment_reason, amended_by, hospital_id) VALUES ($1, $2, $3, $4, $5, $6)`, [id, currentResult.amendment_count || 0, currentResult.result_json, amendment_reason, amended_by, hospitalId]);
        await pool.query(`UPDATE lab_results SET result_json = $1, amendment_count = $2, updated_at = NOW() WHERE id = $3`, [JSON.stringify(result_json), newVersion, id]);
        await logAudit(currentResult.request_id, 'RESULT_AMENDED', amended_by, { version: newVersion, reason: amendment_reason }, null, hospitalId);
        await pool.query('COMMIT'); 
        ResponseHandler.success(res, { message: 'Result amended', version: newVersion });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('[LabController.amendResult] Error:', error);
        throw error;
    }
});

// Get Result Versions - Multi-Tenant
const getResultVersions = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const hospitalId = getHospitalId(req); 
    const versions = await pool.query(`SELECT v.*, u.username as amended_by_name FROM lab_result_versions v LEFT JOIN users u ON v.amended_by = u.id WHERE v.result_id = $1 AND (v.hospital_id = $2 OR v.hospital_id IS NULL) ORDER BY v.version DESC`, [id, hospitalId]); 
    ResponseHandler.success(res, versions.rows);
});

// Verify Result - Multi-Tenant
const verifyResult = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const verified_by = req.user.id; 
    const hospitalId = getHospitalId(req); 
    await pool.query(`UPDATE lab_results SET verified_by = $1, verified_at = NOW() WHERE id = $2 AND (hospital_id = $3)`, [verified_by, id, hospitalId]); 
    const result = await pool.query('SELECT request_id FROM lab_results WHERE id = $1', [id]); 
    if (result.rows.length > 0) await logAudit(result.rows[0].request_id, 'RESULT_VERIFIED', verified_by, {}, null, hospitalId); 
    ResponseHandler.success(res, { message: 'Result verified', verified_at: new Date() });
});

// Get Patient Trends - Multi-Tenant
const getPatientTrends = asyncHandler(async (req, res) => { 
    const { patient_id, test_type } = req.params; 
    const hospitalId = getHospitalId(req); 
    const trends = await pool.query(`SELECT lr.id, lr.requested_at, lr.updated_at, t.name as test_name, res.result_json FROM lab_requests lr JOIN lab_test_types t ON lr.test_type_id = t.id LEFT JOIN lab_results res ON lr.id = res.request_id WHERE lr.patient_id = $1 AND lr.status = 'Completed' AND ($2::text IS NULL OR t.name ILIKE $2) AND (lr.hospital_id = $3 OR lr.hospital_id IS NULL) ORDER BY lr.updated_at DESC LIMIT 20`, [patient_id, test_type || null, hospitalId]); 
    ResponseHandler.success(res, trends.rows);
});

// Acknowledge Critical Alert - Multi-Tenant
const acknowledgeCriticalAlert = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const acknowledged_by = req.user.id; 
    const hospitalId = getHospitalId(req); 
    await pool.query(`UPDATE lab_critical_alerts SET acknowledged = TRUE, acknowledged_by = $1, acknowledged_at = NOW() WHERE id = $2 AND (hospital_id = $3)`, [acknowledged_by, id, hospitalId]); 
    ResponseHandler.success(res, { message: 'Alert acknowledged' });
});

// Get Pending Critical Alerts - Multi-Tenant
const getPendingCriticalAlerts = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const alerts = await pool.query(`SELECT a.*, p.name as patient_name, t.name as test_name FROM lab_critical_alerts a LEFT JOIN patients p ON a.patient_id = p.id LEFT JOIN lab_requests lr ON a.lab_request_id = lr.id LEFT JOIN lab_test_types t ON lr.test_type_id = t.id WHERE a.acknowledged = FALSE AND (a.hospital_id = $1 OR a.hospital_id IS NULL) ORDER BY a.created_at DESC LIMIT 50`, [hospitalId]); 
    ResponseHandler.success(res, alerts.rows);
});

// Get Reagents - Multi-Tenant
const getReagents = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const reagents = await pool.query(`SELECT *, CASE WHEN current_stock <= min_stock_level * 0.5 THEN 'critical' WHEN current_stock <= min_stock_level THEN 'low' ELSE 'ok' END as stock_status, CASE WHEN expiry_date <= NOW() THEN 'expired' WHEN expiry_date <= NOW() + INTERVAL '7 days' THEN 'expiring_soon' WHEN expiry_date <= NOW() + INTERVAL '30 days' THEN 'expiring' ELSE 'ok' END as expiry_status FROM lab_reagents WHERE (hospital_id = $1) ORDER BY CASE WHEN current_stock <= min_stock_level THEN 0 ELSE 1 END, expiry_date ASC`, [hospitalId]); 
    ResponseHandler.success(res, reagents.rows);
});

// Add Reagent - Multi-Tenant
const addReagent = asyncHandler(async (req, res) => { 
    const { name, catalog_number, manufacturer, current_stock, min_stock_level, unit, expiry_date, storage_location } = req.body; 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`INSERT INTO lab_reagents (name, catalog_number, manufacturer, current_stock, min_stock_level, unit, expiry_date, storage_location, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [name, catalog_number, manufacturer, current_stock || 0, min_stock_level || 10, unit || 'units', expiry_date, storage_location, hospitalId]); 
    ResponseHandler.success(res, result.rows[0], 201);
});

// Update Reagent - Multi-Tenant
const updateReagent = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const { current_stock, min_stock_level, expiry_date, storage_location } = req.body; 
    const hospitalId = getHospitalId(req); 
    await pool.query(`UPDATE lab_reagents SET current_stock = COALESCE($1, current_stock), min_stock_level = COALESCE($2, min_stock_level), expiry_date = COALESCE($3, expiry_date), storage_location = COALESCE($4, storage_location), updated_at = NOW() WHERE id = $5 AND (hospital_id = $6)`, [current_stock, min_stock_level, expiry_date, storage_location, id, hospitalId]); 
    ResponseHandler.success(res, { message: 'Reagent updated' });
});

// Use Reagent - Multi-Tenant
const useReagent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quantity, lab_request_id, notes } = req.body;
    const used_by = req.user.id;
    const hospitalId = getHospitalId(req);
    
    await pool.query('BEGIN');
    try {
        await pool.query(`INSERT INTO reagent_usage_log (reagent_id, quantity_used, used_by, lab_request_id, notes, hospital_id) VALUES ($1, $2, $3, $4, $5, $6)`, [id, quantity, used_by, lab_request_id, notes, hospitalId]);
        await pool.query('UPDATE lab_reagents SET current_stock = current_stock - $1 WHERE id = $2 AND (hospital_id = $3)', [quantity, id, hospitalId]);
        await pool.query('COMMIT');
        ResponseHandler.success(res, { message: 'Usage logged' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('[LabController.useReagent] Error:', error);
        throw error;
    }
});

// Get Low Stock Alerts - Multi-Tenant
const getLowStockAlerts = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const alerts = await pool.query(`SELECT * FROM lab_reagents WHERE (current_stock <= min_stock_level OR expiry_date <= NOW() + INTERVAL '30 days') AND (hospital_id = $1) ORDER BY current_stock ASC`, [hospitalId]); 
    ResponseHandler.success(res, alerts.rows);
});

// Get QC Materials - Multi-Tenant
const getQCMaterials = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const materials = await pool.query(`SELECT qc.*, t.name as test_name FROM lab_qc_materials qc LEFT JOIN lab_test_types t ON qc.test_type_id = t.id WHERE qc.is_active = TRUE AND (qc.hospital_id = $1 OR qc.hospital_id IS NULL) ORDER BY qc.name`, [hospitalId]); 
    ResponseHandler.success(res, materials.rows);
});

// Add QC Result - Multi-Tenant
const addQCResult = asyncHandler(async (req, res) => {
    const { qc_material_id, value } = req.body;
    const performed_by = req.user.id;
    const hospitalId = getHospitalId(req);

    const material = await pool.query('SELECT * FROM lab_qc_materials WHERE id = $1 AND (hospital_id = $2)', [qc_material_id, hospitalId]);
    if (material.rows.length === 0) return ResponseHandler.error(res, 'QC material not found', 404);
    
    const { target_value, sd_value } = material.rows[0];
    const deviation_sd = (value - target_value) / sd_value;
    let westgard_rule = null;
    let status = 'pass';
    if (Math.abs(deviation_sd) > 3) { westgard_rule = '1:3s'; status = 'fail'; } 
    else if (Math.abs(deviation_sd) > 2) { westgard_rule = '1:2s'; status = 'warning'; }
    
    const result = await pool.query(`INSERT INTO lab_qc_results (qc_material_id, value, performed_by, status, westgard_rule, deviation_sd, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [qc_material_id, value, performed_by, status, westgard_rule, deviation_sd, hospitalId]);
    ResponseHandler.success(res, result.rows[0], 201);
});

// Get QC Results - Multi-Tenant
const getQCResults = asyncHandler(async (req, res) => { 
    const { material_id } = req.params; 
    const hospitalId = getHospitalId(req); 
    const results = await pool.query(`SELECT r.*, m.target_value, m.sd_value, m.name as material_name FROM lab_qc_results r JOIN lab_qc_materials m ON r.qc_material_id = m.id WHERE r.qc_material_id = $1 AND (r.hospital_id = $2 OR r.hospital_id IS NULL) ORDER BY r.created_at DESC LIMIT 30`, [material_id, hospitalId]); 
    ResponseHandler.success(res, results.rows);
});

// Generate Report Token - Multi-Tenant
const generateReportToken = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const created_by = req.user.id; 
    const hospitalId = getHospitalId(req); 
    const token = require('crypto').randomBytes(32).toString('hex'); 
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 
    await pool.query(`INSERT INTO lab_report_tokens (lab_request_id, token, expires_at, created_by, hospital_id) VALUES ($1, $2, $3, $4, $5)`, [id, token, expires_at, created_by, hospitalId]); 
    const reportUrl = `${req.protocol}://${req.get('host')}/report/${token}`; 
    ResponseHandler.success(res, { token, url: reportUrl, expires_at });
});

// Get Public Report (no auth required)
const getPublicReport = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const tokenData = await pool.query(`SELECT t.*, lr.*, p.name as patient_name, p.age, p.gender, tt.name as test_name, res.result_json, res.created_at as result_date FROM lab_report_tokens t JOIN lab_requests lr ON t.lab_request_id = lr.id JOIN patients p ON lr.patient_id = p.id JOIN lab_test_types tt ON lr.test_type_id = tt.id LEFT JOIN lab_results res ON lr.id = res.request_id WHERE t.token = $1 AND t.expires_at > NOW()`, [token]);
    if (tokenData.rows.length === 0) return ResponseHandler.error(res, 'Report not found or expired', 404);
    
    await pool.query('UPDATE lab_report_tokens SET accessed_count = accessed_count + 1 WHERE token = $1', [token]);
    const hospitalProfile = await pool.query('SELECT * FROM hospital_profile WHERE id = 1');
    ResponseHandler.success(res, { ...tokenData.rows[0], hospital_profile: hospitalProfile.rows[0] || null });
});

// Get Lab Revenue - Multi-Tenant
const getLabRevenue = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const dailyRevenue = await pool.query(`SELECT DATE(lr.updated_at) as date, COUNT(*) as test_count, SUM(t.price) as revenue FROM lab_requests lr JOIN lab_test_types t ON lr.test_type_id = t.id WHERE lr.status = 'Completed' AND lr.updated_at > NOW() - INTERVAL '30 days' AND (lr.hospital_id = $1 OR lr.hospital_id IS NULL) GROUP BY DATE(lr.updated_at) ORDER BY date`, [hospitalId]);
    const byTestType = await pool.query(`SELECT t.name as test_name, COUNT(*) as count, SUM(t.price) as revenue FROM lab_requests lr JOIN lab_test_types t ON lr.test_type_id = t.id WHERE lr.status = 'Completed' AND lr.updated_at > NOW() - INTERVAL '30 days' AND (lr.hospital_id = $1 OR lr.hospital_id IS NULL) GROUP BY t.name ORDER BY revenue DESC LIMIT 10`, [hospitalId]);
    const total = await pool.query(`SELECT COUNT(*) as total_tests, SUM(t.price) as total_revenue FROM lab_requests lr JOIN lab_test_types t ON lr.test_type_id = t.id WHERE lr.status = 'Completed' AND lr.updated_at > NOW() - INTERVAL '30 days' AND (lr.hospital_id = $1 OR lr.hospital_id IS NULL)`, [hospitalId]);
    
    ResponseHandler.success(res, { daily: dailyRevenue.rows, by_test_type: byTestType.rows, total: total.rows[0] });
});

// Get Lab Workload - Multi-Tenant
const getLabWorkload = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const workload = await pool.query(`SELECT u.username as technician, COUNT(*) as tests_completed, AVG(EXTRACT(EPOCH FROM (lr.updated_at - lr.requested_at))/3600) as avg_tat_hours FROM lab_requests lr LEFT JOIN users u ON lr.completed_by = u.id WHERE lr.status = 'Completed' AND lr.updated_at > NOW() - INTERVAL '7 days' AND (lr.hospital_id = $1 OR lr.hospital_id IS NULL) GROUP BY u.username ORDER BY tests_completed DESC`, [hospitalId]); 
    ResponseHandler.success(res, workload.rows);
});

// Get Pending Lab Payments - Multi-Tenant
const getPendingLabPayments = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`SELECT lr.id, lr.patient_id, p.name as patient_name, p.phone as patient_phone, COALESCE(t.name, lr.test_name) as test_name, lr.test_price, lr.payment_status, lr.requested_at, d.username as ordered_by_doctor, lr.admission_id FROM lab_requests lr LEFT JOIN lab_test_types t ON lr.test_type_id = t.id LEFT JOIN patients p ON lr.patient_id = p.id LEFT JOIN users d ON lr.doctor_id = d.id WHERE (lr.payment_status IS NULL OR lr.payment_status = 'Pending') AND lr.admission_id IS NULL AND (lr.hospital_id = $1 OR lr.hospital_id IS NULL) ORDER BY lr.requested_at DESC LIMIT 100`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Get Lab Payment Status - Multi-Tenant
const getLabPaymentStatus = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`SELECT id, payment_status, payment_method, paid_amount, paid_by_username, payment_location, payment_reference, payment_received_at FROM lab_requests WHERE id = $1 AND (hospital_id = $2)`, [id, hospitalId]); 
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Lab request not found', 404); 
    ResponseHandler.success(res, result.rows[0]);
});

module.exports = { orderTest, getLabQueue, uploadResult, getLabStats, getLabTests, getLabResultsByPatient, getLabHistory, getPackages, requestLabChange, getLabRequests, approveLabChange, denyLabChange, generateBarcode, collectSample, getAuditLog, getReferenceRanges, getCriticalAlerts, checkCriticalValues, flagResultValues, getTATAnalytics, amendResult, getResultVersions, verifyResult, getPatientTrends, createCriticalAlert, acknowledgeCriticalAlert, getPendingCriticalAlerts, getReagents, addReagent, updateReagent, useReagent, getLowStockAlerts, getQCMaterials, addQCResult, getQCResults, generateReportToken, getPublicReport, checkDeltaValue, getLabRevenue, getLabWorkload, processPayment, getPendingLabPayments, getLabPaymentStatus };
