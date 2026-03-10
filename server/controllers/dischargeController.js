const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Generate Discharge Summary — Enterprise / NABH Grade
// Aggregates: Admission, Doctor Info, Lab Results, Medications, Procedures
const generateSummary = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = req.hospital_id;

    // 1. Fetch Admission + Patient + Doctor Details (with full timestamps)
    const admissionRes = await pool.query(
        `SELECT a.*, 
                a.admission_date AS admitted_at,
                p.name as patient_name, p.age, p.gender, p.uhid, p.phone, p.address,
                p.blood_group, p.dob, p.abha_id,
                d.username as doctor_name, d.registration_no as doctor_reg_no
         FROM admissions a 
         JOIN patients p ON a.patient_id = p.id 
         LEFT JOIN users d ON a.doctor_id = d.id 
         WHERE a.id = $1 AND a.hospital_id = $2`,
        [admission_id, hospitalId]
    );

    if (admissionRes.rows.length === 0) {
        return ResponseHandler.error(res, 'Admission not found', 404);
    }
    const admission = admissionRes.rows[0];

    // 2. Fetch Lab Results (with actual values)
    const labsRes = await pool.query(
        `SELECT r.test_name, r.status, res.result_json, res.created_at as completed_at, r.created_at as requested_at
         FROM lab_requests r 
         LEFT JOIN lab_results res ON r.id = res.request_id 
         WHERE r.admission_id = $1 AND r.hospital_id = $2
         ORDER BY r.created_at DESC`,
        [admission_id, hospitalId]
    );

    // 3. Fetch Medications/Prescriptions (with dosage, route, frequency, duration)
    let meds = [];
    try {
        const medsRes = await pool.query(
            `SELECT drug_name, dosage, route, frequency, duration, status 
             FROM prescriptions 
             WHERE admission_id = $1
             ORDER BY created_at DESC`, 
            [admission_id]
        );
        meds = medsRes.rows;
    } catch (e) {
        // Fallback: Try care_tasks of type Medication
        try {
            const careTasks = await pool.query(
                `SELECT description as drug_name, status, scheduled_time 
                 FROM care_tasks 
                 WHERE admission_id = $1 AND type = 'Medication'
                 ORDER BY scheduled_time DESC`,
                [admission_id]
            );
            meds = careTasks.rows;
        } catch (e2) {
            console.warn('Could not fetch medications for summary.');
        }
    }

    // 4. Fetch Procedures / Surgeries
    let procedures = [];
    try {
        const procRes = await pool.query(
            `SELECT name, procedure_name, description, performed_at, performed_by, notes, surgeon
             FROM procedures 
             WHERE admission_id = $1
             ORDER BY performed_at DESC`,
            [admission_id]
        );
        procedures = procRes.rows;
    } catch (e) {
        // Table might not exist — graceful fallback
        try {
            const careTasks = await pool.query(
                `SELECT description as procedure_name, status, completed_at as performed_at
                 FROM care_tasks 
                 WHERE admission_id = $1 AND type = 'Procedure'
                 ORDER BY completed_at DESC`,
                [admission_id]
            );
            procedures = careTasks.rows;
        } catch (e2) {
            // No procedures data available
        }
    }

    // 5. Construct Enterprise Summary Object
    const summary = {
        patient: {
            name: admission.patient_name,
            uhid: admission.uhid,
            age: admission.age,
            gender: admission.gender,
            phone: admission.phone,
            address: admission.address,
            blood_group: admission.blood_group,
            dob: admission.dob,
            abha_id: admission.abha_id,
            admitted_at: admission.admitted_at,       // Full ISO timestamp
            discharge_date: new Date().toISOString()  // Full ISO timestamp
        },
        doctor: {
            name: admission.doctor_name,
            reg_no: admission.doctor_reg_no
        },
        presenting_complaints: admission.presenting_complaints || admission.chief_complaints || null,
        provisional_diagnosis: admission.provisional_diagnosis || null,
        diagnosis: admission.diagnosis || 'To be filled',
        labs: labsRes.rows.map(l => ({
            test_name: l.test_name,
            result: l.result_json,
            status: l.status,
            completed_at: l.completed_at,
            requested_at: l.requested_at
        })),
        medications: meds,
        procedures: procedures,
        course_in_hospital: admission.hospital_course || 'Patient admitted with...',
        condition_at_discharge: admission.condition_at_discharge || 'Stable',
        discharge_type: admission.discharge_type || 'Normal',
        discharge_instructions: 'Follow up in 7 days.'
    };

    ResponseHandler.success(res, summary);
});

// Save/Finalize Discharge Summary
const saveSummary = asyncHandler(async (req, res) => {
    const { admission_id, summary_json, is_final } = req.body;
    const hospitalId = req.hospital_id;
    const doctor_id = req.user.id;

    // Check if entry exists
    const check = await pool.query("SELECT id FROM discharge_summaries WHERE admission_id = $1", [admission_id]);
    
    if (check.rows.length > 0) {
        // Update
        const result = await pool.query(
            `UPDATE discharge_summaries 
             SET summary_json = $1, is_final = $2, updated_at = NOW(), updated_by = $3 
             WHERE admission_id = $4 RETURNING *`,
            [JSON.stringify(summary_json), is_final || false, doctor_id, admission_id]
        );
        ResponseHandler.success(res, result.rows[0]);
    } else {
        // Create
        const result = await pool.query(
            `INSERT INTO discharge_summaries (admission_id, hospital_id, summary_json, is_final, created_by) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [admission_id, hospitalId, JSON.stringify(summary_json), is_final || false, doctor_id]
        );
        ResponseHandler.success(res, result.rows[0], 201);
    }
});

// Gatekeeper: Check for Bill Clearance
const checkDischargeClearance = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    
    // 1. Check Invoice Status
    // We assume key is 'Generated' or 'Paid'. 'Pending' means not ready.
    // Ideally, for discharge, it should be 'Paid' or 'Settled' or 'Credit' (Insurance).
    
    const invoiceRes = await pool.query(
        "SELECT status, total_amount, paid_amount FROM invoices WHERE admission_id = $1 ORDER BY created_at DESC LIMIT 1",
        [admission_id]
    );

    if (invoiceRes.rows.length === 0) {
        return ResponseHandler.success(res, { cleared: false, reason: 'No Invoice Generated' });
    }

    const invoice = invoiceRes.rows[0];
    const isCleared = ['Paid', 'Settled', 'Credit'].includes(invoice.status) || (parseFloat(invoice.paid_amount) >= parseFloat(invoice.total_amount));

    ResponseHandler.success(res, { 
        cleared: isCleared, 
        invoice_status: invoice.status,
        balance: parseFloat(invoice.total_amount) - parseFloat(invoice.paid_amount)
    });
});

module.exports = { generateSummary, saveSummary, checkDischargeClearance };
