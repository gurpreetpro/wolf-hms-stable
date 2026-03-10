/**
 * Physiotherapy Controller
 * WOLF HMS — Tier 2 Allied Health
 */

const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// ============================================
// DASHBOARD
// ============================================
const getDashboardStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    
    const [activeR, sessionsR, pendingR] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM rehab_plans WHERE hospital_id = $1 AND status = $2', [hospitalId, 'ACTIVE']),
        pool.query("SELECT COUNT(*) FROM rehab_sessions WHERE hospital_id = $1 AND session_date = CURRENT_DATE", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM rehab_plans WHERE hospital_id = $1 AND status = $2", [hospitalId, 'PENDING_ASSESSMENT']),
    ]);

    ResponseHandler.success(res, {
        active_patients: parseInt(activeR.rows[0].count),
        sessions_today: parseInt(sessionsR.rows[0].count),
        pending_assessment: parseInt(pendingR.rows[0].count),
    });
});

// ============================================
// PATIENTS (Active Rehab)
// ============================================
const getPatients = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { status } = req.query;

    let query = `
        SELECT rp.*, p.name AS patient_name, p.age, p.gender, 
               u.username AS assigned_therapist_name
        FROM rehab_plans rp
        LEFT JOIN patients p ON rp.patient_id = p.id
        LEFT JOIN users u ON rp.assigned_therapist = u.id
        WHERE rp.hospital_id = $1
    `;
    const params = [hospitalId];
    let idx = 2;

    if (status && status !== 'All') {
        query += ` AND rp.status = $${idx++}`;
        params.push(status);
    }
    query += ' ORDER BY rp.created_at DESC';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// ============================================
// REHAB PLAN CRUD
// ============================================
const getPlanById = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { id } = req.params;

    const plan = await pool.query(
        `SELECT rp.*, p.name AS patient_name 
         FROM rehab_plans rp 
         LEFT JOIN patients p ON rp.patient_id = p.id
         WHERE rp.id = $1 AND rp.hospital_id = $2`, [id, hospitalId]
    );
    if (plan.rows.length === 0) return ResponseHandler.error(res, 'Plan not found', 404);

    const exercises = await pool.query(
        'SELECT * FROM rehab_plan_exercises WHERE plan_id = $1 ORDER BY sequence_order', [id]
    );

    ResponseHandler.success(res, { ...plan.rows[0], exercises: exercises.rows });
});

const createPlan = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { patient_id, diagnosis, goals, frequency, duration_weeks, exercises } = req.body;
    const assigned_therapist = req.user.id;

    if (!patient_id || !diagnosis) {
        return ResponseHandler.error(res, 'patient_id and diagnosis are required', 400);
    }

    const result = await pool.query(
        `INSERT INTO rehab_plans 
         (patient_id, diagnosis, goals, frequency, duration_weeks, assigned_therapist, hospital_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE') RETURNING *`,
        [patient_id, diagnosis, goals, frequency || 'Daily', duration_weeks || 4, assigned_therapist, hospitalId]
    );

    const planId = result.rows[0].id;

    // Insert exercises if provided
    if (exercises && exercises.length > 0) {
        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            await pool.query(
                `INSERT INTO rehab_plan_exercises 
                 (plan_id, exercise_name, sets, reps, hold_seconds, notes, sequence_order)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [planId, ex.name, ex.sets || 3, ex.reps || 10, ex.hold_seconds || 0, ex.notes || '', i + 1]
            );
        }
    }

    ResponseHandler.success(res, result.rows[0], 'Rehab plan created', 201);
});

const updatePlan = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { id } = req.params;
    const { status, goals, frequency, duration_weeks } = req.body;

    const result = await pool.query(
        `UPDATE rehab_plans 
         SET status = COALESCE($1, status), goals = COALESCE($2, goals), 
             frequency = COALESCE($3, frequency), duration_weeks = COALESCE($4, duration_weeks),
             updated_at = NOW()
         WHERE id = $5 AND hospital_id = $6 RETURNING *`,
        [status, goals, frequency, duration_weeks, id, hospitalId]
    );

    if (result.rows.length === 0) return ResponseHandler.error(res, 'Plan not found', 404);
    ResponseHandler.success(res, result.rows[0], 'Plan updated');
});

// ============================================
// SESSIONS
// ============================================
const logSession = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { plan_id, session_date, duration_minutes, pain_before, pain_after, rom_data, notes, exercises_completed } = req.body;
    const performed_by = req.user.id;

    if (!plan_id) return ResponseHandler.error(res, 'plan_id is required', 400);

    const result = await pool.query(
        `INSERT INTO rehab_sessions 
         (plan_id, session_date, duration_minutes, pain_before, pain_after, rom_data, notes, exercises_completed, performed_by, hospital_id)
         VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [plan_id, session_date, duration_minutes || 30, pain_before, pain_after, 
         JSON.stringify(rom_data || {}), notes, JSON.stringify(exercises_completed || []), performed_by, hospitalId]
    );

    ResponseHandler.success(res, result.rows[0], 'Session logged', 201);
});

const getSessions = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { plan_id } = req.query;

    let query = `
        SELECT rs.*, u.username AS therapist_name 
        FROM rehab_sessions rs 
        LEFT JOIN users u ON rs.performed_by = u.id
        WHERE rs.hospital_id = $1
    `;
    const params = [hospitalId];
    let idx = 2;

    if (plan_id) {
        query += ` AND rs.plan_id = $${idx++}`;
        params.push(plan_id);
    }
    query += ' ORDER BY rs.session_date DESC, rs.created_at DESC';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// ============================================
// EXERCISE LIBRARY
// ============================================
const getExerciseLibrary = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { category } = req.query;

    let query = 'SELECT * FROM exercise_library WHERE (hospital_id = $1 OR hospital_id IS NULL)';
    const params = [hospitalId];
    let idx = 2;

    if (category && category !== 'All') {
        query += ` AND category = $${idx++}`;
        params.push(category);
    }
    query += ' ORDER BY category, name';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

const addExercise = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { name, category, description, default_sets, default_reps, default_hold, body_region } = req.body;

    if (!name || !category) return ResponseHandler.error(res, 'name and category required', 400);

    const result = await pool.query(
        `INSERT INTO exercise_library (name, category, description, default_sets, default_reps, default_hold, body_region, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [name, category, description, default_sets || 3, default_reps || 10, default_hold || 0, body_region, hospitalId]
    );

    ResponseHandler.success(res, result.rows[0], 'Exercise added', 201);
});

module.exports = {
    getDashboardStats, getPatients, getPlanById, createPlan, updatePlan,
    logSession, getSessions, getExerciseLibrary, addExercise,
};
