const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { VITALS_THRESHOLDS } = require('../config/hmsConstants');

// Create Care Task (Prescribe/Order) - PRODUCTION SAFE (no hospital_id)
const createCareTask = asyncHandler(async (req, res) => {
    const { patient_id, admission_id, type, description, scheduled_time } = req.body;
    const doctor_id = req.user.id;

    const result = await pool.query(
        'INSERT INTO care_tasks (patient_id, admission_id, doctor_id, type, description, scheduled_time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [patient_id, admission_id, doctor_id, type, description, scheduled_time || new Date()]
    );

    if (req.io) req.io.emit('clinical_update', { type: 'new_task', admission_id });
    ResponseHandler.success(res, result.rows[0], 'Care task created', 201);
});

// Get Tasks (For Nurse/Doctor) - PRODUCTION SAFE
const getTasks = asyncHandler(async (req, res) => {
    const { admission_id, status } = req.query;

    let query = 'SELECT * FROM care_tasks WHERE 1=1';
    const params = [];

    if (admission_id) {
        params.push(admission_id);
        query += ` AND admission_id = $${params.length}`;
    }
    if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
    }
    query += ' ORDER BY scheduled_time ASC';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// Complete Task - PRODUCTION SAFE
const completeTask = asyncHandler(async (req, res) => {
    const { task_id } = req.body;
    const user_id = req.user.id;

    const result = await pool.query(
        'UPDATE care_tasks SET status = $1, completed_at = CURRENT_TIMESTAMP, completed_by = $2 WHERE id = $3 RETURNING *',
        ['Completed', user_id, task_id]
    );

    if (req.io) req.io.emit('clinical_update', { type: 'task_completed', task_id });
    ResponseHandler.success(res, result.rows[0]);
});

// Acknowledge Task - For Nurse to confirm receipt of doctor order
const acknowledgeTask = asyncHandler(async (req, res) => {
    const { task_id } = req.body;
    const user_id = req.user.id;
    const user_name = req.user.username || req.user.name || 'Nurse';

    // First, ensure acknowledged_at column exists (auto-migration)
    try {
        await pool.query(`
            ALTER TABLE care_tasks 
            ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS acknowledged_by INT,
            ADD COLUMN IF NOT EXISTS acknowledged_by_name VARCHAR(255)
        `);
    } catch (e) {
        // Column may already exist, ignore error
    }

    const result = await pool.query(
        `UPDATE care_tasks 
         SET acknowledged_at = CURRENT_TIMESTAMP, 
             acknowledged_by = $1, 
             acknowledged_by_name = $2 
         WHERE id = $3 
         RETURNING *`,
        [user_id, user_name, task_id]
    );

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Task not found', 404);
    }

    if (req.io) {
        req.io.emit('clinical_update', { type: 'task_acknowledged', task_id });
        req.io.emit('order_acknowledged', { task_id, acknowledged_by: user_name });
    }

    ResponseHandler.success(res, result.rows[0], 'Order acknowledged');
});

/**
 * @swagger
 * /clinical/vitals:
 *   post:
 *     summary: Log patient vitals
 *     tags: [Clinical]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *             properties:
 *               admission_id:
 *                 type: integer
 *               patient_id:
 *                 type: integer
 *               bp:
 *                 type: string
 *                 example: "120/80"
 *               temp:
 *                 type: number
 *                 example: 98.6
 *               spo2:
 *                 type: integer
 *                 example: 98
 *               heart_rate:
 *                 type: integer
 *                 example: 72
 *     responses:
 *       201:
 *         description: Vitals logged successfully
 *       400:
 *         description: Invalid input
 */
const ClinicalService = require('../services/clinicalService');

// ... (other imports)

// Log Vitals - PRODUCTION SAFE
const logVitals = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, bp, temp, spo2, heart_rate } = req.body;
    const user_id = req.user.id;

    const { vitalsLog, alerts } = await ClinicalService.logVitals({
        admission_id, 
        patient_id, 
        bp, 
        temp, 
        spo2, 
        heart_rate, 
        user_id
    });

    if (admission_id && req.io) {
        req.io.emit('clinical_update', { type: 'vitals_logged', admission_id });
        alerts.forEach(alert => req.io.emit('clinical_alert', alert));
    }

    ResponseHandler.success(res, vitalsLog, 'Vitals logged successfully', 201);
});

// Get vitals by patient - LEGACY ID SUPPORT
const getVitalsByPatient = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;

    // Disabled strict UUID check to support legacy imported patients
    // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // if (!uuidRegex.test(patient_id)) {
    //     return ResponseHandler.error(res, 'Invalid patient ID format', 400);
    // }

    const result = await pool.query(`
        SELECT * FROM vitals_logs 
        WHERE patient_id::text = $1 
            OR admission_id IN (SELECT id FROM admissions WHERE patient_id::text = $1)
        ORDER BY recorded_at DESC LIMIT 10
    `, [patient_id]);

    ResponseHandler.success(res, result.rows);
});

// Prescribe - PRODUCTION SAFE
const prescribe = asyncHandler(async (req, res) => {
    const { patient_id, admission_id, medications } = req.body;
    const doctor_id = req.user.id;

    const tasks = [];
    for (const med of medications) {
        const description = `${med.name} - ${med.dose} - ${med.freq}`;
        const result = await pool.query(
            'INSERT INTO care_tasks (patient_id, admission_id, doctor_id, type, description, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [patient_id, admission_id, doctor_id, 'Medication', description, 'Pending']
        );
        tasks.push(result.rows[0]);
    }

    if (req.io) {
        req.io.emit('pharmacy_update', { type: 'new_prescription', patient_id });
        req.io.emit('clinical_update', { type: 'new_prescription', patient_id });
    }

    ResponseHandler.success(res, { message: 'Prescription created', tasks }, 'Prescription created', 201);
});

// Save consultation - PRODUCTION SAFE
const saveConsultation = asyncHandler(async (req, res) => {
    const { visit_id, diagnosis, prescriptions, lab_requests } = req.body;
    const user_id = req.user.id;

    await pool.query('UPDATE opd_visits SET status = $1 WHERE id = $2', ['Completed', visit_id]);

    const visitResult = await pool.query('SELECT patient_id FROM opd_visits WHERE id = $1', [visit_id]);
    const patient_id = visitResult.rows[0]?.patient_id;

    if (!patient_id) return ResponseHandler.error(res, 'Visit not found', 404);

    if (diagnosis) {
        await pool.query(`
            UPDATE patients SET history_json = COALESCE(history_json, '{}'::jsonb) || jsonb_build_object(
                'last_diagnosis', $1::text, 'last_visit_date', NOW()
            ) WHERE id = $2
        `, [diagnosis, patient_id]);
    }

    // [FIX] Sync Prescriptions for Home Orders (Wolf Care App)
    if (prescriptions && Array.isArray(prescriptions) && prescriptions.length > 0) {
        
        // 1. Create Care Tasks (Nurse/History)
        for (const rx of prescriptions) {
            if (rx.name) {
                await pool.query(`
                    INSERT INTO care_tasks (patient_id, type, description, scheduled_time, status, doctor_id)
                    VALUES ($1, 'Medication', $2, NOW(), 'Pending', $3)
                `, [patient_id, `${rx.name} - ${rx.dose || 'N/A'} - ${rx.freq || 'N/A'}`, user_id]);
            }
        }

        // 2. [NEW] Create Master Prescription Record (For Orders)
        try {
            await pool.query(`
                INSERT INTO prescriptions (
                    patient_id, doctor_id, visit_id, diagnosis, medications, notes, is_active, hospital_id
                ) VALUES ($1, $2, $3, $4, $5, $6, true, $7)
            `, [
                patient_id, 
                user_id, 
                visit_id, 
                diagnosis || 'Consultation', 
                JSON.stringify(prescriptions),
                'Generated from OPD Consultation',
                req.hospitalId || req.user.hospital_id || 1
            ]);
            console.log('✅ Created master prescription record for visit:', visit_id);
        } catch (rxErr) {
            console.error('❌ Failed to create master prescription:', rxErr.message);
        }

        if (req.io) req.io.emit('pharmacy_update', { type: 'new_prescription', patient_id });
    }

    if (lab_requests && Array.isArray(lab_requests) && lab_requests.length > 0) {
        for (const test_name of lab_requests) {
            if (test_name) {
                const typeRes = await pool.query('SELECT id FROM lab_test_types WHERE name = $1', [test_name]);
                const test_type_id = typeRes.rows.length > 0 ? typeRes.rows[0].id : null;
                await pool.query(`
                    INSERT INTO lab_requests (patient_id, test_name, test_type_id, status, doctor_id, requested_at)
                    VALUES ($1, $2, $3, 'Pending', $4, NOW())
                `, [patient_id, test_name, test_type_id, user_id]);
            }
        }
        if (req.io) req.io.emit('lab_update', { type: 'new_lab_request', patient_id });
    }

    if (req.io) {
        req.io.emit('opd_update', { type: 'consultation_completed', visit_id });
        req.io.emit('clinical_update', { type: 'consultation_completed', patient_id });
    }

    ResponseHandler.success(res, { message: 'Consultation saved successfully' });
});

// Get patient history - PRODUCTION SAFE
const getPatientHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await pool.query(`
        SELECT opd.visit_date as date, opd.complaint, p.history_json->>'last_diagnosis' as diagnosis, 'OPD Visit' as visit_type
        FROM opd_visits opd
        JOIN patients p ON opd.patient_id = p.id
        WHERE opd.patient_id = $1 AND opd.status = 'Completed'
        ORDER BY opd.visit_date DESC LIMIT 10
    `, [id]);

    ResponseHandler.success(res, result.rows);
});

// SOAP Notes - PRODUCTION SAFE
const createSOAPNote = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, subjective, objective, assessment, plan, note_type, doctor_name } = req.body;
    const doctor_id = req.user.id;

    const result = await pool.query(
        `INSERT INTO soap_notes (admission_id, patient_id, subjective, objective, assessment, plan, note_type, doctor_id, doctor_name) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [admission_id, patient_id, subjective, objective, assessment, plan, note_type || 'Progress', doctor_id, doctor_name]
    );
    ResponseHandler.success(res, result.rows[0], 'SOAP note created', 201);
});

const getSOAPNotes = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    
    const result = await pool.query(
        'SELECT * FROM soap_notes WHERE admission_id = $1 ORDER BY created_at DESC',
        [admission_id]
    );
    ResponseHandler.success(res, result.rows);
});

// Round Notes - PRODUCTION SAFE
const createRoundNote = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, status, notes, vitals_reviewed, labs_reviewed, doctor_name } = req.body;
    const doctor_id = req.user.id;

    const result = await pool.query(
        `INSERT INTO round_notes (admission_id, patient_id, status, notes, vitals_reviewed, labs_reviewed, doctor_id, doctor_name) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [admission_id, patient_id, status, notes, vitals_reviewed, labs_reviewed, doctor_id, doctor_name]
    );
    ResponseHandler.success(res, result.rows[0], 'Round note created', 201);
});

const getRoundNotes = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    
    const result = await pool.query(
        'SELECT * FROM round_notes WHERE admission_id = $1 ORDER BY created_at DESC',
        [admission_id]
    );
    ResponseHandler.success(res, result.rows);
});

// Order Single Medication (CPOE) - For IPD Panel
const orderMedication = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, drug_name, drug_id, dosage, frequency, route, duration, instructions, is_prn, prn_reason, description } = req.body;
    const doctor_id = req.user.id;
    const hospitalId = req.hospital_id;

    // Create care task for nurse
    const taskResult = await pool.query(
        `INSERT INTO care_tasks (patient_id, admission_id, doctor_id, type, description, scheduled_time, status, hospital_id)
         VALUES ($1, $2, $3, 'Medication', $4, NOW(), 'Pending', $5) RETURNING *`,
        [patient_id, admission_id, doctor_id, description, hospitalId]
    );

    // Also insert into prescriptions table if it exists
    try {
        await pool.query(
            `INSERT INTO prescriptions (patient_id, admission_id, drug_name, dosage, frequency, route, duration, instructions, is_prn, prn_reason, prescribed_by, hospital_id, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)`,
            [patient_id, admission_id, drug_name, dosage, frequency, route, duration, instructions, is_prn || false, prn_reason, doctor_id, hospitalId]
        );
    } catch (e) {
        console.log('[orderMedication] prescriptions table insert failed (may not exist):', e.message);
    }

    if (req.io) {
        req.io.emit('clinical_update', { type: 'medication_ordered', admission_id });
        req.io.emit('pharmacy_update', { type: 'new_medication_order', patient_id });
    }

    ResponseHandler.success(res, taskResult.rows[0], 'Medication ordered successfully', 201);
});

// Order Lab Test (CPOE) - For IPD Panel
const orderLabTest = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, test_type_id, test_name, priority, notes } = req.body;
    const doctor_id = req.user.id;
    const hospitalId = req.hospitalId || req.user?.hospital_id || 1;

    const result = await pool.query(
        `INSERT INTO lab_requests (admission_id, patient_id, doctor_id, test_type_id, test_name, priority, status, notes, requested_at, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, NOW(), $8) RETURNING *`,
        [admission_id, patient_id, doctor_id, test_type_id, test_name, priority || 'Routine', notes, hospitalId]
    );

    if (req.io) {
        req.io.emit('clinical_update', { type: 'lab_ordered', admission_id });
        req.io.emit('lab_update', { type: 'new_lab_request', patient_id });
    }

    ResponseHandler.success(res, result.rows[0], 'Lab test ordered successfully', 201);
});

// Request Vital Monitoring - For IPD Panel (Phase 2)
const requestVitals = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, vital_type, frequency, duration, notes } = req.body;
    const doctor_id = req.user.id;
    const hospitalId = req.hospitalId || req.user?.hospital_id || 1;

    // Create a care task for the nurse to track
    const description = `Monitor ${vital_type} ${frequency} for ${duration}${notes ? ` - ${notes}` : ''}`;
    
    const result = await pool.query(
        `INSERT INTO care_tasks (patient_id, admission_id, doctor_id, type, description, scheduled_time, status, hospital_id)
         VALUES ($1, $2, $3, 'Vital Check', $4, NOW(), 'Pending', $5) RETURNING *`,
        [patient_id, admission_id, doctor_id, description, hospitalId]
    );

    // Also try to insert into vital_requests table if it exists
    try {
        await pool.query(
            `INSERT INTO vital_requests (admission_id, patient_id, requested_by, vital_type, frequency, duration, notes, status, hospital_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', $8)`,
            [admission_id, patient_id, doctor_id, vital_type, frequency, duration, notes, hospitalId]
        );
    } catch (e) {
        console.log('[requestVitals] vital_requests table insert failed (may not exist):', e.message);
    }

    if (req.io) {
        req.io.emit('clinical_update', { type: 'vitals_requested', admission_id });
        req.io.emit('nurse_alert', { type: 'vital_monitoring_request', patient_id, vital_type, frequency });
    }

    ResponseHandler.success(res, result.rows[0], 'Vital monitoring requested successfully', 201);
});

// [NEW] Record Procedure (Billing Integration) - For IPD/OT
const recordProcedure = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, procedure_id, notes } = req.body;
    const doctor_id = req.user.id;
    const hospitalId = req.hospitalId || req.user?.hospital_id || 1;

    // 1. Get Procedure Details (Price)
    const procRes = await pool.query('SELECT * FROM procedures WHERE id = $1', [procedure_id]);
    if (procRes.rows.length === 0) return ResponseHandler.error(res, 'Procedure not found', 404);
    
    const procedure = procRes.rows[0];
    const price = parseFloat(procedure.price || 0);

    // 2. Add to Invoice immediately (No leakage)
    const { addToInvoice } = require('../services/billingService');
    await addToInvoice(patient_id, admission_id, `Procedure: ${procedure.name}`, 1, price, doctor_id, hospitalId);

    // 3. Record as Completed Care Task (Clinical History)
    const description = `Performed Procedure: ${procedure.name}${notes ? ` - ${notes}` : ''}`;
    const result = await pool.query(
        `INSERT INTO care_tasks (patient_id, admission_id, doctor_id, type, description, scheduled_time, completed_at, completed_by, status, hospital_id)
         VALUES ($1, $2, $3, 'Procedure', $4, NOW(), NOW(), $5, 'Completed', $6) RETURNING *`,
        [patient_id, admission_id, doctor_id, description, doctor_id, hospitalId]
    );

    if (req.io) {
        req.io.emit('clinical_update', { type: 'procedure_recorded', admission_id });
    }

    ResponseHandler.success(res, result.rows[0], 'Procedure recorded and billed successfully', 201);
});

module.exports = {
    createCareTask, getTasks, completeTask, acknowledgeTask, logVitals, getVitalsByPatient,
    prescribe, saveConsultation, getPatientHistory,
    createSOAPNote, getSOAPNotes, createRoundNote, getRoundNotes,
    orderMedication, orderLabTest, requestVitals, recordProcedure
};
