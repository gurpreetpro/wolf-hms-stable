const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Admit Patient - MULTI-TENANT
const admitPatient = asyncHandler(async (req, res) => {
    const { patient_id, ward, bed_number } = req.body;
    const hospitalId = req.hospital_id;

    // Check if bed is already occupied in THIS hospital
    const bedCheck = await pool.query(
        "SELECT * FROM admissions WHERE ward = $1 AND bed_number = $2 AND status = 'Admitted' AND hospital_id = $3",
        [ward, bed_number, hospitalId]
    );

    if (bedCheck.rows.length > 0) {
        return ResponseHandler.error(res, 'Bed is already occupied', 400);
    }

    // [PHASE 3] Check actual Bed Status (Must be 'Available')
    // We must ensure the bed is not 'Dirty', 'Cleaning', or 'Maintenance'
    const bedStatusRes = await pool.query(
        "SELECT status FROM beds WHERE ward_id = (SELECT id FROM wards WHERE name = $1 AND hospital_id = $2 ORDER BY id ASC LIMIT 1) AND bed_number = $3 AND hospital_id = $2",
        [ward, hospitalId, bed_number]
    );

    if (bedStatusRes.rows.length === 0) {
        return ResponseHandler.error(res, 'Bed not found', 404);
    }
    
    if (bedStatusRes.rows[0].status !== 'Available') {
        return ResponseHandler.error(res, `Bed is not Available (Status: ${bedStatusRes.rows[0].status})`, 400);
    }

    // [FIX] Check if PATIENT is already admitted
    const patientCheck = await pool.query(
        "SELECT * FROM admissions WHERE patient_id = $1 AND status = 'Admitted' AND hospital_id = $2",
        [patient_id, hospitalId]
    );

    if (patientCheck.rows.length > 0) {
        const admission = patientCheck.rows[0];
        return ResponseHandler.error(res, `Patient is already admitted to ${admission.ward} - Bed ${admission.bed_number}`, 400);
    }

    // [NEW] Generate IPD Number
    // 1. Get Settings
    const hospitalRes = await pool.query('SELECT code, settings FROM hospitals WHERE id = $1', [hospitalId]);
    const settings = hospitalRes.rows[0]?.settings || {};
    const ipdConfig = settings.ipd_format || {};
    
    // 2. Format Logic (Default: IP-YY-XXXXX)
    const prefix = ipdConfig.prefix || 'IP';
    const seqLength = parseInt(ipdConfig.length) || 5;
    const startSequence = parseInt(ipdConfig.start_sequence) || 1; // [NEW] Custom starting number
    const currentYearShort = new Date().getFullYear().toString().slice(-2);
    
    // Construct base pattern for search
    // Standard: PREFIX-YY-
    let basePattern = `${prefix}-${currentYearShort}-`;
    
    // 3. Find all used IPD numbers and their sequences
    const allIpdRes = await pool.query(
        "SELECT ipd_number FROM admissions WHERE ipd_number LIKE $1 AND hospital_id = $2",
        [`${basePattern}%`, hospitalId]
    );
    
    // Parse used sequences
    const usedSeqs = allIpdRes.rows.map(r => {
        const parts = r.ipd_number.split('-');
        const lastPart = parts[parts.length - 1];
        return parseInt(lastPart, 10);
    }).filter(n => !isNaN(n)).sort((a, b) => a - b);
    
    // [UPDATED] Start from configured start_sequence instead of 1
    let nextSeq = startSequence;
    for (const seq of usedSeqs) {
        if (seq === nextSeq) nextSeq++;
        else if (seq > nextSeq) break;
    }
    
    const nextIpdNumber = `${basePattern}${String(nextSeq).padStart(seqLength, '0')}`;

    // Insert admission with hospital_id and IPD Number
    const result = await pool.query(
        'INSERT INTO admissions (patient_id, ward, bed_number, status, hospital_id, ipd_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [patient_id, ward, bed_number, 'Admitted', hospitalId, nextIpdNumber]
    );

    // Log Bed History
    await pool.query(
        'INSERT INTO bed_history (admission_id, ward, bed_number, action) VALUES ($1, $2, $3, $4)',
        [result.rows[0].id, ward, bed_number, 'Admitted']
    );

    // Update bed status to occupied (Scoped to Hospital's Ward)
    // [FIX] Use ILIKE for safer matching in case of case mismatches
    await pool.query(
        "UPDATE beds SET status = 'Occupied' WHERE bed_number = $1 AND ward_id = (SELECT id FROM wards WHERE name ILIKE $2 AND hospital_id = $3 LIMIT 1)",
        [bed_number, ward.trim(), hospitalId]
    );

    // [FIX] Remove from OPD Queue or Mark as Admitted
    await pool.query(
        "UPDATE opd_queue SET status = 'Admitted' WHERE patient_id = $1 AND (status = 'Waiting' OR status = 'In Consultation') AND hospital_id = $2",
        [patient_id, hospitalId]
    );

    // [FIX] Also update opd_visits to remove from Doctor Dashboard OPD list  
    // Using 'Completed' since it's an allowed status value (constraint doesn't allow 'Admitted')
    await pool.query(
        "UPDATE opd_visits SET status = 'Completed' WHERE patient_id = $1 AND (status = 'Waiting' OR status = 'In Consultation') AND visit_date = CURRENT_DATE AND hospital_id = $2",
        [patient_id, hospitalId]
    );

    // [INTEGRATION] Auto-create "Initial Nursing Assessment" task
    await pool.query(
        `INSERT INTO care_tasks (patient_id, admission_id, type, description, status, scheduled_time, hospital_id) 
         VALUES ($1, $2, 'Instruction', 'Initial Nursing Assessment (Fall Risk, Sepsis, Skin)', 'Pending', NOW() + INTERVAL '1 hour', $3)`,
        [patient_id, result.rows[0].id, hospitalId]
    );

    // [PHASE 6] Insurance Plumbing: Check & Trigger PreAuth
    try {
        const InsuranceWorkflowService = require('../services/insurance/InsuranceWorkflowService');
        await InsuranceWorkflowService.triggerPreAuthDraft(
            result.rows[0].id, 
            patient_id, 
            hospitalId
        );
    } catch (err) {
        console.error('[Admission] Insurance Linkage Failed:', err.message);
        // Non-blocking: Admission should succeed even if insurance link fails
    }

    // [G2.3] Build FHIR-compatible identifier systems
    const hospitalCode = (hospitalRes.rows[0]?.code || 'wolf').toLowerCase();

    ResponseHandler.success(res, {
        admission_id: result.rows[0].id,
        admission: result.rows[0],
        identifiers: {
            ipd: {
                value: nextIpdNumber,
                system: `urn:wolf:hms:${hospitalCode}:ipd`
            },
            uhid: {
                system: `urn:wolf:hms:${hospitalCode}:uhid`
            }
        }
    }, 'Patient admitted successfully', 201);
});


// Transfer Patient - MULTI-TENANT
const transferPatient = asyncHandler(async (req, res) => {
    const { admission_id, to_ward, to_bed } = req.body;
    const hospitalId = req.hospital_id;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get current admission details (Lock row?)
        const currentAdm = await client.query(
            'SELECT ward, bed_number FROM admissions WHERE id = $1 AND hospital_id = $2', 
            [admission_id, hospitalId]
        );

        if (currentAdm.rows.length === 0) {
            throw new Error('Admission not found');
        }

        const { ward: old_ward, bed_number: old_bed } = currentAdm.rows[0];

        // 2. Verify Target Bed Availability (Race Condition Check)
        const targetBedCheck = await client.query(
            "SELECT id FROM beds WHERE bed_number = $1 AND ward_id = (SELECT id FROM wards WHERE name = $2 AND hospital_id = $3) AND status = 'Available'",
            [to_bed, to_ward, hospitalId]
        );

        if (targetBedCheck.rows.length === 0) {
            throw new Error(`Target bed ${to_bed} in ${to_ward} is not available`);
        }

        // 3. Close current bed history
        await client.query(
            'UPDATE bed_history SET end_time = CURRENT_TIMESTAMP WHERE admission_id = $1 AND end_time IS NULL',
            [admission_id]
        );

        // 4. Update Admission
        const result = await client.query(
            'UPDATE admissions SET ward = $1, bed_number = $2 WHERE id = $3 RETURNING *',
            [to_ward, to_bed, admission_id]
        );

        // 5. Open new bed history
        await client.query(
            'INSERT INTO bed_history (admission_id, ward, bed_number, action) VALUES ($1, $2, $3, $4)',
            [admission_id, to_ward, to_bed, 'Transferred']
        );

        // 6. Update Old Bed -> Available
        // Use TRIM/ILIKE to be safe against data inconsistencies
        await client.query(
            "UPDATE beds SET status = 'Available' WHERE bed_number = $1 AND ward_id = (SELECT id FROM wards WHERE name ILIKE $2 AND hospital_id = $3)",
            [old_bed, old_ward.trim(), hospitalId]
        );

        // 7. Update New Bed -> Occupied
        await client.query(
            "UPDATE beds SET status = 'Occupied' WHERE bed_number = $1 AND ward_id = (SELECT id FROM wards WHERE name ILIKE $2 AND hospital_id = $3)",
            [to_bed, to_ward.trim(), hospitalId]
        );

        await client.query('COMMIT');
        
        ResponseHandler.success(res, { appointment: result.rows[0] }, 'Transfer Successful');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Transfer Error]', err.message);
        return ResponseHandler.error(res, err.message || 'Transfer failed', 400);
    } finally {
        client.release();
    }
});

// Discharge Patient - MULTI-TENANT
const dischargePatient = asyncHandler(async (req, res) => {
    try {
        const { admission_id } = req.body;
        const hospitalId = req.hospital_id;
    
        const BED_RATES = {
            'General': 1500, 'Semi-Private': 3000, 'Private': 5000,
            'ICU': 8000, 'NICU': 10000, 'Emergency': 3500, 'Deluxe': 7500
        };
    
        // Check for pending care tasks
        const pendingTasks = await pool.query(
            "SELECT * FROM care_tasks WHERE admission_id = $1 AND status = 'Pending'",
            [admission_id]
        );
        const pendingLabs = await pool.query(
            "SELECT * FROM lab_requests WHERE admission_id = $1 AND status = 'Pending'",
            [admission_id]
        );
    
        if (pendingTasks.rows.length > 0 || pendingLabs.rows.length > 0) {
            return ResponseHandler.error(res, 'Cannot discharge: Pending Department Clearance (Tasks/Labs)', 400);
        }
    
        // Get admission details (Verify Ownership)
        const admissionData = await pool.query(
            'SELECT ward, bed_number, patient_id, admission_date FROM admissions WHERE id = $1 AND hospital_id = $2',
            [admission_id, hospitalId]
        );
        
        if (admissionData.rows.length === 0) {
            return ResponseHandler.error(res, 'Admission not found', 404);
        }
    
        const { ward, bed_number, patient_id, admission_date } = admissionData.rows[0];
    
        // Calculate bed charges
        const ratePerDay = BED_RATES[ward] || BED_RATES['General'];
    
        // [FIX] Check for existing nightly charges (Hybrid Billing Model)
        // We check if "Nightly Charge" items already exist in the active invoice
        const { addToInvoice } = require('../services/billingService');
        const existingCharges = await pool.query(
            "SELECT SUM(quantity) as billed_days FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id WHERE i.patient_id = $1 AND i.status = 'Pending' AND ii.description LIKE '%Nightly Charge%'",
            [patient_id]
        );
    
        const billedDays = parseInt(existingCharges.rows[0]?.billed_days || 0);
        console.log(`[Discharge] Found ${billedDays} billed days for Patient ${patient_id}`);
    
        let daysToBill = 0;
        const admissionDate = new Date(admission_date);
        const dischargeDate = new Date();
    
        if (billedDays > 0) {
            // Nightly cron has been running.
            // We assume nights are paid. We only check for strict day-care or half-day logic if needed.
            // For now: If billedDays > 0, we trust the cron. 
            // Corner case: Admitted today, discharged today (billedDays=0 handles this in Else)
            daysToBill = 0;
        } else {
            // Fallback: No nightly charges found (Old admission or Same-Day Discharge)
            const hoursStayed = (dischargeDate - admissionDate) / (1000 * 60 * 60);
            daysToBill = Math.max(1, Math.ceil(hoursStayed / 24));
        }
    
        const bedCharges = daysToBill * ratePerDay;
    
        // Close bed history
        await pool.query(
            'UPDATE bed_history SET end_time = CURRENT_TIMESTAMP WHERE admission_id = $1 AND end_time IS NULL',
            [admission_id]
        );
    
        // Discharge patient
        const result = await pool.query(
            'UPDATE admissions SET status = $1, discharge_date = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            ['Discharged', admission_id]
        );
    
        // Update bed status (Scoped)
        // [PHASE 3] Operational Efficiency: Set bed status to 'Dirty' for cleaning
        // [DEBUG] Get Ward ID first to avoid subquery error and verify code update
        const wardRes = await pool.query('SELECT id FROM wards WHERE name = $1 AND hospital_id = $2 LIMIT 1', [ward, hospitalId]);
        const wardId = wardRes.rows[0]?.id;

        if (wardId) {
             console.log(`[Discharge] Setting Bed ${bed_number} (Ward ID: ${wardId}) to Dirty`);
             await pool.query(
                "UPDATE beds SET status = 'Dirty' WHERE bed_number = $1 AND ward_id = $2",
                [bed_number, wardId]
            );
        } else {
            console.warn(`[Discharge] Ward '${ward}' not found for hospital ${hospitalId}`);
        }
    
        // Create Housekeeping Task
        const dischargeDesc = `Terminal Cleaning - Bed ${bed_number} (${ward})`;
        await pool.query(
            `INSERT INTO care_tasks (patient_id, admission_id, type, description, status, scheduled_time, hospital_id)
             VALUES ($1, $2, 'Housekeeping', $3, 'Pending', NOW(), $4)`,
            [patient_id, admission_id, dischargeDesc, hospitalId]
        );
    
       // [FIX] Use Billing Service to Add Final Charges
        let invoiceId = null;
        if (daysToBill > 0) {
            const invResult = await addToInvoice(patient_id, admission_id, `${ward} Bed Charges (Final Settlement)`, daysToBill, ratePerDay, req.user.id, hospitalId);
            
            // addToInvoice returns the ID directly OR an object { covered: true ... } OR null on error
            if (invResult && typeof invResult === 'object' && invResult.covered) {
                console.log('[Discharge] Charges covered by Package/PMJAY');
                invoiceId = null; // No invoice to update
            } else if (invResult) {
                invoiceId = invResult; // It's the ID
            } else {
                console.error('[Discharge] addToInvoice failed (returned null)');
                // Fallback: Try to get pending invoice anyway
                const pendingInv = await pool.query("SELECT id FROM invoices WHERE patient_id = $1 AND status = 'Pending'", [patient_id]);
                invoiceId = pendingInv.rows[0]?.id;
            }
        } else {
            // Retrieve existing invoice ID if no new charges
            const pendingInv = await pool.query("SELECT id FROM invoices WHERE patient_id = $1 AND status = 'Pending'", [patient_id]);
            invoiceId = pendingInv.rows[0]?.id;
        }
    
        // Mark Invoice as Generated/Finalized (Ready for Payment)
        // Mark Invoice as Generated/Finalized (Ready for Payment)
        if (invoiceId) {
            try {
                await pool.query("UPDATE invoices SET status = 'Generated' WHERE id = $1", [invoiceId]);
            } catch (invErr) {
                console.warn(`[Discharge] Warning: Could not update invoice status: ${invErr.message}`);
            }
        }
    
        // [Phase H5] Check Govt Scheme Coverage & add to billing response
        let govtScheme = null;
        try {
            const InsuranceWorkflowService = require('../services/insurance/InsuranceWorkflowService');
            govtScheme = await InsuranceWorkflowService.checkGovtSchemeCoverage(patient_id);
            if (govtScheme) {
                console.log(`[Discharge] 🏛 Patient covered by ${govtScheme.scheme_code.toUpperCase()} (Card: ${govtScheme.card_number})`);
            }
        } catch (schemeErr) {
            console.warn('[Discharge] Govt scheme check non-blocking error:', schemeErr.message);
        }

        ResponseHandler.success(res, {
            admission: result.rows[0],
            billing: { ward, daysToBill, ratePerDay, bedCharges, invoiceId },
            govtScheme: govtScheme ? {
                schemeCode: govtScheme.scheme_code,
                schemeName: govtScheme.scheme_code.toUpperCase(),
                cardNumber: govtScheme.card_number,
                beneficiaryName: govtScheme.beneficiary_name
            } : null
        }, 'Patient discharged successfully');
    } catch (err) {
        console.error('[Discharge] CRITICAL ERROR:', err);
        const fs = require('fs');
        fs.writeFileSync('debug_discharge_error.log', `Error: ${err.message}\nStack: ${err.stack}\n`);
        return ResponseHandler.error(res, `Discharge Failed: ${err.message}`, 500);
    }
});

// Get Admitted Patients - MULTI-TENANT
const getAdmittedPatients = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;

    const result = await pool.query(`
        SELECT 
            a.id as admission_id, a.patient_id, a.ward, a.bed_number,
            a.status, a.admission_date as admitted_at, a.current_diet, a.last_round_at,
            p.name as patient_name, p.gender, p.dob, p.phone,
            gsb.scheme_code as govt_scheme_code,
            gsb.card_number as govt_scheme_card
        FROM admissions a
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN govt_scheme_beneficiaries gsb 
            ON gsb.patient_id = a.patient_id 
            AND gsb.verification_status = 'verified'
            AND (gsb.expiry_date IS NULL OR gsb.expiry_date > NOW())
        WHERE a.status = 'Admitted' AND a.hospital_id = $1
        ORDER BY a.admission_date DESC
    `, [hospitalId]);

    ResponseHandler.success(res, result.rows);
});

// Get Available Beds - MULTI-TENANT
const getAvailableBeds = asyncHandler(async (req, res) => {
    const { ward } = req.query;
    const hospitalId = req.hospital_id;

    let query = `
        SELECT b.id, b.bed_number, b.status, w.name as ward_name, w.id as ward_id
        FROM beds b
        JOIN wards w ON b.ward_id = w.id
        WHERE b.status = 'Available' AND w.hospital_id = $1
    `;
    let params = [hospitalId];

    if (ward) {
        query += ` AND w.name = $2 ORDER BY b.bed_number`;
        params.push(ward);
    } else {
        query += ` ORDER BY w.name, b.bed_number`;
    }

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// Get Bed History - PRODUCTION SAFE
const getBedHistory = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;

    const result = await pool.query(`
        SELECT id, admission_id, ward, bed_number, action, timestamp, end_time
        FROM bed_history
        WHERE admission_id = $1
        ORDER BY timestamp ASC
    `, [admission_id]);

    ResponseHandler.success(res, result.rows);
});

// Update Patient Diet - PRODUCTION SAFE
const updateDiet = asyncHandler(async (req, res) => {
    const { admission_id, diet } = req.body;
    
    const result = await pool.query(
        'UPDATE admissions SET current_diet = $1 WHERE id = $2 RETURNING current_diet',
        [diet, admission_id]
    );
    ResponseHandler.success(res, result.rows[0]);
});

// Mark Round as Seen - PRODUCTION SAFE
const markRoundSeen = asyncHandler(async (req, res) => {
    const { admission_id } = req.body;
    
    const result = await pool.query(
        'UPDATE admissions SET last_round_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING last_round_at',
        [admission_id]
    );
    ResponseHandler.success(res, result.rows[0]);
});

// [PHASE 5] Recovery: Backdate Admission
const backdateAdmission = asyncHandler(async (req, res) => {
    const { patient_id, ward, bed_number, backdate_timestamp } = req.body;
    const hospitalId = req.hospital_id;

    if (!backdate_timestamp) {
        return ResponseHandler.error(res, 'Backdate Timestamp is required', 400);
    }

    // 1. Verify Bed Available (Even for backdating, current bed must be free NOW to occupy it)
    // Or should backdating allow "squeezing" in? 
    // SAFEST APPROACH: Bed must be currently available to be marked as occupied now.
    // If user backdates to "Yesterday", and bed is currently occupied, this is a conflict.
    // We will enforce: Bed must be available NOW.
    const bedCheck = await pool.query(
        "SELECT status FROM beds WHERE ward_id = (SELECT id FROM wards WHERE name = $1 AND hospital_id = $2) AND bed_number = $3 AND hospital_id = $2",
        [ward, hospitalId, bed_number]
    );

    if (bedCheck.rows.length === 0 || bedCheck.rows[0].status !== 'Available') {
        return ResponseHandler.error(res, `Cannot backdate: Bed ${bed_number} is currently ${bedCheck.rows[0]?.status || 'Unknown'}. Discharge current patient first.`, 400);
    }

    // 2. Generate IPD Number (Standard Logic)
    // Uses hospital settings for IPD format
    const hospitalRes = await pool.query('SELECT settings FROM hospitals WHERE id = $1', [hospitalId]);
    const ipdConfig = hospitalRes.rows[0]?.settings?.ipd_format || {};
    const prefix = ipdConfig.prefix || 'IP';
    const seqLength = parseInt(ipdConfig.length) || 5;
    const startSequence = parseInt(ipdConfig.start_sequence) || 1; // [NEW] Custom starting number
    const basePattern = `${prefix}-${new Date(backdate_timestamp).getFullYear().toString().slice(-2)}-`; // Use BACKDATE year
    
    // Find all used IPD numbers for this pattern
    const allIpdRes = await pool.query(
        "SELECT ipd_number FROM admissions WHERE ipd_number LIKE $1 AND hospital_id = $2",
        [`${basePattern}%`, hospitalId]
    );
    
    // Parse used sequences
    const usedSeqs = allIpdRes.rows.map(r => {
        const parts = r.ipd_number.split('-');
        return parseInt(parts[parts.length - 1], 10);
    }).filter(n => !isNaN(n)).sort((a, b) => a - b);
    
    // [UPDATED] Start from configured start_sequence
    let nextSeq = startSequence;
    for (const seq of usedSeqs) {
        if (seq === nextSeq) nextSeq++;
        else if (seq > nextSeq) break;
    }
    const nextIpdNumber = `${basePattern}${String(nextSeq).padStart(seqLength, '0')}`;

    // 3. Insert with PAST Date
    const result = await pool.query(
        'INSERT INTO admissions (patient_id, ward, bed_number, status, hospital_id, ipd_number, admission_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [patient_id, ward, bed_number, 'Admitted', hospitalId, nextIpdNumber, backdate_timestamp]
    );

    // 4. Update Bed Status
    await pool.query(
        "UPDATE beds SET status = 'Occupied' WHERE bed_number = $1 AND ward_id = (SELECT id FROM wards WHERE name ILIKE $2 AND hospital_id = $3)",
        [bed_number, ward.trim(), hospitalId]
    );
    
    // 5. Open Bed History (Backdated?)
    // History should reflect reality. If admitted yesterday, history starts yesterday.
    await pool.query(
        'INSERT INTO bed_history (admission_id, ward, bed_number, action, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [result.rows[0].id, ward, bed_number, 'Admitted', backdate_timestamp]
    );

    ResponseHandler.success(res, result.rows[0], 'Admission backdated successfully');
});

// [PHASE 5] Recovery: Void Admission
const voidAdmission = asyncHandler(async (req, res) => {
    const { id } = req.params; // admission_id
    const hospitalId = req.hospital_id;

    // 1. Get Admission
    const adm = await pool.query("SELECT * FROM admissions WHERE id = $1 AND hospital_id = $2", [id, hospitalId]);
    if (adm.rows.length === 0) return ResponseHandler.error(res, 'Admission not found', 404);
    
    const { ward, bed_number, status } = adm.rows[0];

    // 2. Mark as Voided
    // Note: We use a special status 'Voided'
    await pool.query("UPDATE admissions SET status = 'Voided', discharge_date = NOW() WHERE id = $1", [id]);

    // 3. Free the Bed (if it was Admitted)
    if (status === 'Admitted') {
        await pool.query(
            "UPDATE beds SET status = 'Available' WHERE bed_number = $1 AND ward_id = (SELECT id FROM wards WHERE name ILIKE $2 AND hospital_id = $3)",
            [bed_number, ward.trim(), hospitalId]
        );
    }

    ResponseHandler.success(res, { id }, 'Admission voided successfully');
});

module.exports = { admitPatient, dischargePatient, transferPatient, getAdmittedPatients, getAvailableBeds, getBedHistory, updateDiet, markRoundSeen, backdateAdmission, voidAdmission };
