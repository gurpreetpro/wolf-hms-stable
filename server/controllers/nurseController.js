const pool = require('../config/db');
const { calculateNEWS2, checkSepsisRisk } = require('../services/RiskCalculator');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { addToInvoice } = require('../services/billingService');

// ==================== CARE PLANS - PRODUCTION SAFE (no hospital_id) ====================

const createCarePlan = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, diagnosis, goal, interventions } = req.body;
    const user_id = req.user.id;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `INSERT INTO nursing_care_plans (admission_id, patient_id, diagnosis, goal, interventions, created_by, updated_by, hospital_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $6, $7) RETURNING *`,
        [admission_id, patient_id, diagnosis, goal, interventions, user_id, hospitalId]
    );
    ResponseHandler.success(res, { carePlan: result.rows[0] }, 'Care plan created', 201);
});

const getCarePlan = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        'SELECT * FROM nursing_care_plans WHERE admission_id = $1 AND hospital_id = $2 ORDER BY updated_at DESC LIMIT 1',
        [admission_id, hospitalId]
    );
    ResponseHandler.success(res, { carePlan: result.rows[0] || null });
});

const updateCarePlan = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { diagnosis, goal, interventions, status } = req.body;
    const user_id = req.user.id;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `UPDATE nursing_care_plans 
            SET diagnosis = $1, goal = $2, interventions = $3, status = $4, updated_by = $5, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $6 AND hospital_id = $7 RETURNING *`,
        [diagnosis, goal, interventions, status, user_id, id, hospitalId]
    );
    ResponseHandler.success(res, { carePlan: result.rows[0] }, 'Care plan updated');
});

// ==================== PAIN SCORES - PRODUCTION SAFE ====================

const logPainScore = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, score, location, notes } = req.body;
    const user_id = req.user.id;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `INSERT INTO pain_scores (admission_id, patient_id, score, location, notes, recorded_by, hospital_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [admission_id, patient_id, score, location, notes, user_id, hospitalId]
    );
    ResponseHandler.success(res, { painScore: result.rows[0] }, 'Pain score logged', 201);
});

const getPainScores = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        'SELECT * FROM pain_scores WHERE admission_id = $1 AND hospital_id = $2 ORDER BY recorded_at DESC LIMIT 10',
        [admission_id, hospitalId]
    );
    ResponseHandler.success(res, { painScores: result.rows });
});

// ==================== FLUID BALANCE - PRODUCTION SAFE ====================

const logFluidBalance = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, type, subtype, volume_ml, notes } = req.body;
    const user_id = req.user.id;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `INSERT INTO fluid_balance (admission_id, patient_id, type, subtype, volume_ml, notes, recorded_by, hospital_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [admission_id, patient_id, type, subtype, volume_ml, notes, user_id, hospitalId]
    );
    ResponseHandler.success(res, { entry: result.rows[0] }, 'Fluid balance logged', 201);
});

const getFluidBalance = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `SELECT * FROM fluid_balance 
            WHERE admission_id = $1 AND recorded_at > NOW() - INTERVAL '24 hours' AND hospital_id = $2
            ORDER BY recorded_at DESC`,
        [admission_id, hospitalId]
    );

    const intake = result.rows.filter(r => r.type === 'Intake').reduce((sum, r) => sum + parseInt(r.volume_ml), 0);
    const output = result.rows.filter(r => r.type === 'Output').reduce((sum, r) => sum + parseInt(r.volume_ml), 0);
    const netBalance = intake - output;

    ResponseHandler.success(res, { entries: result.rows, intake, output, netBalance });
});

// ==================== IV LINES - PRODUCTION SAFE ====================

const insertIVLine = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, site, gauge, notes } = req.body;
    const user_id = req.user.id;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `INSERT INTO iv_lines (admission_id, patient_id, site, gauge, notes, inserted_by, hospital_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [admission_id, patient_id, site, gauge, notes, user_id, hospitalId]
    );
    ResponseHandler.success(res, { ivLine: result.rows[0] }, 'IV line inserted', 201);
});

const getIVLines = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        'SELECT * FROM iv_lines WHERE admission_id = $1 AND hospital_id = $2 ORDER BY inserted_at DESC',
        [admission_id, hospitalId]
    );
    ResponseHandler.success(res, { ivLines: result.rows });
});

const removeIVLine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `UPDATE iv_lines 
            SET status = 'Removed', removed_at = CURRENT_TIMESTAMP, removed_by = $1 
            WHERE id = $2 AND hospital_id = $3 RETURNING *`,
        [user_id, id, hospitalId]
    );
    ResponseHandler.success(res, { ivLine: result.rows[0] }, 'IV line removed');
});

// ==================== WARD OVERVIEW - PRODUCTION SAFE ====================

const getWardOverview = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;

    const admissions = await pool.query(`
        SELECT 
            a.id AS admission_id, a.ward, a.bed_number, a.status, a.admission_date,
            p.id AS patient_id, p.name AS patient_name, p.gender, p.dob
        FROM admissions a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.status = 'Admitted' AND a.hospital_id = $1
        ORDER BY a.ward, a.bed_number
    `, [hospitalId]);

    const admissionsWithScores = await Promise.all(admissions.rows.map(async (adm) => {
        try {
            const vitalsResult = await pool.query(
                `SELECT bp, temp, spo2, heart_rate, recorded_at 
                    FROM vitals_logs WHERE patient_id = $1
                    ORDER BY recorded_at DESC LIMIT 1`,
                [adm.patient_id]
            );

            if (vitalsResult.rows.length > 0) {
                const vitals = vitalsResult.rows[0];
                const news2 = calculateNEWS2(vitals);
                const sepsisCheck = checkSepsisRisk(vitals);
                return {
                    ...adm, latestVitals: vitals,
                    news2Score: news2.score, news2Risk: news2.riskLevel, news2Color: news2.riskColor,
                    sepsisRisk: sepsisCheck.isSepsisRisk
                };
            }
            return { ...adm, news2Score: null, news2Risk: 'Unknown', news2Color: 'secondary' };
        } catch (err) {
            return { ...adm, news2Score: null, news2Risk: 'Unknown', news2Color: 'secondary' };
        }
    }));

    const tasks = await pool.query(`
        SELECT ct.id, a.id AS admission_id, ct.type, ct.description, ct.status, ct.scheduled_time,
                p.name AS patient_name, a.bed_number, a.ward
        FROM care_tasks ct
        JOIN patients p ON ct.patient_id = p.id
        JOIN admissions a ON p.id = a.patient_id
        WHERE ct.status IN ('Pending', 'Overdue') AND a.status = 'Admitted' AND a.hospital_id = $1
        ORDER BY ct.scheduled_time ASC LIMIT 20
    `, [hospitalId]);

    ResponseHandler.success(res, { admissions: admissionsWithScores, tasks: tasks.rows });
});

// ==================== BCMA (BARCODE MEDICATION ADMIN) - PHASE 2 ====================

const administerMedication = asyncHandler(async (req, res) => {
    const { task_id, scanned_barcode, force_override } = req.body;
    const nurse_id = req.user.id;
    const hospitalId = req.hospital_id;

    // 1. Fetch Task
    const taskRes = await pool.query(
        'SELECT * FROM care_tasks WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)',
        [task_id, hospitalId]
    );

    if (taskRes.rows.length === 0) return ResponseHandler.error(res, 'Task not found', 404);
    const task = taskRes.rows[0];

    if (task.type !== 'Medication') return ResponseHandler.error(res, 'This task is not a medication order', 400);
    if (task.status === 'Completed') return ResponseHandler.error(res, 'Medication already administered', 400);

    // 2. Check Pharmacy Verification
    if (task.pharmacy_status !== 'Verified' && !force_override) {
        return ResponseHandler.error(res, 'CLMA BLOCK: Pharmacy has NOT verified this medication yet.', 403, { 
            code: 'PHARMACY_NOT_VERIFIED',
            message: 'Please contact pharmacy' 
        });
    }

    // 3. Verify Barcode
    const drugName = task.description.split(' - ')[0].trim();
    const itemRes = await pool.query(
        'SELECT * FROM inventory_items WHERE barcode = $1 AND (hospital_id = $2 OR hospital_id IS NULL)',
        [scanned_barcode, hospitalId]
    );

    if (itemRes.rows.length === 0) {
        return ResponseHandler.error(res, 'Unknown Barcode', 400);
    }

    const scannedItem = itemRes.rows[0];

    // Simple Name Match (Case Insensitive)
    if (scannedItem.name.toLowerCase() !== drugName.toLowerCase() && !force_override) {
        return ResponseHandler.error(res, `WRONG MEDICATION: Scanned '${scannedItem.name}', expected '${drugName}'`, 409, {
            code: 'WRONG_DRUG',
            expected: drugName,
            scanned: scannedItem.name
        });
    }

    // 4. Administer (Complete Task)
    await pool.query(
        `UPDATE care_tasks 
         SET status = 'Completed', 
             completed_by = $1, 
             completed_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [nurse_id, task_id]
    );

    ResponseHandler.success(res, { status: 'Completed', scanned_item: scannedItem.name }, 'Medication Administered Successfully');
});

// ==================== CONSUMABLES - PRODUCTION SAFE ====================

const recordConsumable = asyncHandler(async (req, res) => {
    const { admission_id, consumable_id, quantity, notes } = req.body;
    const user_id = req.user.id;
    const hospitalId = req.hospital_id;

    // [BILLING FIX] Get consumable details for billing
    const conInfo = await pool.query('SELECT name, price FROM ward_consumables WHERE id = $1', [consumable_id]);
    const consumable = conInfo.rows[0];
    const unitPrice = parseFloat(consumable?.price) || 0;

    // Update stock
    await pool.query('UPDATE ward_consumables SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND hospital_id = $3', [quantity, consumable_id, hospitalId]);

    // Record usage in patient_consumables
    const result = await pool.query(
        `INSERT INTO patient_consumables (admission_id, consumable_id, quantity, notes, recorded_by, hospital_id) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [admission_id, consumable_id, quantity, notes, user_id, hospitalId]
    );

    // [BILLING FIX] Add to invoice for real-time billing
    const admRes = await pool.query('SELECT patient_id FROM admissions WHERE id = $1', [admission_id]);
    const patientId = admRes.rows[0]?.patient_id;
    if (patientId && unitPrice > 0) {
        await addToInvoice(patientId, admission_id, `Consumable: ${consumable?.name || 'Unknown'}`, quantity, unitPrice, user_id, hospitalId);
        console.log(`[Nurse Billing] Consumable ${consumable?.name} (Rs.${unitPrice} x ${quantity}) added to invoice for admission ${admission_id}`);
    }

    ResponseHandler.success(res, { entry: result.rows[0] }, 'Consumable recorded', 201);
});

const getPatientConsumables = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = req.hospital_id;
    
    const result = await pool.query(`
        SELECT pc.*, wc.name, wc.price, wc.category, u.username as recorded_by_name
        FROM patient_consumables pc
        JOIN ward_consumables wc ON pc.consumable_id = wc.id
        LEFT JOIN users u ON pc.recorded_by = u.id
        WHERE pc.admission_id = $1 AND pc.hospital_id = $2
        ORDER BY pc.recorded_at DESC
    `, [admission_id, hospitalId]);
    ResponseHandler.success(res, { consumables: result.rows });
});

// ==================== SHIFT HANDOVER - PRODUCTION SAFE ====================

const getShiftHandover = asyncHandler(async (req, res) => {
    const { ward, shift } = req.query;
    const hospitalId = req.hospital_id;
    
    const wardFilter = ward === 'All' ? '%' : ward;

    // Determine shift time window (for performance metrics)
    const now = new Date();
    let shiftStart, shiftEnd;
    const hour = now.getHours();
    
    if (shift === 'night' || (hour >= 23 || hour < 7)) {
        shiftStart = new Date(now); shiftStart.setHours(23, 0, 0, 0);
        if (hour < 7) shiftStart.setDate(shiftStart.getDate() - 1);
        shiftEnd = new Date(shiftStart); shiftEnd.setHours(31, 0, 0, 0);
    } else if (shift === 'evening' || (hour >= 15 && hour < 23)) {
        shiftStart = new Date(now); shiftStart.setHours(15, 0, 0, 0);
        shiftEnd = new Date(shiftStart); shiftEnd.setHours(23, 0, 0, 0);
    } else {
        shiftStart = new Date(now); shiftStart.setHours(7, 0, 0, 0);
        shiftEnd = new Date(shiftStart); shiftEnd.setHours(15, 0, 0, 0);
    }

    // Phase 3: Include history_json for ISBAR (allergies, blood group, UHID)
    const patientsQuery = await pool.query(`
        SELECT 
            a.id AS admission_id, a.bed_number, a.ward, p.name AS patient_name, p.id AS patient_id,
            a.diagnosis, a.notes, p.dob, p.gender, p.history_json,
            (SELECT bp || ' | ' || heart_rate || 'bpm' FROM vitals_logs WHERE patient_id = p.id ORDER BY recorded_at DESC LIMIT 1) as last_vitals,
            (SELECT COUNT(*) FROM iv_lines WHERE admission_id = a.id AND status = 'Active') as active_iv_lines
        FROM admissions a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.status = 'Admitted' AND a.ward LIKE $1 AND a.hospital_id = $2
        ORDER BY a.bed_number
    `, [wardFilter, hospitalId]);

    const patients = patientsQuery.rows;

    // ========== OPTIMIZED: Batch all per-patient queries (was N+1, now 6 total) ==========
    const admissionIds = patients.map(p => p.admission_id);
    const patientIds = patients.map(p => p.patient_id);

    // Skip batch queries if no patients
    let sbarMap = {}, sbarCountMap = {}, vitalsMap = {}, painMap = {}, fallMap = {}, codeMap = {};

    if (admissionIds.length > 0) {
        // 1. Batch: Latest SBAR per admission (DISTINCT ON)
        try {
            const sbarRes = await pool.query(
                `SELECT DISTINCT ON (admission_id) * FROM shift_handoff_notes 
                 WHERE admission_id = ANY($1) AND hospital_id = $2 
                 ORDER BY admission_id, created_at DESC`,
                [admissionIds, hospitalId]
            );
            sbarRes.rows.forEach(r => { sbarMap[r.admission_id] = r; });
        } catch (e) { /* graceful */ }

        // 2. Batch: SBAR count per admission
        try {
            const countRes = await pool.query(
                `SELECT admission_id, COUNT(*) as count FROM shift_handoff_notes 
                 WHERE admission_id = ANY($1) AND hospital_id = $2 
                 GROUP BY admission_id`,
                [admissionIds, hospitalId]
            );
            countRes.rows.forEach(r => { sbarCountMap[r.admission_id] = Number.parseInt(r.count || 0); });
        } catch (e) { /* graceful */ }

        // 3. Batch: Latest vitals per patient (DISTINCT ON)
        try {
            const vitalsRes = await pool.query(
                `SELECT DISTINCT ON (patient_id) patient_id, bp, temp, spo2, heart_rate, respiratory_rate, recorded_at 
                 FROM vitals_logs WHERE patient_id = ANY($1)
                 ORDER BY patient_id, recorded_at DESC`,
                [patientIds]
            );
            vitalsRes.rows.forEach(r => { vitalsMap[r.patient_id] = r; });
        } catch (e) { /* graceful */ }

        // 4. Batch: Latest pain score per admission (DISTINCT ON)
        try {
            const painRes = await pool.query(
                `SELECT DISTINCT ON (admission_id) admission_id, score 
                 FROM pain_scores WHERE admission_id = ANY($1) AND hospital_id = $2
                 ORDER BY admission_id, recorded_at DESC`,
                [admissionIds, hospitalId]
            );
            painRes.rows.forEach(r => { painMap[r.admission_id] = r.score; });
        } catch (e) { /* graceful */ }

        // 5. Batch: Latest fall risk per admission (DISTINCT ON)
        try {
            const fallRes = await pool.query(
                `SELECT DISTINCT ON (admission_id) admission_id, score, risk_level 
                 FROM fall_risk_assessments WHERE admission_id = ANY($1) AND hospital_id = $2
                 ORDER BY admission_id, assessed_at DESC`,
                [admissionIds, hospitalId]
            );
            fallRes.rows.forEach(r => { fallMap[r.admission_id] = r; });
        } catch (e) { /* graceful */ }

        // 6. Batch: Code status from admissions
        try {
            const codeRes = await pool.query(
                `SELECT id, code_status FROM admissions WHERE id = ANY($1) AND hospital_id = $2`,
                [admissionIds, hospitalId]
            );
            codeRes.rows.forEach(r => { if (r.code_status) codeMap[r.id] = r.code_status; });
        } catch (e) { /* graceful */ }
    }

    // Enrich patients using the pre-fetched batch data (zero additional queries)
    const enrichedPatients = patients.map(p => {
        const isCritical = (p.diagnosis && p.diagnosis.toLowerCase().includes('critical')) || 
                            (p.notes && p.notes.toLowerCase().includes('critical'));

        // NEWS2 from batched vitals
        let news2Score = null, news2Risk = 'Unknown', news2Color = 'secondary';
        const vitals = vitalsMap[p.patient_id];
        if (vitals) {
            const news2 = calculateNEWS2(vitals);
            news2Score = news2.score;
            news2Risk = news2.riskLevel;
            news2Color = news2.riskColor;
        }

        const painScore = painMap[p.admission_id] ?? null;
        const fall = fallMap[p.admission_id];
        const codeStatus = codeMap[p.admission_id] || 'Full Code';

        return { 
            ...p, 
            is_critical: isCritical || (news2Score !== null && news2Score >= 7),
            condition: (isCritical || (news2Score !== null && news2Score >= 7)) ? 'Critical' : 'Stable',
            latest_sbar: sbarMap[p.admission_id] || null,
            sbar_history_count: sbarCountMap[p.admission_id] || 0,
            news2_score: news2Score,
            news2_risk: news2Risk,
            news2_color: news2Color,
            pain_score: painScore,
            fall_risk_score: fall?.score ?? null,
            fall_risk_level: fall?.risk_level ?? null,
            code_status: codeStatus
        };
    });

    const tasksQuery = await pool.query(`
        SELECT ct.*, p.name as patient_name
        FROM care_tasks ct
        JOIN admissions a ON ct.admission_id = a.id
        JOIN patients p ON a.patient_id = p.id
        WHERE ct.status IN ('Pending', 'In Progress') AND a.ward LIKE $1 AND a.hospital_id = $2
        ORDER BY ct.scheduled_time ASC
    `, [wardFilter, hospitalId]);

    // ========== PHASE 1: Medications Due (next 4 hours) ==========
    let medicationsDue = [];
    try {
        const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        const medsRes = await pool.query(`
            SELECT ct.id, ct.description, ct.scheduled_time, ct.status, ct.type,
                   p.name AS patient_name, a.bed_number, a.ward
            FROM care_tasks ct
            JOIN admissions a ON ct.admission_id = a.id
            JOIN patients p ON a.patient_id = p.id
            WHERE ct.type IN ('Medication', 'PRN Medication')
            AND ct.status IN ('Pending', 'In Progress')
            AND ct.scheduled_time >= $1 AND ct.scheduled_time <= $2
            AND a.ward LIKE $3 AND a.hospital_id = $4
            ORDER BY ct.scheduled_time ASC
        `, [now, fourHoursFromNow, wardFilter, hospitalId]);
        medicationsDue = medsRes.rows;
    } catch (e) { /* graceful fallback */ }

    // ========== PHASE 1: Nurse Assignments ==========
    let nurseAssignments = [];
    try {
        const assignRes = await pool.query(`
            SELECT na.id, na.nurse_id, u.username AS nurse_name, 
                   na.admission_id, p.name AS patient_name, a.bed_number, a.ward,
                   na.shift_type, na.assigned_date
            FROM nurse_assignments na
            JOIN users u ON na.nurse_id = u.id
            JOIN admissions a ON na.admission_id = a.id
            JOIN patients p ON a.patient_id = p.id
            WHERE a.ward LIKE $1 AND a.hospital_id = $2
            AND a.status = 'Admitted'
            AND (na.assigned_date = CURRENT_DATE OR na.assigned_date IS NULL)
            ORDER BY u.username, a.bed_number
        `, [wardFilter, hospitalId]);
        nurseAssignments = assignRes.rows;
    } catch (e) { /* graceful fallback */ }

    // ========== PHASE 2: Pending Labs / Investigations ==========
    let pendingLabs = [];
    try {
        const labsRes = await pool.query(`
            SELECT ct.id, ct.description, ct.scheduled_time, ct.status, ct.type,
                   p.name AS patient_name, a.bed_number, a.ward, a.id AS admission_id
            FROM care_tasks ct
            JOIN admissions a ON ct.admission_id = a.id
            JOIN patients p ON a.patient_id = p.id
            WHERE ct.type IN ('Lab', 'Investigation', 'Diagnostics')
            AND ct.status IN ('Pending', 'In Progress', 'Ordered')
            AND a.ward LIKE $1 AND a.hospital_id = $2
            AND a.status = 'Admitted'
            ORDER BY ct.scheduled_time ASC
        `, [wardFilter, hospitalId]);
        pendingLabs = labsRes.rows;
    } catch (e) { /* graceful fallback */ }

    // Performance Metrics (already parallel)
    const performanceQueries = await Promise.all([
        pool.query(`
            SELECT COUNT(*) as completed FROM care_tasks ct
            JOIN admissions a ON ct.admission_id = a.id
            WHERE ct.status = 'Completed' 
            AND ct.completed_at >= $1 AND ct.completed_at <= $2
            AND a.ward LIKE $3 AND a.hospital_id = $4
        `, [shiftStart, shiftEnd, wardFilter, hospitalId]).catch(() => ({ rows: [{ completed: 0 }] })),
        
        pool.query(`
            SELECT COUNT(*) as total FROM care_tasks ct
            JOIN admissions a ON ct.admission_id = a.id
            WHERE ct.scheduled_time >= $1 AND ct.scheduled_time <= $2
            AND a.ward LIKE $3 AND a.hospital_id = $4
        `, [shiftStart, shiftEnd, wardFilter, hospitalId]).catch(() => ({ rows: [{ total: 0 }] })),
        
        pool.query(`
            SELECT COUNT(*) as count FROM vitals_logs vl
            JOIN admissions a ON vl.patient_id = a.patient_id
            WHERE vl.recorded_at >= $1 AND vl.recorded_at <= $2
            AND a.ward LIKE $3 AND a.hospital_id = $4 AND a.status = 'Admitted'
        `, [shiftStart, shiftEnd, wardFilter, hospitalId]).catch(() => ({ rows: [{ count: 0 }] })),
        
        pool.query(`
            SELECT COUNT(*) as count FROM care_tasks ct
            JOIN admissions a ON ct.admission_id = a.id
            WHERE ct.type IN ('Medication', 'PRN Medication') AND ct.status = 'Completed'
            AND ct.completed_at >= $1 AND ct.completed_at <= $2
            AND a.ward LIKE $3 AND a.hospital_id = $4
        `, [shiftStart, shiftEnd, wardFilter, hospitalId]).catch(() => ({ rows: [{ count: 0 }] })),
        
        pool.query(`
            SELECT COUNT(*) as count FROM admissions
            WHERE status = 'Discharged' AND discharge_date >= $1 AND discharge_date <= $2
            AND ward LIKE $3 AND hospital_id = $4
        `, [shiftStart, shiftEnd, wardFilter, hospitalId]).catch(() => ({ rows: [{ count: 0 }] })),
        
        pool.query(`
            SELECT COUNT(*) as count FROM admissions
            WHERE admission_date >= $1 AND admission_date <= $2
            AND ward LIKE $3 AND hospital_id = $4
        `, [shiftStart, shiftEnd, wardFilter, hospitalId]).catch(() => ({ rows: [{ count: 0 }] }))
    ]);

    const total = enrichedPatients.length;
    const critical = enrichedPatients.filter(p => p.is_critical).length;
    const stable = total - critical;

    // Auto-fill outgoing nurse from JWT
    const outgoingNurse = {
        id: req.user?.id || null,
        name: req.user?.username || req.user?.name || 'Unknown',
        role: req.user?.role || 'nurse'
    };

    ResponseHandler.success(res, {
        generated_at: new Date().toISOString(), ward, shift,
        census: { total, critical, stable },
        outgoing_nurse: outgoingNurse,
        performance: {
            tasks_completed: Number.parseInt(performanceQueries[0].rows[0]?.completed || 0),
            tasks_total: Number.parseInt(performanceQueries[1].rows[0]?.total || 0),
            vitals_logged: Number.parseInt(performanceQueries[2].rows[0]?.count || 0),
            medications_given: Number.parseInt(performanceQueries[3].rows[0]?.count || 0),
            incidents: 0,
            discharges: Number.parseInt(performanceQueries[4].rows[0]?.count || 0),
            admissions: Number.parseInt(performanceQueries[5].rows[0]?.count || 0)
        },
        patients: enrichedPatients, 
        pending_tasks: tasksQuery.rows,
        medications_due: medicationsDue,
        nurse_assignments: nurseAssignments,
        pending_labs: pendingLabs
    });
});

// ==================== DIGITAL SBAR HANDOFF - PHASE 4 ====================

const saveShiftHandoffNote = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, shift_date, shift_type, situation, background, assessment, recommendation } = req.body;
    const nurse_id = req.user.id;
    const hospitalId = req.hospital_id;

    if (!pool) {
        return res.status(500).json({ error: 'Database pool missing' });
    }

    const result = await pool.query(
        `INSERT INTO shift_handoff_notes 
         (admission_id, patient_id, nurse_id, shift_date, shift_type, situation, background, assessment, recommendation, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [admission_id, patient_id, nurse_id, shift_date, shift_type, situation, background, assessment, recommendation, hospitalId]
    );
    
    if (!result || !result.rows) {
        throw new Error('Pool query failed to return rows');
    }

    ResponseHandler.success(res, { handoff: result.rows[0] }, 'SBAR Note Saved', 201);
});

const getShiftHandoffNotes = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `SELECT sh.*, u.username as nurse_name 
         FROM shift_handoff_notes sh
         LEFT JOIN users u ON sh.nurse_id = u.id
         WHERE sh.admission_id = $1 AND sh.hospital_id = $2
         ORDER BY sh.created_at DESC`,
        [admission_id, hospitalId]
    );
    ResponseHandler.success(res, { notes: result.rows });
});

// ==================== READ-BACK CONFIRMATION — Persisted to DB ====================

const saveReadBackConfirmation = asyncHandler(async (req, res) => {
    const { ward, shift_type, incoming_nurse_name } = req.body;
    const outgoing_nurse_id = req.user.id;
    const hospitalId = req.hospital_id;

    if (!incoming_nurse_name?.trim()) {
        return res.status(400).json({ error: 'Incoming nurse name is required' });
    }

    // Create table if not exists (auto-migration)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS handover_readback_confirmations (
            id SERIAL PRIMARY KEY,
            outgoing_nurse_id INTEGER REFERENCES users(id),
            incoming_nurse_name VARCHAR(200) NOT NULL,
            ward VARCHAR(100),
            shift_type VARCHAR(20),
            shift_date DATE DEFAULT CURRENT_DATE,
            confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            hospital_id INTEGER NOT NULL REFERENCES hospitals(id)
        )
    `).catch(() => {});

    const result = await pool.query(
        `INSERT INTO handover_readback_confirmations 
         (outgoing_nurse_id, incoming_nurse_name, ward, shift_type, hospital_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [outgoing_nurse_id, incoming_nurse_name.trim(), ward || 'All', shift_type || 'day', hospitalId]
    );

    ResponseHandler.success(res, { confirmation: result.rows[0] }, 'Read-back confirmed', 201);
});

// ==================== WOUND ASSESSMENTS - GOLD STANDARD PHASE 3 ====================

const saveWoundAssessment = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, location, type, size_cm, appearance, drainage, dressing_type, notes } = req.body;
    const user_id = req.user.id;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `INSERT INTO wound_assessments 
            (admission_id, patient_id, location, type, size_cm, appearance, drainage, dressing_type, notes, recorded_by, hospital_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [admission_id, patient_id, location, type, size_cm, appearance, drainage, dressing_type, notes, user_id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Wound assessment saved', 201);
});

const getWoundAssessments = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        'SELECT * FROM wound_assessments WHERE admission_id = $1 AND hospital_id = $2 ORDER BY recorded_at DESC',
        [admission_id, hospitalId]
    );
    ResponseHandler.success(res, { wounds: result.rows });
});

// ==================== FALL RISK - GOLD STANDARD PHASE 3 ====================

const saveFallRisk = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, score, risk_level, history_of_falling, secondary_diagnosis, ambulatory_aid, iv_therapy, gait, mental_status } = req.body;
    const user_id = req.user.id;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `INSERT INTO fall_risk_assessments 
            (admission_id, patient_id, score, risk_level, history_of_falling, secondary_diagnosis, ambulatory_aid, iv_therapy, gait, mental_status, assessed_by, hospital_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [admission_id, patient_id, score, risk_level, history_of_falling, secondary_diagnosis, ambulatory_aid, iv_therapy, gait, mental_status, user_id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Fall risk assessment saved', 201);
});

const getFallRisk = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        'SELECT * FROM fall_risk_assessments WHERE admission_id = $1 AND hospital_id = $2 ORDER BY assessed_at DESC',
        [admission_id, hospitalId]
    );
    ResponseHandler.success(res, { assessments: result.rows });
});

const recordServiceUsage = asyncHandler(async (req, res) => {
    const { admission_id, service_id, quantity, notes } = req.body;
    const user_id = req.user.id;
    const hospitalId = req.hospital_id;

    // [BILLING FIX] Get service details for billing
    const svcInfo = await pool.query('SELECT name, price FROM ward_service_charges WHERE id = $1', [service_id]);
    const service = svcInfo.rows[0];
    const unitPrice = Number.parseFloat(service?.price) || 0;

    // Record in patient_service_charges
    const result = await pool.query(
        `INSERT INTO patient_service_charges (admission_id, service_id, quantity, notes, recorded_by, hospital_id) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [admission_id, service_id, quantity, notes, user_id, hospitalId]
    );

    // [BILLING FIX] Add to invoice for real-time billing
    const admRes = await pool.query('SELECT patient_id FROM admissions WHERE id = $1', [admission_id]);
    const patientId = admRes.rows[0]?.patient_id;
    if (patientId && unitPrice > 0) {
        await addToInvoice(patientId, admission_id, `Service: ${service?.name || 'Unknown'}`, quantity, unitPrice, user_id, hospitalId);
        console.log(`[Nurse Billing] Service ${service?.name} (Rs.${unitPrice} x ${quantity}) added to invoice for admission ${admission_id}`);
    }

    ResponseHandler.success(res, { entry: result.rows[0] }, 'Service charge recorded', 201);
});

const getPatientServices = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = req.hospital_id;
    
    const result = await pool.query(`
        SELECT psc.*, wsc.name, wsc.price, u.username as recorded_by_name
        FROM patient_service_charges psc
        JOIN ward_service_charges wsc ON psc.service_id = wsc.id
        LEFT JOIN users u ON psc.recorded_by = u.id
        WHERE psc.admission_id = $1 AND psc.hospital_id = $2
        ORDER BY psc.recorded_at DESC
    `, [admission_id, hospitalId]);
    ResponseHandler.success(res, { services: result.rows });
});

module.exports = {
    createCarePlan, getCarePlan, updateCarePlan,
    logPainScore, getPainScores,
    logFluidBalance, getFluidBalance,
    insertIVLine, getIVLines, removeIVLine,
    getWardOverview,
    recordConsumable, getPatientConsumables,
    getShiftHandover,
    saveWoundAssessment, getWoundAssessments,
    saveFallRisk, getFallRisk,
    recordServiceUsage, getPatientServices,
    administerMedication,
    saveShiftHandoffNote, getShiftHandoffNotes,
    saveReadBackConfirmation
};
