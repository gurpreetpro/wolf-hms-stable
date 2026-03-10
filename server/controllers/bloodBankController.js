/**
 * Blood Bank Controller - Multi-Tenant
 * WOLF HMS - Complete Blood Bank Operations
 */
const db = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get Donors - Multi-Tenant
const getDonors = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { blood_group, is_eligible, search, page = 1, limit = 50 } = req.query; 
    const offset = (page - 1) * limit; 
    
    let query = `SELECT d.*, (SELECT COUNT(*) FROM blood_units WHERE donor_id = d.id) as units_donated FROM blood_donors d WHERE (d.hospital_id = $1 OR d.hospital_id IS NULL)`; 
    const params = [hospitalId]; 
    let paramCount = 1;

    if (blood_group) { 
        paramCount++; 
        query += ` AND d.blood_group = $${paramCount}`; 
        params.push(blood_group); 
    }
    if (is_eligible !== undefined) { 
        paramCount++; 
        query += ` AND d.is_eligible = $${paramCount}`; 
        params.push(is_eligible === 'true'); 
    }
    if (search) { 
        paramCount++; 
        query += ` AND (d.name ILIKE $${paramCount} OR d.phone ILIKE $${paramCount} OR d.donor_id ILIKE $${paramCount})`; 
        params.push(`%${search}%`); 
    }
    
    query += ` ORDER BY d.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`; 
    params.push(limit, offset);

    const result = await db.pool.query(query, params); 
    const countResult = await db.pool.query('SELECT COUNT(*) FROM blood_donors WHERE (hospital_id = $1 OR hospital_id IS NULL)', [hospitalId]);
    
    ResponseHandler.success(res, { donors: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), totalPages: Math.ceil(countResult.rows[0].count / limit) });
});

// Register Donor - Multi-Tenant
const registerDonor = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { name, phone, email, blood_group, rh_factor, date_of_birth, gender, address, city, weight, hemoglobin, blood_pressure, pulse, is_voluntary, medical_history, emergency_contact_name, emergency_contact_phone } = req.body;
    
    // Check for existing donor
    const existing = await db.pool.query('SELECT id FROM blood_donors WHERE phone = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [phone, hospitalId]); 
    if (existing.rows.length > 0) return ResponseHandler.error(res, 'Donor with this phone already exists', 400);
    
    // Generate Donor ID
    const donorCode = `DON-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    const result = await db.pool.query(
        `INSERT INTO blood_donors (
            donor_id, name, phone, email, blood_group, rh_factor, date_of_birth, gender, 
            address, city, weight, hemoglobin, blood_pressure, pulse, is_voluntary, 
            medical_history, emergency_contact_name, emergency_contact_phone, created_by, hospital_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`, 
        [
            donorCode,
            name, 
            phone, 
            email || null, 
            blood_group, 
            rh_factor || 'Positive', 
            date_of_birth || null, 
            gender || null, 
            address || null, 
            city || null, 
            weight || null, 
            hemoglobin || null, 
            blood_pressure || null, 
            pulse || null, 
            is_voluntary !== false, 
            JSON.stringify(medical_history || {}), 
            emergency_contact_name || null, 
            emergency_contact_phone || null, 
            req.user?.id || null, 
            hospitalId
        ]
    );
    
    const donor = await db.pool.query('SELECT * FROM blood_donors WHERE id = $1', [result.rows[0].id]); 
    ResponseHandler.success(res, { message: 'Donor registered successfully', donor: donor.rows[0] }, 201);
});

// Get Donor By ID - Multi-Tenant
const getDonorById = asyncHandler(async (req, res) => {
    const { id } = req.params; 
    const hospitalId = getHospitalId(req);
    
    const donor = await db.pool.query(`SELECT d.*, (SELECT COUNT(*) FROM blood_units WHERE donor_id = d.id) as total_donations, (SELECT MAX(collection_date) FROM blood_units WHERE donor_id = d.id) as last_donation FROM blood_donors d WHERE d.id = $1 AND (d.hospital_id = $2 OR d.hospital_id IS NULL)`, [id, hospitalId]); 
    if (donor.rows.length === 0) return ResponseHandler.error(res, 'Donor not found', 404);
    
    const donations = await db.pool.query(`SELECT bu.*, bct.name as component_name FROM blood_units bu LEFT JOIN blood_component_types bct ON bu.component_type_id = bct.id WHERE bu.donor_id = $1 ORDER BY bu.collection_date DESC`, [id]);
    
    ResponseHandler.success(res, { donor: donor.rows[0], donations: donations.rows });
});

// Update Donor Eligibility - Multi-Tenant
const updateDonorEligibility = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const { is_eligible, deferral_reason, deferral_until } = req.body; 
    const hospitalId = getHospitalId(req); 
    await db.pool.query(`UPDATE blood_donors SET is_eligible = $1, deferral_reason = $2, deferral_until = $3, updated_at = NOW() WHERE id = $4 AND (hospital_id = $5 OR hospital_id IS NULL)`, [is_eligible, deferral_reason, deferral_until, id, hospitalId]); 
    ResponseHandler.success(res, { message: 'Donor eligibility updated' });
});

// Get Inventory Summary - Multi-Tenant
const getInventorySummary = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const summary = await db.pool.query(`SELECT bu.blood_group, bct.name as component_type, bct.code as component_code, COUNT(*) as units_available, SUM(bu.volume_ml) as total_volume, MIN(bu.expiry_date) as nearest_expiry FROM blood_units bu LEFT JOIN blood_component_types bct ON bu.component_type_id = bct.id WHERE bu.status = 'Available' AND (bu.hospital_id = $1 OR bu.hospital_id IS NULL) GROUP BY bu.blood_group, bct.name, bct.code ORDER BY bu.blood_group, bct.name`, [hospitalId]);
    const expiring = await db.pool.query(`SELECT COUNT(*) as count FROM blood_units WHERE status = 'Available' AND expiry_date <= CURRENT_DATE + INTERVAL '7 days' AND (hospital_id = $1 OR hospital_id IS NULL)`, [hospitalId]);
    const byBloodGroup = await db.pool.query(`SELECT blood_group, COUNT(*) as units FROM blood_units WHERE status = 'Available' AND (hospital_id = $1 OR hospital_id IS NULL) GROUP BY blood_group ORDER BY blood_group`, [hospitalId]);
    
    ResponseHandler.success(res, { inventory: summary.rows, byBloodGroup: byBloodGroup.rows, expiringSoon: parseInt(expiring.rows[0].count), totalAvailable: summary.rows.reduce((sum, r) => sum + parseInt(r.units_available), 0) });
});

// Get Blood Units - Multi-Tenant
const getBloodUnits = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { status, blood_group, component_type, expiring_days, page = 1, limit = 50 } = req.query; 
    const offset = (page - 1) * limit; 
    
    let query = `SELECT bu.*, bd.name as donor_name, bd.donor_id as donor_code, bct.name as component_name, bct.code as component_code, p.name as reserved_patient_name FROM blood_units bu LEFT JOIN blood_donors bd ON bu.donor_id = bd.id LEFT JOIN blood_component_types bct ON bu.component_type_id = bct.id LEFT JOIN patients p ON bu.reserved_for_patient = p.id WHERE (bu.hospital_id = $1 OR bu.hospital_id IS NULL)`; 
    const params = [hospitalId]; 
    let paramCount = 1;

    if (status) { paramCount++; query += ` AND bu.status = $${paramCount}`; params.push(status); }
    if (blood_group) { paramCount++; query += ` AND bu.blood_group = $${paramCount}`; params.push(blood_group); }
    if (component_type) { paramCount++; query += ` AND bct.code = $${paramCount}`; params.push(component_type); }
    if (expiring_days) { paramCount++; query += ` AND bu.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $${paramCount}`; params.push(parseInt(expiring_days)); }
    
    query += ` ORDER BY bu.expiry_date ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`; 
    params.push(limit, offset);
    
    const result = await db.pool.query(query, params); 
    ResponseHandler.success(res, { units: result.rows });
});

// Add Blood Unit - Multi-Tenant
const addBloodUnit = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { donor_id, blood_group, rh_factor, component_type_id, volume_ml, collection_date, collection_type, storage_location, bag_number } = req.body;
    
    const component = await db.pool.query('SELECT shelf_life_days FROM blood_component_types WHERE id = $1', [component_type_id || 1]); 
    const shelfLife = component.rows[0]?.shelf_life_days || 35;
    
    const result = await db.pool.query(`INSERT INTO blood_units (donor_id, blood_group, rh_factor, component_type_id, volume_ml, collection_date, expiry_date, collection_type, storage_location, bag_number, status, created_by, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $6::date + $7, $8, $9, $10, 'Quarantine', $11, $12) RETURNING *`, [donor_id, blood_group, rh_factor || 'Positive', component_type_id || 1, volume_ml || 450, collection_date, shelfLife, collection_type || 'Voluntary', storage_location || null, bag_number || null, req.user?.id || null, hospitalId]);
    
    if (donor_id) { 
        await db.pool.query(`UPDATE blood_donors SET last_donation_date = $1, total_donations = total_donations + 1, updated_at = NOW() WHERE id = $2`, [collection_date, donor_id]); 
    }
    
    const unit = await db.pool.query('SELECT * FROM blood_units WHERE id = $1', [result.rows[0].id]); 
    ResponseHandler.success(res, { message: 'Blood unit added', unit: unit.rows[0] }, 201);
});

// Update Unit Status - Multi-Tenant
const updateUnitStatus = asyncHandler(async (req, res) => {
    const { id } = req.params; 
    const { status, tested_status, tti_results, storage_location, notes, discard_reason } = req.body; 
    const hospitalId = getHospitalId(req);
    
    let query = 'UPDATE blood_units SET updated_at = NOW()'; 
    const params = []; 
    let paramCount = 0;
    
    if (status) { 
        paramCount++; 
        query += `, status = $${paramCount}`; 
        params.push(status); 
        if (status === 'Discarded') { 
            paramCount++; 
            query += `, discarded_by = $${paramCount}, discarded_at = NOW()`; 
            params.push(req.user?.id); 
        } 
    }
    if (tested_status) { paramCount++; query += `, tested_status = $${paramCount}`; params.push(tested_status); }
    if (tti_results) { paramCount++; query += `, tti_results = $${paramCount}`; params.push(JSON.stringify(tti_results)); }
    if (storage_location) { paramCount++; query += `, storage_location = $${paramCount}`; params.push(storage_location); }
    if (discard_reason) { paramCount++; query += `, discard_reason = $${paramCount}`; params.push(discard_reason); }
    if (notes) { paramCount++; query += `, notes = $${paramCount}`; params.push(notes); }
    
    paramCount++; query += ` WHERE id = $${paramCount}`; params.push(id); 
    paramCount++; query += ` AND (hospital_id = $${paramCount} OR hospital_id IS NULL)`; params.push(hospitalId);
    
    await db.pool.query(query, params); 
    ResponseHandler.success(res, { message: 'Blood unit updated' });
});

// Separate Components - Multi-Tenant
const separateComponents = asyncHandler(async (req, res) => {
    const { id } = req.params; 
    const { components } = req.body; 
    const hospitalId = getHospitalId(req);
    
    const parent = await db.pool.query('SELECT * FROM blood_units WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [id, hospitalId]); 
    if (parent.rows.length === 0) return ResponseHandler.error(res, 'Parent unit not found', 404); 
    
    const parentUnit = parent.rows[0]; 
    const createdUnits = [];

    for (const comp of components) { 
        const compType = await db.pool.query('SELECT * FROM blood_component_types WHERE id = $1', [comp.component_type_id]); 
        if (compType.rows.length === 0) continue;
        
        const result = await db.pool.query(`INSERT INTO blood_units (donor_id, blood_group, rh_factor, component_type_id, parent_unit_id, volume_ml, collection_date, expiry_date, storage_location, status, tested_status, tti_results, created_by, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $7::date + $8, $9, $10, $11, $12, $13, $14) RETURNING *`, [parentUnit.donor_id, parentUnit.blood_group, parentUnit.rh_factor, comp.component_type_id, id, comp.volume_ml, parentUnit.collection_date, compType.rows[0].shelf_life_days, parentUnit.storage_location, parentUnit.status, parentUnit.tested_status, parentUnit.tti_results, req.user?.id, hospitalId]); 
        createdUnits.push(result.rows[0]); 
    }
    
    await db.pool.query("UPDATE blood_units SET status = 'Processed', notes = 'Separated into components' WHERE id = $1", [id]); 
    ResponseHandler.success(res, { message: 'Components separated', units: createdUnits });
});

// Get Pending Requests - Multi-Tenant
const getPendingRequests = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { status = 'Pending', department, priority } = req.query; 
    
    let query = `SELECT br.*, p.name as patient_name, p.phone as patient_phone, p.blood_group as patient_blood_group, u.name as requested_by_name, bct.name as component_name, bct.code as component_code FROM blood_requests br LEFT JOIN patients p ON br.patient_id = p.id LEFT JOIN users u ON br.requested_by = u.id LEFT JOIN blood_component_types bct ON br.component_type_id = bct.id WHERE br.status = $1 AND (br.hospital_id = $2 OR br.hospital_id IS NULL)`; 
    const params = [status, hospitalId]; 
    let paramCount = 2;
    
    if (department) { paramCount++; query += ` AND br.department = $${paramCount}`; params.push(department); }
    if (priority) { paramCount++; query += ` AND br.priority = $${paramCount}`; params.push(priority); }
    
    query += ` ORDER BY CASE br.priority WHEN 'Emergency' THEN 1 WHEN 'Urgent' THEN 2 WHEN 'Normal' THEN 3 ELSE 4 END, br.created_at ASC`;
    
    const result = await db.pool.query(query, params); 
    ResponseHandler.success(res, { requests: result.rows });
});

// Create Request - Multi-Tenant
const createRequest = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { patient_id, department, ward_id, bed_number, admission_id, surgery_id, blood_group_required, component_type_id, units_required, priority, indication, diagnosis, hemoglobin_level, platelet_count, inr_value, previous_transfusion, previous_reaction, reaction_history, cross_match_required, expected_date, urgency_notes } = req.body;
    
    let patientBloodGroup = blood_group_required; 
    if (patient_id && !blood_group_required) { 
        const patient = await db.pool.query('SELECT blood_group FROM patients WHERE id = $1', [patient_id]); 
        patientBloodGroup = patient.rows[0]?.blood_group; 
    }
    
    const result = await db.pool.query(`INSERT INTO blood_requests (patient_id, patient_blood_group, requested_by, department, ward_id, bed_number, admission_id, surgery_id, blood_group_required, component_type_id, units_required, priority, indication, diagnosis, hemoglobin_level, platelet_count, inr_value, previous_transfusion, previous_reaction, reaction_history, cross_match_required, expected_date, urgency_notes, status, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, 'Pending', $24) RETURNING *`, [
        patient_id, 
        patientBloodGroup || null, 
        req.user?.id || null, 
        department || null, 
        ward_id || null, 
        bed_number || null, 
        admission_id || null, 
        surgery_id || null, 
        blood_group_required || patientBloodGroup, 
        component_type_id || 2, 
        units_required || 1, 
        priority || 'Normal', 
        indication || null, 
        diagnosis || null, 
        hemoglobin_level || null, 
        platelet_count || null, 
        inr_value || null, 
        previous_transfusion || false, 
        previous_reaction || false, 
        reaction_history || null, 
        cross_match_required !== false, 
        expected_date || null, 
        urgency_notes || null, 
        hospitalId
    ]);
    
    const request = await db.pool.query('SELECT * FROM blood_requests WHERE id = $1', [result.rows[0].id]); 
    if (req.io) req.io.emit('blood_request:new', request.rows[0]); 
    ResponseHandler.success(res, { message: 'Blood request created', request: request.rows[0] }, 201);
});

// Process Request - Multi-Tenant
const processRequest = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const { action, rejection_reason } = req.body; 
    const hospitalId = getHospitalId(req); 
    
    if (action === 'approve') {
        await db.pool.query(`UPDATE blood_requests SET status = 'Approved', approved_by = $1, approved_at = NOW(), updated_at = NOW() WHERE id = $2 AND (hospital_id = $3 OR hospital_id IS NULL)`, [req.user?.id, id, hospitalId]); 
    } else if (action === 'reject') {
        await db.pool.query(`UPDATE blood_requests SET status = 'Rejected', rejection_reason = $1, updated_at = NOW() WHERE id = $2 AND (hospital_id = $3 OR hospital_id IS NULL)`, [rejection_reason, id, hospitalId]); 
    }
    ResponseHandler.success(res, { message: `Request ${action}ed` });
});

// Issue Blood - Multi-Tenant
const issueBlood = asyncHandler(async (req, res) => {
    const { request_id, unit_id, cross_match_id } = req.body; 
    const hospitalId = getHospitalId(req);
    
    const request = await db.pool.query('SELECT * FROM blood_requests WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [request_id, hospitalId]); 
    const unit = await db.pool.query('SELECT * FROM blood_units WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [unit_id, hospitalId]); 
    
    if (request.rows.length === 0 || unit.rows.length === 0) return ResponseHandler.error(res, 'Request or unit not found', 404); 
    if (unit.rows[0].status !== 'Available' && unit.rows[0].status !== 'Reserved') return ResponseHandler.error(res, 'Unit is not available for issue', 400);

    await db.pool.query(`UPDATE blood_units SET status = 'Issued', issued_to_patient = $1, issued_date = NOW(), issued_by = $2, updated_at = NOW() WHERE id = $3`, [request.rows[0].patient_id, req.user?.id, unit_id]);
    await db.pool.query(`UPDATE blood_requests SET units_issued = units_issued + 1, status = CASE WHEN units_issued + 1 >= units_required THEN 'Completed' ELSE 'Partially Issued' END, updated_at = NOW() WHERE id = $1`, [request_id]); 
    
    // Auto-Bill Processing Fee
    try {
        await BloodBankBilling.billTransfusion({
            transfusionId: null, // Billed at issue, no transfusion record yet
            unitId: unit_id,
            patientId: request.rows[0].patient_id,
            admissionId: request.rows[0].admission_id,
            componentTypeId: unit.rows[0].component_type_id,
            additionalServices: [], // Add crossmatch fee here if not already billed? Keeping simple for now.
            userId: req.user?.id
        });
    } catch (billingError) {
        console.error('Auto-billing failed during blood issue:', billingError);
        // We log but don't fail the issue process, as clinical priority > billing
    }

    ResponseHandler.success(res, { message: 'Blood unit issued and billed' });
});

// Get Component Types - Multi-Tenant
const getComponentTypes = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await db.pool.query('SELECT * FROM blood_component_types WHERE is_active = true AND (hospital_id = $1 OR hospital_id IS NULL) ORDER BY id', [hospitalId]); 
    ResponseHandler.success(res, { componentTypes: result.rows });
});

// Get Dashboard Stats - Multi-Tenant
const getDashboardStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const inventory = await db.pool.query(`SELECT blood_group, COUNT(*) as units FROM blood_units WHERE status = 'Available' AND (hospital_id = $1 OR hospital_id IS NULL) GROUP BY blood_group ORDER BY blood_group`, [hospitalId]);
    const pendingRequests = await db.pool.query(`SELECT COUNT(*) as count FROM blood_requests WHERE status = 'Pending' AND (hospital_id = $1 OR hospital_id IS NULL)`, [hospitalId]);
    const todayCollections = await db.pool.query(`SELECT COUNT(*) as count FROM blood_units WHERE DATE(collection_date) = CURRENT_DATE AND (hospital_id = $1 OR hospital_id IS NULL)`, [hospitalId]);
    const expiring = await db.pool.query(`SELECT COUNT(*) as count FROM blood_units WHERE status = 'Available' AND expiry_date <= CURRENT_DATE + INTERVAL '7 days' AND (hospital_id = $1 OR hospital_id IS NULL)`, [hospitalId]);
    const issuedToday = await db.pool.query(`SELECT COUNT(*) as count FROM blood_units WHERE DATE(issued_date) = CURRENT_DATE AND (hospital_id = $1 OR hospital_id IS NULL)`, [hospitalId]);
    const totalDonors = await db.pool.query('SELECT COUNT(*) as count FROM blood_donors WHERE (hospital_id = $1 OR hospital_id IS NULL)', [hospitalId]);
    const eligibleDonors = await db.pool.query('SELECT COUNT(*) as count FROM blood_donors WHERE is_eligible = true AND (hospital_id = $1 OR hospital_id IS NULL)', [hospitalId]);
    
    ResponseHandler.success(res, { inventory: inventory.rows, pendingRequests: parseInt(pendingRequests.rows[0].count), todayCollections: parseInt(todayCollections.rows[0].count), expiringSoon: parseInt(expiring.rows[0].count), issuedToday: parseInt(issuedToday.rows[0].count), totalDonors: parseInt(totalDonors.rows[0].count), eligibleDonors: parseInt(eligibleDonors.rows[0].count) });
});

// Record TTI Results - Multi-Tenant
const recordTTIResults = asyncHandler(async (req, res) => { 
    const { unit_id, results, tested_by } = req.body; 
    const hospitalId = getHospitalId(req); 
    
    const unit = await db.pool.query('SELECT * FROM blood_units WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [unit_id, hospitalId]); 
    if (unit.rows.length === 0) return ResponseHandler.error(res, 'Blood unit not found', 404); 
    
    const allNegative = Object.values(results).every(r => r === 'Negative' || r === 'Non-Reactive'); 
    const testedStatus = allNegative ? 'Passed' : 'Failed'; 
    const newStatus = allNegative ? 'Available' : 'Quarantine'; 
    
    await db.pool.query(`UPDATE blood_units SET tti_results = $1, tested_status = $2, status = CASE WHEN status = 'Quarantine' THEN $3 ELSE status END, blood_group_confirmed = true, updated_at = NOW() WHERE id = $4`, [JSON.stringify(results), testedStatus, newStatus, unit_id]); 
    ResponseHandler.success(res, { message: `TTI results recorded. Unit is ${testedStatus}`, testedStatus, newStatus: allNegative ? newStatus : 'Remains in Quarantine' });
});

// Get Units For Testing - Multi-Tenant
const getUnitsForTesting = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await db.pool.query(`SELECT bu.*, bd.name as donor_name, bct.name as component_name FROM blood_units bu LEFT JOIN blood_donors bd ON bu.donor_id = bd.id LEFT JOIN blood_component_types bct ON bu.component_type_id = bct.id WHERE bu.tested_status = 'Pending' AND (bu.hospital_id = $1 OR bu.hospital_id IS NULL) ORDER BY bu.collection_date ASC`, [hospitalId]); 
    ResponseHandler.success(res, { units: result.rows });
});

// Perform Cross Match - Multi-Tenant
const performCrossMatch = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { request_id, unit_id, patient_id, patient_sample_id, method, immediate_spin, incubation_37c, ags_phase, result, antibody_detected, reaction_strength, interpretation } = req.body;
    
    let aiScore = 100; 
    if (result === 'Incompatible') aiScore = 0; 
    else if (reaction_strength === 'Weak') aiScore = 75; 
    else if (reaction_strength === '1+') aiScore = 50; 
    else if (antibody_detected) aiScore = 60;
    
    const crossMatch = await db.pool.query(`INSERT INTO blood_cross_matches (request_id, unit_id, patient_id, patient_sample_id, performed_by, method, immediate_spin, incubation_37c, ags_phase, result, antibody_detected, reaction_strength, ai_compatibility_score, interpretation, valid_until, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW() + INTERVAL '72 hours', $15) RETURNING *`, [request_id, unit_id, patient_id, patient_sample_id, req.user?.id, method || 'Tube', immediate_spin, incubation_37c, ags_phase, result, antibody_detected, reaction_strength, aiScore, interpretation, hospitalId]);
    
    if (result === 'Compatible') { 
        await db.pool.query(`UPDATE blood_requests SET status = 'Cross-Matched', updated_at = NOW() WHERE id = $1 AND status = 'Approved'`, [request_id]); 
        await db.pool.query(`UPDATE blood_units SET status = 'Reserved', reserved_for_patient = $1, reserved_until = NOW() + INTERVAL '72 hours', updated_at = NOW() WHERE id = $2`, [patient_id, unit_id]); 
    }
    ResponseHandler.success(res, { message: 'Cross-match recorded', crossMatch: crossMatch.rows[0], aiCompatibilityScore: aiScore }, 201);
});

// Get Cross Matches - Multi-Tenant
const getCrossMatches = asyncHandler(async (req, res) => { 
    const { request_id } = req.params; 
    const hospitalId = getHospitalId(req); 
    const result = await db.pool.query(`SELECT cm.*, bu.unit_id as unit_code, bu.blood_group, bu.component_type_id, bct.name as component_name, u.name as performed_by_name, p.name as patient_name FROM blood_cross_matches cm LEFT JOIN blood_units bu ON cm.unit_id = bu.id LEFT JOIN blood_component_types bct ON bu.component_type_id = bct.id LEFT JOIN users u ON cm.performed_by = u.id LEFT JOIN patients p ON cm.patient_id = p.id WHERE cm.request_id = $1 AND (cm.hospital_id = $2 OR cm.hospital_id IS NULL) ORDER BY cm.performed_at DESC`, [request_id, hospitalId]); 
    ResponseHandler.success(res, { crossMatches: result.rows });
});

// Start Transfusion - Multi-Tenant
const startTransfusion = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const { unit_id, request_id, cross_match_id, patient_id, ward_id, bed_number, vitals_baseline, rate_ml_per_hour } = req.body; 
    
    const unit = await db.pool.query('SELECT * FROM blood_units WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [unit_id, hospitalId]); 
    if (unit.rows.length === 0) return ResponseHandler.error(res, 'Blood unit not found', 404); 
    
    const transfusion = await db.pool.query(`INSERT INTO blood_transfusions (unit_id, request_id, cross_match_id, patient_id, administered_by, ward_id, bed_number, start_time, vitals_baseline, rate_ml_per_hour, outcome, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, 'In Progress', $10) RETURNING *`, [unit_id, request_id, cross_match_id, patient_id, req.user?.id, ward_id, bed_number, JSON.stringify(vitals_baseline || {}), rate_ml_per_hour || 100, hospitalId]); 
    
    const transfusionId = `TF-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(transfusion.rows[0].id).padStart(4, '0')}`; 
    await db.pool.query('UPDATE blood_transfusions SET transfusion_id = $1 WHERE id = $2', [transfusionId, transfusion.rows[0].id]); 
    
    ResponseHandler.success(res, { message: 'Transfusion started', transfusionId, transfusion: { ...transfusion.rows[0], transfusion_id: transfusionId } }, 201);
});

// Update Transfusion Vitals - Multi-Tenant
const updateTransfusionVitals = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const { vitals_15min, vitals_30min, vitals_1hour, vitals_end } = req.body; 
    const hospitalId = getHospitalId(req); 
    
    let updates = []; 
    const params = []; 
    let paramCount = 0; 
    
    if (vitals_15min) { paramCount++; updates.push(`vitals_15min = $${paramCount}`); params.push(JSON.stringify(vitals_15min)); } 
    if (vitals_30min) { paramCount++; updates.push(`vitals_30min = $${paramCount}`); params.push(JSON.stringify(vitals_30min)); } 
    if (vitals_1hour) { paramCount++; updates.push(`vitals_1hour = $${paramCount}`); params.push(JSON.stringify(vitals_1hour)); } 
    if (vitals_end) { paramCount++; updates.push(`vitals_end = $${paramCount}`); params.push(JSON.stringify(vitals_end)); } 
    
    if (updates.length === 0) return ResponseHandler.error(res, 'No vitals provided', 400); 
    
    paramCount++; params.push(id); 
    paramCount++; params.push(hospitalId); 
    
    await db.pool.query(`UPDATE blood_transfusions SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount - 1} AND (hospital_id = $${paramCount} OR hospital_id IS NULL)`, params); 
    ResponseHandler.success(res, { message: 'Transfusion vitals updated' });
});

// Complete Transfusion - Multi-Tenant
const completeTransfusion = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const { vitals_end, volume_transfused, notes, outcome } = req.body; 
    const hospitalId = getHospitalId(req); 
    
    await db.pool.query(`UPDATE blood_transfusions SET end_time = NOW(), vitals_end = $1, volume_transfused = $2, notes = $3, outcome = $4, updated_at = NOW() WHERE id = $5 AND (hospital_id = $6 OR hospital_id IS NULL)`, [JSON.stringify(vitals_end || {}), volume_transfused, notes, outcome || 'Completed', id, hospitalId]); 
    ResponseHandler.success(res, { message: 'Transfusion completed' });
});

// Get Active Transfusions - Multi-Tenant
const getActiveTransfusions = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await db.pool.query(`SELECT bt.*, bu.unit_id as unit_code, bu.blood_group, bu.component_type_id, bct.name as component_name, p.name as patient_name, p.phone as patient_phone, u.name as administered_by_name FROM blood_transfusions bt LEFT JOIN blood_units bu ON bt.unit_id = bu.id LEFT JOIN blood_component_types bct ON bu.component_type_id = bct.id LEFT JOIN patients p ON bt.patient_id = p.id LEFT JOIN users u ON bt.administered_by = u.id WHERE bt.outcome = 'In Progress' AND (bt.hospital_id = $1 OR bt.hospital_id IS NULL) ORDER BY bt.start_time ASC`, [hospitalId]); 
    ResponseHandler.success(res, { transfusions: result.rows });
});

// Report Reaction - Multi-Tenant
const reportReaction = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const { transfusion_id, unit_id, patient_id, reaction_type, severity, onset_time, symptoms, vital_signs, management_given } = req.body; 
    
    const reaction = await db.pool.query(`INSERT INTO transfusion_reactions (transfusion_id, unit_id, patient_id, reported_by, reaction_type, severity, onset_time, symptoms, vital_signs, management_given, blood_bank_notified, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11) RETURNING *`, [transfusion_id, unit_id, patient_id, req.user?.id, reaction_type, severity, onset_time, JSON.stringify(symptoms || []), JSON.stringify(vital_signs || {}), management_given, hospitalId]); 
    
    await db.pool.query(`UPDATE blood_transfusions SET reaction_occurred = true, reaction_time = $1, reaction_type = $2, reaction_severity = $3, transfusion_stopped = CASE WHEN $3 IN ('Severe', 'Life-threatening') THEN true ELSE transfusion_stopped END, outcome = CASE WHEN $3 IN ('Severe', 'Life-threatening') THEN 'Stopped - Reaction' ELSE outcome END, updated_at = NOW() WHERE id = $4`, [onset_time, reaction_type, severity, transfusion_id]); 
    
    if (req.io && (severity === 'Severe' || severity === 'Life-threatening')) {
        req.io.emit('blood_bank:reaction_alert', { message: `URGENT: ${severity} transfusion reaction reported`, transfusion_id, patient_id, reaction_type });
    }
    ResponseHandler.success(res, { message: 'Reaction reported and blood bank notified', reaction: reaction.rows[0] }, 201);
});

// Get Reactions - Multi-Tenant
const getReactions = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const { patient_id, severity, limit = 50 } = req.query; 
    
    let query = `SELECT tr.*, bt.transfusion_id as transfusion_code, bu.unit_id as unit_code, bu.blood_group, p.name as patient_name, u.name as reported_by_name FROM transfusion_reactions tr LEFT JOIN blood_transfusions bt ON tr.transfusion_id = bt.id LEFT JOIN blood_units bu ON tr.unit_id = bu.id LEFT JOIN patients p ON tr.patient_id = p.id LEFT JOIN users u ON tr.reported_by = u.id WHERE (tr.hospital_id = $1 OR tr.hospital_id IS NULL)`; 
    const params = [hospitalId]; 
    let paramCount = 1; 
    
    if (patient_id) { paramCount++; query += ` AND tr.patient_id = $${paramCount}`; params.push(patient_id); } 
    if (severity) { paramCount++; query += ` AND tr.severity = $${paramCount}`; params.push(severity); } 
    
    query += ` ORDER BY tr.created_at DESC LIMIT $${paramCount + 1}`; 
    params.push(limit); 
    
    const result = await db.pool.query(query, params); 
    ResponseHandler.success(res, { reactions: result.rows });
});

// AI Features - Multi-Tenant wrapper
const BloodBankAI = require('../services/BloodBankAI');
const getDemandForecast = asyncHandler(async (req, res) => { 
    const forecast = await BloodBankAI.forecastDemand(); 
    ResponseHandler.success(res, forecast);
});
const getExpiryAnalysis = asyncHandler(async (req, res) => { 
    const analysis = await BloodBankAI.getExpiryRiskAnalysis(); 
    ResponseHandler.success(res, analysis);
});
const getDonorRecallList = asyncHandler(async (req, res) => { 
    const suggestions = await BloodBankAI.getDonorRecallSuggestions(); 
    ResponseHandler.success(res, suggestions);
});

// eRaktKosh Compliance
const ERaktKoshService = require('../services/ERaktKoshService');
const getERaktKoshInventory = asyncHandler(async (req, res) => { 
    ResponseHandler.success(res, await ERaktKoshService.getInventoryForSync());
});
const getERaktKoshDonors = asyncHandler(async (req, res) => { 
    ResponseHandler.success(res, await ERaktKoshService.getDonorsForSync(req.query.since));
});
const getERaktKoshUnits = asyncHandler(async (req, res) => { 
    ResponseHandler.success(res, await ERaktKoshService.getUnitsForSync(req.query.since));
});
const getNACOReport = asyncHandler(async (req, res) => { 
    const { month, year } = req.query; 
    ResponseHandler.success(res, await ERaktKoshService.generateNACOReport(parseInt(month) || new Date().getMonth() + 1, parseInt(year) || new Date().getFullYear()));
});
const getPublicStockAvailability = asyncHandler(async (req, res) => { 
    ResponseHandler.success(res, await ERaktKoshService.getPublicStockAvailability());
});

// Pricing & Billing
const BloodBankBilling = require('../services/BloodBankBilling');
const getPricingList = asyncHandler(async (req, res) => { 
    ResponseHandler.success(res, await BloodBankBilling.getPricingList());
});
const billTransfusion = asyncHandler(async (req, res) => { 
    const { transfusionId, unitId, patientId, admissionId, componentTypeId, additionalServices } = req.body; 
    const result = await BloodBankBilling.billTransfusion({ transfusionId, unitId, patientId, admissionId, componentTypeId, additionalServices, userId: req.user?.id }); 
    if (result.success) ResponseHandler.success(res, result); 
    else ResponseHandler.error(res, 'Billing failed', 500, result.error);
});
const checkPatientExemption = asyncHandler(async (req, res) => { 
    ResponseHandler.success(res, await BloodBankBilling.checkExemption(req.params.patient_id));
});

// Patient Integration - Multi-Tenant
const getPatientBloodProfile = asyncHandler(async (req, res) => { 
    const { patient_id } = req.params; 
    const hospitalId = getHospitalId(req); 
    
    const patient = await db.pool.query(`SELECT id, name, blood_group, blood_group_verified, blood_group_verified_date FROM patients WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)`, [patient_id, hospitalId]); 
    if (patient.rows.length === 0) return ResponseHandler.error(res, 'Patient not found', 404); 
    
    const summary = await db.pool.query(`SELECT COUNT(*) as total_transfusions, SUM(CASE WHEN reaction_occurred THEN 1 ELSE 0 END) as total_reactions, MAX(start_time) as last_transfusion FROM blood_transfusions WHERE patient_id = $1`, [patient_id]); 
    const pending = await db.pool.query(`SELECT COUNT(*) as count FROM blood_requests WHERE patient_id = $1 AND status IN ('Pending', 'Approved')`, [patient_id]); 
    
    ResponseHandler.success(res, { patient: patient.rows[0], summary: { ...summary.rows[0], pending_requests: parseInt(pending.rows[0]?.count || 0) } });
});

const getPatientTransfusionHistory = asyncHandler(async (req, res) => { 
    const { patient_id } = req.params; 
    const { limit = 20 } = req.query; 
    const hospitalId = getHospitalId(req); 
    
    const history = await db.pool.query(`SELECT bt.*, bu.unit_id as unit_code, bu.blood_group, bct.name as component_name, u.name as administered_by_name FROM blood_transfusions bt LEFT JOIN blood_units bu ON bt.unit_id = bu.id LEFT JOIN blood_component_types bct ON bu.component_type_id = bct.id LEFT JOIN users u ON bt.administered_by = u.id WHERE bt.patient_id = $1 AND (bt.hospital_id = $2 OR bt.hospital_id IS NULL) ORDER BY bt.start_time DESC LIMIT $3`, [patient_id, hospitalId, limit]); 
    const reactions = await db.pool.query(`SELECT * FROM transfusion_reactions WHERE patient_id = $1 ORDER BY created_at DESC`, [patient_id]); 
    
    ResponseHandler.success(res, { transfusions: history.rows, reactions: reactions.rows });
});

const updatePatientBloodGroup = asyncHandler(async (req, res) => { 
    const { patient_id } = req.params; 
    const { blood_group, verified } = req.body; 
    const hospitalId = getHospitalId(req); 
    
    await db.pool.query(`UPDATE patients SET blood_group = $1, blood_group_verified = $2, blood_group_verified_date = CASE WHEN $2 THEN NOW() ELSE NULL END, blood_group_verified_by = CASE WHEN $2 THEN $3 ELSE NULL END WHERE id = $4 AND (hospital_id = $5 OR hospital_id IS NULL)`, [blood_group, verified || false, req.user?.id, patient_id, hospitalId]); 
    ResponseHandler.success(res, { message: 'Blood group updated' });
});

// Surgery Integration - Multi-Tenant
const getSurgeryBloodStandards = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await db.pool.query(`SELECT * FROM surgery_blood_standards WHERE is_active = true AND (hospital_id = $1 OR hospital_id IS NULL) ORDER BY surgery_name`, [hospitalId]); 
    ResponseHandler.success(res, { standards: result.rows });
});

const createSurgeryBloodRequirement = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const { surgery_id, patient_id, blood_group_required, estimated_blood_loss_ml, prbc_units_required, ffp_units_required, platelet_units_required, cryo_units_required, notes } = req.body; 
    
    const result = await db.pool.query(`INSERT INTO surgery_blood_requirements (surgery_id, patient_id, blood_group_required, estimated_blood_loss_ml, prbc_units_required, ffp_units_required, platelet_units_required, cryo_units_required, notes, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [surgery_id, patient_id, blood_group_required, estimated_blood_loss_ml || 0, prbc_units_required || 0, ffp_units_required || 0, platelet_units_required || 0, cryo_units_required || 0, notes || null, hospitalId]); 
    
    const totalUnits = (prbc_units_required || 0) + (ffp_units_required || 0) + (platelet_units_required || 0); 
    
    if (totalUnits > 0) { 
        // Corrected columns and values: Component Type ID is likely 1 (PRBC) for this automated request
        const bloodRequest = await db.pool.query(`INSERT INTO blood_requests (patient_id, department, blood_group_required, component_type_id, units_required, priority, indication, cross_match_required, status, requested_by, hospital_id) VALUES ($1, 'OT/Surgery', $2, 1, $3, 'Routine', 'Pre-surgical blood preparation', true, 'Pending', $4, $5) RETURNING id`, [patient_id, blood_group_required, prbc_units_required || 1, req.user?.id, hospitalId]); 
        await db.pool.query('UPDATE surgery_blood_requirements SET blood_request_id = $1 WHERE id = $2', [bloodRequest.rows[0].id, result.rows[0].id]); 
    }
    ResponseHandler.success(res, { message: 'Surgery blood requirement created', requirement: result.rows[0] }, 201);
});

const getSurgeryBloodRequirement = asyncHandler(async (req, res) => { 
    const { surgery_id } = req.params; 
    const hospitalId = getHospitalId(req); 
    
    const result = await db.pool.query(`SELECT sbr.*, br.status as request_status, br.units_issued, p.name as patient_name, p.blood_group as patient_blood_group FROM surgery_blood_requirements sbr LEFT JOIN blood_requests br ON sbr.blood_request_id = br.id LEFT JOIN patients p ON sbr.patient_id = p.id WHERE sbr.surgery_id = $1 AND (sbr.hospital_id = $2 OR sbr.hospital_id IS NULL)`, [surgery_id, hospitalId]); 
    if (result.rows.length === 0) return ResponseHandler.success(res, { requirement: null }); 
    
    const prepared = await db.pool.query(`SELECT sbp.*, bu.unit_id as unit_code, bu.blood_group, bct.name as component_name FROM surgery_blood_prepared sbp LEFT JOIN blood_units bu ON sbp.unit_id = bu.id LEFT JOIN blood_component_types bct ON bu.component_type_id = bct.id WHERE sbp.surgery_blood_req_id = $1`, [result.rows[0].id]); 
    
    ResponseHandler.success(res, { requirement: result.rows[0], preparedUnits: prepared.rows });
});

const updatePreOpChecklist = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const { blood_typed_and_screened, cross_match_completed, blood_reserved, consent_signed } = req.body; 
    const hospitalId = getHospitalId(req); 
    
    await db.pool.query(`UPDATE surgery_blood_requirements SET blood_typed_and_screened = COALESCE($1, blood_typed_and_screened), cross_match_completed = COALESCE($2, cross_match_completed), blood_reserved = COALESCE($3, blood_reserved), consent_signed = COALESCE($4, consent_signed), checked_by = $5, checked_at = NOW(), status = CASE WHEN COALESCE($1, blood_typed_and_screened) AND COALESCE($2, cross_match_completed) AND COALESCE($3, blood_reserved) AND COALESCE($4, consent_signed) THEN 'Ready' ELSE 'Pending' END, updated_at = NOW() WHERE id = $6 AND (hospital_id = $7 OR hospital_id IS NULL)`, [blood_typed_and_screened, cross_match_completed, blood_reserved, consent_signed, req.user?.id, id, hospitalId]); 
    ResponseHandler.success(res, { message: 'Pre-op checklist updated' });
});

const prepareSurgeryBlood = asyncHandler(async (req, res) => { 
    const { surgery_blood_req_id, unit_id, cross_match_id } = req.body; 
    const hospitalId = getHospitalId(req); 
    
    const unit = await db.pool.query('SELECT component_type_id FROM blood_units WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [unit_id, hospitalId]); 
    const componentType = await db.pool.query('SELECT code FROM blood_component_types WHERE id = $1', [unit.rows[0]?.component_type_id]); 
    
    await db.pool.query(`UPDATE blood_units SET status = 'Reserved', reserved_until = NOW() + INTERVAL '24 hours' WHERE id = $1`, [unit_id]); 
    const result = await db.pool.query(`INSERT INTO surgery_blood_prepared (surgery_blood_req_id, unit_id, cross_match_id, component_type, prepared_by, hospital_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [surgery_blood_req_id, unit_id, cross_match_id, componentType.rows[0]?.code, req.user?.id, hospitalId]); 
    ResponseHandler.success(res, { message: 'Blood prepared for surgery', prepared: result.rows[0] }, 201);
});

module.exports = { getDonors, registerDonor, getDonorById, updateDonorEligibility, getInventorySummary, getBloodUnits, addBloodUnit, updateUnitStatus, separateComponents, getPendingRequests, createRequest, processRequest, issueBlood, getComponentTypes, getDashboardStats, recordTTIResults, getUnitsForTesting, performCrossMatch, getCrossMatches, startTransfusion, updateTransfusionVitals, completeTransfusion, getActiveTransfusions, reportReaction, getReactions, getDemandForecast, getExpiryAnalysis, getDonorRecallList, getERaktKoshInventory, getERaktKoshDonors, getERaktKoshUnits, getNACOReport, getPublicStockAvailability, getPricingList, billTransfusion, checkPatientExemption, getPatientBloodProfile, getPatientTransfusionHistory, updatePatientBloodGroup, getSurgeryBloodStandards, createSurgeryBloodRequirement, getSurgeryBloodRequirement, updatePreOpChecklist, prepareSurgeryBlood };
