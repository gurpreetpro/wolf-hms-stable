/**
 * Dietary Controller (Expanded)
 * WOLF HMS — Tier 2 Allied Health
 */

const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// ============================================
// DASHBOARD
// ============================================
const getDashboard = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const [totalR, pendingR, activeR, allergiesR] = await Promise.all([
        pool.query("SELECT COUNT(*) FROM dietary_orders WHERE (hospital_id = $1 OR hospital_id IS NULL)", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM dietary_orders WHERE (hospital_id = $1 OR hospital_id IS NULL) AND status = 'Pending'", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM dietary_meal_plans WHERE (hospital_id = $1 OR hospital_id IS NULL) AND status = 'ACTIVE'", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM dietary_allergies WHERE hospital_id = $1", [hospitalId]),
    ]);

    ResponseHandler.success(res, {
        total_orders: Number.parseInt(totalR.rows[0].count),
        pending_orders: Number.parseInt(pendingR.rows[0].count),
        active_plans: Number.parseInt(activeR.rows[0].count),
        allergy_alerts: Number.parseInt(allergiesR.rows[0].count),
    });
});

// ============================================
// ORDERS (existing + enhanced)
// ============================================
const createOrder = asyncHandler(async (req, res) => {
    const { patient_id, ward, bed_number, meal_type, diet_type, allergies, notes } = req.body;
    const ordered_by = req.user.id;
    const hospitalId = getHospitalId(req);

    if (!patient_id || !ward || !bed_number || !meal_type || !diet_type) {
        return ResponseHandler.error(res, 'Missing required fields', 400);
    }

    const result = await pool.query(
        `INSERT INTO dietary_orders 
        (patient_id, ward, bed_number, meal_type, diet_type, allergies, notes, ordered_by, hospital_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [patient_id, ward, bed_number, meal_type, diet_type, allergies, notes, ordered_by, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Dietary order created successfully', 201);
});

const getOrders = asyncHandler(async (req, res) => {
    const { status, meal_type, ward } = req.query;
    const hospitalId = getHospitalId(req);
    
    let query = `
        SELECT d.*, p.name as patient_name, u.username as ordered_by_name 
        FROM dietary_orders d
        LEFT JOIN patients p ON d.patient_id = p.id
        LEFT JOIN users u ON d.ordered_by = u.id
        WHERE (d.hospital_id = $1 OR d.hospital_id IS NULL)
    `;
    const params = [hospitalId];
    let paramIdx = 2;

    if (status && status !== 'All') { query += ` AND d.status = $${paramIdx++}`; params.push(status); }
    if (meal_type && meal_type !== 'All') { query += ` AND d.meal_type = $${paramIdx++}`; params.push(meal_type); }
    if (ward && ward !== 'All') { query += ` AND d.ward = $${paramIdx++}`; params.push(ward); }
    query += ' ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

const updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        'UPDATE dietary_orders SET status = $1 WHERE id = $2 AND (hospital_id = $3 OR hospital_id IS NULL) RETURNING *',
        [status, id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Order not found', 404);
    ResponseHandler.success(res, result.rows[0], 'Order status updated successfully');
});

// ============================================
// MEAL PLANS
// ============================================
const getMealPlans = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { patient_id, status } = req.query;

    let query = `
        SELECT mp.*, p.name AS patient_name, u.username AS created_by_name
        FROM dietary_meal_plans mp
        LEFT JOIN patients p ON mp.patient_id = p.id
        LEFT JOIN users u ON mp.created_by = u.id
        WHERE (mp.hospital_id = $1 OR mp.hospital_id IS NULL)
    `;
    const params = [hospitalId];
    let idx = 2;
    if (patient_id) { query += ` AND mp.patient_id = $${idx++}`; params.push(patient_id); }
    if (status && status !== 'All') { query += ` AND mp.status = $${idx++}`; params.push(status); }
    query += ' ORDER BY mp.created_at DESC';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

const createMealPlan = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { patient_id, diet_type, calorie_target, protein_target, restrictions, meals, duration_days, notes } = req.body;

    if (!patient_id || !diet_type) return ResponseHandler.error(res, 'patient_id and diet_type required', 400);

    const result = await pool.query(
        `INSERT INTO dietary_meal_plans 
         (patient_id, diet_type, calorie_target, protein_target, restrictions, meals, duration_days, notes, created_by, hospital_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE') RETURNING *`,
        [patient_id, diet_type, calorie_target || 2000, protein_target || 60, 
         JSON.stringify(restrictions || []), JSON.stringify(meals || {}), duration_days || 7, notes, req.user.id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Meal plan created', 201);
});

const updateMealPlan = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { id } = req.params;
    const { status, calorie_target, protein_target, meals, notes } = req.body;

    const result = await pool.query(
        `UPDATE dietary_meal_plans 
         SET status = COALESCE($1, status), calorie_target = COALESCE($2, calorie_target),
             protein_target = COALESCE($3, protein_target), meals = COALESCE($4, meals),
             notes = COALESCE($5, notes), updated_at = NOW()
         WHERE id = $6 AND (hospital_id = $7 OR hospital_id IS NULL) RETURNING *`,
        [status, calorie_target, protein_target, meals ? JSON.stringify(meals) : null, notes, id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Plan not found', 404);
    ResponseHandler.success(res, result.rows[0], 'Meal plan updated');
});

// ============================================
// PATIENT ALLERGIES
// ============================================
const getAllergies = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { patient_id } = req.query;

    let query = `SELECT da.*, p.name AS patient_name FROM dietary_allergies da
                 LEFT JOIN patients p ON da.patient_id = p.id
                 WHERE da.hospital_id = $1`;
    const params = [hospitalId];
    let idx = 2;
    if (patient_id) { query += ` AND da.patient_id = $${idx++}`; params.push(patient_id); }
    query += ' ORDER BY da.severity DESC, da.created_at DESC';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

const addAllergy = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { patient_id, allergen, severity, reaction, notes } = req.body;

    if (!patient_id || !allergen) return ResponseHandler.error(res, 'patient_id and allergen required', 400);

    const result = await pool.query(
        `INSERT INTO dietary_allergies (patient_id, allergen, severity, reaction, notes, reported_by, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [patient_id, allergen, severity || 'MODERATE', reaction, notes, req.user.id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Allergy recorded', 201);
});

// ============================================
// NUTRITION TRACKING
// ============================================
const getNutritionLogs = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { patient_id, date } = req.query;

    let query = `SELECT nl.*, u.username AS logged_by_name
                 FROM dietary_nutrition_logs nl LEFT JOIN users u ON nl.logged_by = u.id
                 WHERE nl.hospital_id = $1`;
    const params = [hospitalId];
    let idx = 2;
    if (patient_id) { query += ` AND nl.patient_id = $${idx++}`; params.push(patient_id); }
    if (date) { query += ` AND nl.log_date = $${idx++}`; params.push(date); }
    query += ' ORDER BY nl.log_date DESC, nl.meal_time DESC LIMIT 100';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

const logNutrition = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { patient_id, meal_time, food_items, calories_consumed, protein_consumed, notes } = req.body;

    if (!patient_id || !meal_time) return ResponseHandler.error(res, 'patient_id and meal_time required', 400);

    const result = await pool.query(
        `INSERT INTO dietary_nutrition_logs 
         (patient_id, log_date, meal_time, food_items, calories_consumed, protein_consumed, notes, logged_by, hospital_id)
         VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [patient_id, meal_time, JSON.stringify(food_items || []), calories_consumed || 0, protein_consumed || 0, notes, req.user.id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Nutrition logged', 201);
});

module.exports = { 
    getDashboard, createOrder, getOrders, updateStatus,
    getMealPlans, createMealPlan, updateMealPlan,
    getAllergies, addAllergy,
    getNutritionLogs, logNutrition,
};
