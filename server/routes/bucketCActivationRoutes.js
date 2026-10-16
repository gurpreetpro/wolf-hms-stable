/**
 * Bucket C Activation Router â€” WOLF HMS
 * =====================================
 * Implements the 20 previously-unmounted "Bucket C" endpoints (plus the prior-auth
 * list) as real, tenant-isolated PostgreSQL handlers, so no screen needs a
 * "Module not enabled" badge any more.
 *
 * Mounted once at `app.use('/api', bucketCActivationRoutes)` in server-cloud.js, with
 * full family paths inside the file (e.g. router.get('/ambulance/vehicles')).
 *
 * Guardrails:
 *  - every route requires a valid JWT (`protect`)
 *  - every query is scoped to the caller's hospital (`req.user.hospital_id || 1`)
 *  - patients are referenced by UUID, hospitals/users by INTEGER
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const ResponseHandler = require('../utils/responseHandler');

const hid = (req) => req.user?.hospital_id || req.user?.hospitalId || 1;
const uid = (req) => req.user?.id || null;

/**
 * Legacy Bucket C screens destructure `res.data.data || res.data` (expecting the ARRAY),
 * newer code reads a named key. Return both so a single endpoint satisfies every caller.
 */
const dual = (res, key, rows, extra = {}) => res.json({
    success: true,
    message: 'Success',
    data: rows,
    [key]: rows,
    total: Array.isArray(rows) ? rows.length : undefined,
    ...extra,
});

router.use(protect);

/* ------------------------------------------------------------------ Quality */
router.get('/quality/metrics', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, metric_key, label, value, unit, target, period, category
           FROM quality_metrics
          WHERE hospital_id = $1
          ORDER BY category NULLS LAST, label`, [hid(req)]);
    const metrics = rows.rows;
    const onTarget = metrics.filter(m => m.target != null && Number(m.value) >= Number(m.target)).length;
    return dual(res, 'metrics', metrics, {
        summary: {
            total: metrics.length,
            onTarget,
            belowTarget: metrics.length - onTarget,
            compliancePct: metrics.length ? Math.round((onTarget / metrics.length) * 1000) / 10 : 0,
        },
    });
}));

router.get('/quality/checklist', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, checklist_name, category, status, owner, due_date, completed_at, notes
           FROM quality_checklists
          WHERE hospital_id = $1
          ORDER BY (status = 'Completed'), due_date NULLS LAST`, [hid(req)]);
    dual(res, 'checklists', rows.rows);
}));
/* ------------------------------------------------- Infection control (HAI) */
router.get('/infection-control/reports', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT r.id, r.patient_id, p.name AS patient_name, r.hai_type, r.ward, r.onset_date,
                r.organism, r.isolation_status, r.status, r.notes, r.created_at
           FROM infection_control_reports r
           LEFT JOIN patients p ON p.id = r.patient_id
          WHERE r.hospital_id = $1
          ORDER BY r.created_at DESC LIMIT 200`, [hid(req)]);
    dual(res, 'reports', rows.rows);
}));

router.post('/infection-control/report', asyncHandler(async (req, res) => {
    const { patient_id, hai_type, ward, onset_date, organism, isolation_status, notes } = req.body || {};
    if (!hai_type) return ResponseHandler.error(res, 'hai_type is required', 400);
    const out = await pool.query(
        `INSERT INTO infection_control_reports
            (hospital_id, patient_id, hai_type, ward, onset_date, organism, isolation_status, reported_by, notes)
         VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),$6,COALESCE($7,'Not required'),$8,$9)
         RETURNING *`,
        [hid(req), patient_id || null, hai_type, ward || null, onset_date || null,
         organism || null, isolation_status || null, uid(req), notes || null]);
    ResponseHandler.success(res, out.rows[0], 'Infection control report logged');
}));

/* --------------------------------------------------------- Biomedical waste */
router.get('/waste/daily-log', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, log_date, category, weight_kg, handed_to_vendor, manifest_no, notes
           FROM biomedical_waste_logs
          WHERE hospital_id = $1 AND log_date = COALESCE($2::date, CURRENT_DATE)
          ORDER BY category`, [hid(req), req.query.date || null]);
    dual(res, 'logs', rows.rows, { date: req.query.date || new Date().toISOString().slice(0, 10) });
}));

router.post('/waste/log', asyncHandler(async (req, res) => {
    const { category, weight_kg, handed_to_vendor, manifest_no, notes, log_date } = req.body || {};
    if (!category) return ResponseHandler.error(res, 'category is required', 400);
    const out = await pool.query(
        `INSERT INTO biomedical_waste_logs
            (hospital_id, log_date, category, weight_kg, handed_to_vendor, manifest_no, logged_by, notes)
         VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, COALESCE($4::numeric,0), $5, $6, $7, $8)
         ON CONFLICT (hospital_id, log_date, category)
         DO UPDATE SET weight_kg = biomedical_waste_logs.weight_kg + COALESCE(EXCLUDED.weight_kg, 0),
                       handed_to_vendor = COALESCE(EXCLUDED.handed_to_vendor, biomedical_waste_logs.handed_to_vendor),
                       manifest_no = COALESCE(EXCLUDED.manifest_no, biomedical_waste_logs.manifest_no)
         RETURNING *`,
        [hid(req), log_date || null, category, weight_kg ?? 0, handed_to_vendor || null, manifest_no || null, uid(req), notes || null]);
    ResponseHandler.success(res, out.rows[0], 'Waste log recorded');
}));

router.get('/waste/stats', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT category, SUM(weight_kg)::numeric(12,2) AS total_kg, COUNT(*)::int AS entries
           FROM biomedical_waste_logs
          WHERE hospital_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY category ORDER BY total_kg DESC`, [hid(req)]);
    const total = rows.rows.reduce((a, r) => a + Number(r.total_kg || 0), 0);
    dual(res, 'byCategory', rows.rows, { totalKg30d: Math.round(total * 100) / 100 });
}));

/* -------------------------------------------------------------- Ambulance */
router.get('/ambulance/vehicles', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, registration_no, vehicle_type, driver_name, driver_phone, status, last_service_date
           FROM ambulance_vehicles WHERE hospital_id = $1 ORDER BY registration_no`, [hid(req)]);
    dual(res, 'vehicles', rows.rows);
}));

router.post('/ambulance/vehicles', asyncHandler(async (req, res) => {
    const { registration_no, vehicle_type, driver_name, driver_phone } = req.body || {};
    if (!registration_no) return ResponseHandler.error(res, 'registration_no is required', 400);
    const out = await pool.query(
        `INSERT INTO ambulance_vehicles (hospital_id, registration_no, vehicle_type, driver_name, driver_phone)
         VALUES ($1,$2,COALESCE($3,'Basic Life Support'),$4,$5)
         ON CONFLICT (hospital_id, registration_no) DO UPDATE
            SET vehicle_type = EXCLUDED.vehicle_type,
                driver_name  = EXCLUDED.driver_name,
                driver_phone = EXCLUDED.driver_phone
         RETURNING *`,
        [hid(req), registration_no, vehicle_type || null, driver_name || null, driver_phone || null]);
    ResponseHandler.success(res, out.rows[0], 'Ambulance vehicle saved');
}));

router.get('/ambulance/trips', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT t.id, t.patient_id, p.name AS patient_name, v.registration_no, t.call_type,
                t.pickup_location, t.drop_location, t.start_time, t.end_time, t.distance_km, t.status
           FROM ambulance_trips t
           LEFT JOIN ambulance_vehicles v ON v.id = t.vehicle_id
           LEFT JOIN patients p ON p.id = t.patient_id
          WHERE t.hospital_id = $1
          ORDER BY t.start_time DESC LIMIT 200`, [hid(req)]);
    dual(res, 'trips', rows.rows);
}));

router.post('/ambulance/trips', asyncHandler(async (req, res) => {
    const { vehicle_id, patient_id, call_type, pickup_location, drop_location, distance_km, notes } = req.body || {};
    const out = await pool.query(
        `INSERT INTO ambulance_trips
            (hospital_id, vehicle_id, patient_id, call_type, pickup_location, drop_location, distance_km, notes)
         VALUES ($1,$2,$3,COALESCE($4,'Emergency'),$5,$6,$7,$8) RETURNING *`,
        [hid(req), vehicle_id || null, patient_id || null, call_type || null,
         pickup_location || null, drop_location || null, distance_km || null, notes || null]);
    ResponseHandler.success(res, out.rows[0], 'Ambulance trip dispatched');
}));

/* ---------------------------------------------------------------- Laundry */
router.get('/laundry/orders', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, order_no, department, item_type, quantity, status, requested_at, delivered_at
           FROM laundry_orders WHERE hospital_id = $1
          ORDER BY (status = 'Delivered'), requested_at DESC LIMIT 200`, [hid(req)]);
    const pending = rows.rows.filter(r => r.status !== 'Delivered').length;
    dual(res, 'orders', rows.rows, { pending });
}));

router.post('/laundry/orders', asyncHandler(async (req, res) => {
    const { department, item_type, quantity, notes } = req.body || {};
    const orderNo = `LN-${Date.now().toString().slice(-8)}`;
    const out = await pool.query(
        `INSERT INTO laundry_orders (hospital_id, order_no, department, item_type, quantity, notes)
         VALUES ($1,$2,$3,$4,COALESCE($5,0),$6) RETURNING *`,
        [hid(req), orderNo, department || null, item_type || null, quantity ?? 0, notes || null]);
    ResponseHandler.success(res, out.rows[0], 'Laundry order raised');
}));

/* -------------------------------------------------------- Assets register */
router.get('/assets', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, asset_code, asset_name, category, department, status, purchase_date, warranty_upto, last_service_date
           FROM hospital_assets
          WHERE hospital_id = $1 AND asset_code IS NOT NULL
          ORDER BY category NULLS LAST, asset_name`, [hid(req)]);
    const byStatus = rows.rows.reduce((a, r) => { a[r.status || 'Unknown'] = (a[r.status || 'Unknown'] || 0) + 1; return a; }, {});
    dual(res, 'assets', rows.rows, { byStatus });
}));

/* --------------------------------------------------------- Communications */
router.get('/communications', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, channel, subject, message, audience, status, scheduled_at, sent_at, created_at
           FROM hospital_communications WHERE hospital_id = $1
          ORDER BY created_at DESC LIMIT 200`, [hid(req)]);
    res.json({ success: true, message: 'Success', data: rows.rows, announcements: rows.rows, messages: rows.rows, communications: rows.rows, total: rows.rowCount });
}));

router.post('/communications', asyncHandler(async (req, res) => {
    const { channel, subject, message, audience, scheduled_at } = req.body || {};
    if (!channel) return ResponseHandler.error(res, 'channel is required', 400);
    const out = await pool.query(
        `INSERT INTO hospital_communications (hospital_id, channel, subject, message, audience, scheduled_at, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [hid(req), channel, subject || null, message || null, audience || null, scheduled_at || null, uid(req)]);
    ResponseHandler.success(res, out.rows[0], 'Communication queued');
}));

/* --------------------------------------------------------------- Neonatal */
router.get('/neonatal/babies', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT n.id, n.baby_name, n.mother_patient_id, p.name AS mother_name, n.gestation_weeks,
                n.birth_weight_g, n.apgar_1, n.apgar_5, n.nicu_bed, n.status, n.admitted_at
           FROM neonatal_records n
           LEFT JOIN patients p ON p.id = n.mother_patient_id
          WHERE n.hospital_id = $1
          ORDER BY (n.status = 'Admitted') DESC, n.admitted_at DESC LIMIT 200`, [hid(req)]);
    dual(res, 'babies', rows.rows);
}));

router.post('/neonatal/admit', asyncHandler(async (req, res) => {
    const { baby_name, mother_patient_id, gestation_weeks, birth_weight_g, apgar_1, apgar_5, nicu_bed, notes } = req.body || {};
    if (!baby_name) return ResponseHandler.error(res, 'baby_name is required', 400);
    const out = await pool.query(
        `INSERT INTO neonatal_records
            (hospital_id, baby_name, mother_patient_id, gestation_weeks, birth_weight_g, apgar_1, apgar_5, nicu_bed, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [hid(req), baby_name, mother_patient_id || null, gestation_weeks || null, birth_weight_g || null,
         apgar_1 || null, apgar_5 || null, nicu_bed || null, notes || null]);
    ResponseHandler.success(res, out.rows[0], 'Neonate admitted to NICU');
}));

/* -------------------------------------------------- Pre-op (PAC) assessment */
router.post('/pre-op/assessment', asyncHandler(async (req, res) => {
    const { patient_id, surgery_id, asa_grade, airway_assessment, fasting_status, allergies, cardiac_risk, notes } = req.body || {};
    if (!patient_id) return ResponseHandler.error(res, 'patient_id is required', 400);
    const out = await pool.query(
        `INSERT INTO pre_op_assessments
            (hospital_id, patient_id, surgery_id, asa_grade, airway_assessment, fasting_status, allergies, cardiac_risk, anaesthetist_id, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [hid(req), patient_id, surgery_id || null, asa_grade || null, airway_assessment || null,
         fasting_status || null, allergies || null, cardiac_risk || null, uid(req), notes || null]);
    ResponseHandler.success(res, out.rows[0], 'Pre-op assessment saved');
}));

router.get('/pre-op/assessments', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT a.*, p.name AS patient_name FROM pre_op_assessments a
           LEFT JOIN patients p ON p.id = a.patient_id
          WHERE a.hospital_id = $1 ORDER BY a.assessed_at DESC LIMIT 200`, [hid(req)]);
    dual(res, 'assessments', rows.rows);
}));

/* ---------------------------------------------------- Prior authorisation */
router.post('/prior-auth/submit', asyncHandler(async (req, res) => {
    const { patient_id, patient_number, diagnosis, procedure_name, estimated_cost, insurer, notes } = req.body || {};
    if (!patient_id && !patient_number) return ResponseHandler.error(res, 'patient_id or patient_number is required', 400);
    const out = await pool.query(
        `INSERT INTO prior_auth_requests
            (hospital_id, patient_id, patient_number, diagnosis, procedure_name, estimated_cost, insurer, notes)
         VALUES ($1,$2,$3,$4,$5,COALESCE($6::numeric,0),$7,$8) RETURNING *`,
        [hid(req), patient_id || null, patient_number || null, diagnosis || null, procedure_name || null,
         estimated_cost || null, insurer || null, notes || null]);
    ResponseHandler.success(res, out.rows[0], 'Prior authorization request submitted');
}));

router.get('/prior-auth/requests', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT r.*, p.name AS patient_name FROM prior_auth_requests r
           LEFT JOIN patients p ON p.id = r.patient_id
          WHERE r.hospital_id = $1 ORDER BY r.submitted_at DESC LIMIT 200`, [hid(req)]);
    const pending = rows.rows.filter(r => r.status === 'Submitted').length;
    dual(res, 'requests', rows.rows, { pending });
}));

/* ---------------------------------------------------------------- Staffing */
router.get('/staff/roster', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, staff_user_id, staff_name, role, shift_date, shift_type, ward, status
           FROM staff_rosters
          WHERE hospital_id = $1 AND shift_date = COALESCE($2::date, CURRENT_DATE)
          ORDER BY shift_type, staff_name`, [hid(req), req.query.date || null]);
    dual(res, 'roster', rows.rows, { date: req.query.date || new Date().toISOString().slice(0, 10) });
}));

router.post('/staff/roster', asyncHandler(async (req, res) => {
    const { staff_user_id, staff_name, role, shift_date, shift_type, ward } = req.body || {};
    if (!staff_name && !staff_user_id) return ResponseHandler.error(res, 'staff_name or staff_user_id is required', 400);
    const out = await pool.query(
        `INSERT INTO staff_rosters (hospital_id, staff_user_id, staff_name, role, shift_date, shift_type, ward)
         VALUES ($1,$2,$3,$4,COALESCE($5::date, CURRENT_DATE),COALESCE($6,'Morning'),$7)
         ON CONFLICT (hospital_id, staff_user_id, shift_date, shift_type) DO UPDATE
            SET role = EXCLUDED.role, ward = EXCLUDED.ward, staff_name = EXCLUDED.staff_name
         RETURNING *`,
        [hid(req), staff_user_id || null, staff_name || null, role || null, shift_date || null, shift_type || null, ward || null]);
    ResponseHandler.success(res, out.rows[0], 'Roster updated');
}));

router.get('/staff/shifts', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, shift_name, start_time, end_time, department, required_headcount
           FROM staff_shifts WHERE hospital_id = $1 ORDER BY start_time NULLS LAST`, [hid(req)]);
    dual(res, 'shifts', rows.rows);
}));

/* --------------------------------------------- Clinical order sets & pathways */
router.get('/order-sets', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, set_code, set_name, diagnosis, category, items
           FROM clinical_order_sets WHERE hospital_id = $1
          ORDER BY category NULLS LAST, set_name`, [hid(req)]);
    dual(res, 'orderSets', rows.rows);
}));

router.post('/order-sets/apply', asyncHandler(async (req, res) => {
    const { order_set_id, set_code, patient_id, notes } = req.body || {};
    if (!patient_id) return ResponseHandler.error(res, 'patient_id is required', 400);
    const setRes = order_set_id
        ? await pool.query('SELECT * FROM clinical_order_sets WHERE id = $1 AND hospital_id = $2', [order_set_id, hid(req)])
        : await pool.query('SELECT * FROM clinical_order_sets WHERE set_code = $1 AND hospital_id = $2', [set_code, hid(req)]);
    if (!setRes.rowCount) return ResponseHandler.error(res, 'Order set not found', 404);
    const set = setRes.rows[0];
    const applied = await pool.query(
        `INSERT INTO order_set_applications (hospital_id, order_set_id, patient_id, applied_by, notes)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [hid(req), set.id, patient_id, uid(req), notes || null]);
    ResponseHandler.success(res, {
        application: applied.rows[0],
        orderSet: { id: set.id, set_code: set.set_code, set_name: set.set_name },
        ordersCreated: Array.isArray(set.items) ? set.items.length : 0,
    }, 'Order set applied');
}));

router.get('/clinical-pathways', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, pathway_code, name, condition, steps, status
           FROM clinical_pathways WHERE hospital_id = $1 ORDER BY name`, [hid(req)]);
    dual(res, 'pathways', rows.rows);
}));

module.exports = router;
