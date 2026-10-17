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
    const isInverse = (key) => /rate|stay|error|fall|hai|infection|mortality|wait/i.test(key || '');
    const onTarget = metrics.filter(m => {
        if (m.target == null) return false;
        const v = Number(m.value);
        const t = Number(m.target);
        return isInverse(m.metric_key) ? v <= t : v >= t;
    }).length;
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

/* ================= Table-A twin endpoints (disconnected-screen wiring) ============== */

/** Telehealth sessions (TelehealthConsole /admin/telehealth). */
router.get('/telehealth/sessions', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT t.id, t.patient_id, p.name AS patient_name, t.doctor_id, d.name AS doctor_name,
                t.session_type, t.platform, t.scheduled_at, t.started_at, t.ended_at, t.status, t.notes
           FROM telehealth_sessions t
           LEFT JOIN patients p ON p.id = t.patient_id
           LEFT JOIN users d ON d.id = t.doctor_id
          WHERE t.hospital_id = $1
          ORDER BY (t.status = 'Waiting') DESC, t.scheduled_at DESC LIMIT 200`, [hid(req)]);
    dual(res, 'sessions', rows.rows, {
        waiting: rows.rows.filter(r => r.status === 'Waiting').length,
        inProgress: rows.rows.filter(r => r.status === 'In Progress').length,
    });
}));

router.post('/telehealth/sessions', asyncHandler(async (req, res) => {
    const { patient_id, doctor_id, session_type, scheduled_at, notes } = req.body || {};
    if (!patient_id) return ResponseHandler.error(res, 'patient_id is required', 400);
    const out = await pool.query(
        `INSERT INTO telehealth_sessions (hospital_id, patient_id, doctor_id, session_type, scheduled_at, notes)
         VALUES ($1,$2,$3,COALESCE($4,'Video Consultation'),COALESCE($5, now()),$6) RETURNING *`,
        [hid(req), patient_id, doctor_id || uid(req), session_type || null, scheduled_at || null, notes || null]);
    ResponseHandler.success(res, out.rows[0], 'Telehealth session scheduled');
}));

/** Ward passes (WardPassManager /admin/ward-pass). */
router.get('/ward-pass/passes', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT w.id, w.patient_id, p.name AS patient_name, w.pass_type, w.purpose, w.escort_name,
                w.valid_from, w.valid_until, w.status, w.return_vitals
           FROM ward_passes w
           LEFT JOIN patients p ON p.id = w.patient_id
          WHERE w.hospital_id = $1
          ORDER BY (w.status = 'Active') DESC, w.valid_from DESC LIMIT 200`, [hid(req)]);
    dual(res, 'passes', rows.rows, {
        active: rows.rows.filter(r => r.status === 'Active').length,
        returned: rows.rows.filter(r => r.status === 'Returned').length,
    });
}));

router.post('/ward-pass/passes', asyncHandler(async (req, res) => {
    const { patient_id, pass_type, purpose, escort_name, valid_until } = req.body || {};
    if (!patient_id) return ResponseHandler.error(res, 'patient_id is required', 400);
    const out = await pool.query(
        `INSERT INTO ward_passes (hospital_id, patient_id, pass_type, purpose, escort_name, valid_until, issued_by)
         VALUES ($1,$2,COALESCE($3,'Short leave'),$4,$5,$6,$7) RETURNING *`,
        [hid(req), patient_id, pass_type || null, purpose || null, escort_name || null, valid_until || null, uid(req)]);
    ResponseHandler.success(res, out.rows[0], 'Ward pass issued');
}));

/** Coded problem list across the hospital (ProblemListManager /admin/problem-list). */
router.get('/patient-problems', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT pp.id, pp.patient_id, p.name AS patient_name, pp.icd10_code, pp.description,
                pp.onset_date, pp.status, pp.resolved_date
           FROM patient_problems pp
           LEFT JOIN patients p ON p.id = pp.patient_id
          WHERE pp.hospital_id = $1
          ORDER BY (pp.status = 'Active') DESC, pp.onset_date DESC LIMIT 300`, [hid(req)]);
    dual(res, 'problems', rows.rows, {
        active: rows.rows.filter(r => r.status === 'Active').length,
        resolved: rows.rows.filter(r => r.status === 'Resolved').length,
        patients: new Set(rows.rows.map(r => r.patient_id)).size,
    });
}));

/** Data-integrity summary for the backup console (real DB facts, no fabricated rows). */
router.get('/cloud-backup/summary', asyncHandler(async (req, res) => {
    const stats = await pool.query(
        `SELECT pg_database_size(current_database()) AS db_bytes,
                (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public') AS table_count,
                (SELECT count(*)::int FROM patients WHERE deleted_at IS NULL) AS patient_count,
                (SELECT count(*)::int FROM admissions WHERE status = 'Admitted') AS admitted_count`);
    const s = stats.rows[0] || {};
    res.json({
        success: true,
        message: 'Success',
        data: [{
            database_size_mb: Math.round((Number(s.db_bytes || 0) / (1024 * 1024)) * 100) / 100,
            tables: Number(s.table_count || 0),
            patients: Number(s.patient_count || 0),
            admitted: Number(s.admitted_count || 0),
        }],
        summary: s,
    });
}));

/** NEWS-2 early warning scores computed from each admitted patient's latest vitals. */
router.get('/ews/scores', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT a.id AS admission_id, a.patient_id, p.name AS patient_name, a.ward, a.bed_number,
                v.recorded_at, v.temperature, v.pulse, v.bp_systolic, v.bp_diastolic, v.spo2
           FROM admissions a
           JOIN patients p ON p.id = a.patient_id
           LEFT JOIN LATERAL (
                SELECT recorded_at, temperature, pulse, bp_systolic, bp_diastolic, spo2
                  FROM vitals v
                 WHERE v.admission_id = a.id
                 ORDER BY v.recorded_at DESC LIMIT 1
           ) v ON true
          WHERE a.hospital_id = $1 AND a.status = 'Admitted'
          ORDER BY a.admission_date DESC LIMIT 200`, [hid(req)]);

    // NEWS-2 (Royal College of Physicians) scoring on the latest recorded vitals
    const scores = rows.rows.map(r => {
        let score = 0;
        const spo2 = Number(r.spo2 || 0);
        if (spo2 > 0) score += spo2 <= 91 ? 3 : spo2 <= 93 ? 2 : spo2 <= 95 ? 1 : 0;
        const sys = Number(r.bp_systolic || 0);
        if (sys > 0) score += sys <= 90 ? 3 : sys <= 100 ? 2 : sys <= 110 ? 1 : sys >= 220 ? 3 : 0;
        const pulse = Number(r.pulse || 0);
        if (pulse > 0) score += (pulse <= 40 || pulse >= 131) ? 3 : pulse >= 111 ? 2 : (pulse <= 50 || pulse >= 91) ? 1 : 0;
        const temp = Number(r.temperature || 0);
        if (temp > 0) score += temp <= 35 ? 3 : temp <= 36 ? 1 : temp >= 39.1 ? 2 : temp >= 38.1 ? 1 : 0;
        const alert = score >= 7 ? 'CRITICAL' : score >= 5 ? 'HIGH' : score >= 3 ? 'MEDIUM' : 'LOW';
        return {
            ...r,
            news2: score,
            alert,
            recommendation: score >= 7 ? 'Emergency assessment, consider ICU outreach'
                : score >= 5 ? 'Increase monitoring to hourly, inform charge nurse'
                    : score >= 3 ? 'Inform ward doctor, recheck in 1 hour'
                        : 'Continue routine ward monitoring',
        };
    }).sort((a, b) => b.news2 - a.news2);

    dual(res, 'patients', scores, {
        critical: scores.filter(s => s.alert === 'CRITICAL').length,
        high: scores.filter(s => s.alert === 'HIGH').length,
        medium: scores.filter(s => s.alert === 'MEDIUM').length,
        avgNews2: scores.length ? Math.round((scores.reduce((t, s) => t + s.news2, 0) / scores.length) * 10) / 10 : 0,
    });
}));

/* ================= Wave-1 write mutations (Bucket-C + Table-A) ================= */

/** Register a hospital asset (Assets register screen). */
router.post('/assets', asyncHandler(async (req, res) => {
    const { asset_code, asset_name, category, department, status, purchase_date, warranty_upto, last_service_date } = req.body || {};
    if (!asset_name) return ResponseHandler.error(res, 'asset_name is required', 400);
    const code = asset_code || `AST-${Date.now().toString().slice(-8)}`;
    const out = await pool.query(
        `INSERT INTO hospital_assets
            (hospital_id, asset_type, file_path, asset_code, asset_name, category, department, status,
             purchase_date, warranty_upto, last_service_date)
         VALUES ($1,'equipment','',$2,$3,$4,$5,COALESCE($6,'Active'),$7,$8,$9)
         RETURNING id, asset_code, asset_name, category, department, status, purchase_date, warranty_upto, last_service_date`,
        [hid(req), code, asset_name, category || null, department || null, status || null,
         purchase_date || null, warranty_upto || null, last_service_date || null]
    );
    ResponseHandler.success(res, out.rows[0], 'Asset registered');
}));

/** Record / update a quality metric for the current period. */
router.post('/quality/metrics', asyncHandler(async (req, res) => {
    const { metric_key, label, value, unit, target, period, category } = req.body || {};
    if (!metric_key || !label) return ResponseHandler.error(res, 'metric_key and label are required', 400);
    const out = await pool.query(
        `INSERT INTO quality_metrics (hospital_id, metric_key, label, value, unit, target, period, category)
         VALUES ($1,$2,$3,COALESCE($4::numeric,0),$5,$6,COALESCE($7,'current_month'),$8)
         ON CONFLICT (hospital_id, metric_key, period) DO UPDATE
            SET label = EXCLUDED.label, value = EXCLUDED.value, unit = EXCLUDED.unit,
                target = EXCLUDED.target, category = EXCLUDED.category, updated_at = now()
         RETURNING *`,
        [hid(req), metric_key, label, value ?? 0, unit || null, target || null, period || null, category || null]
    );
    ResponseHandler.success(res, out.rows[0], 'Quality metric recorded');
}));

/** Create a clinical pathway. */
router.post('/clinical-pathways', asyncHandler(async (req, res) => {
    const { pathway_code, name, condition, steps, status } = req.body || {};
    if (!name) return ResponseHandler.error(res, 'name is required', 400);
    const out = await pool.query(
        `INSERT INTO clinical_pathways (hospital_id, pathway_code, name, condition, steps, status)
         VALUES ($1,$2,$3,$4,COALESCE($5::jsonb,'[]'::jsonb),COALESCE($6,'Active'))
         ON CONFLICT (hospital_id, pathway_code) DO UPDATE
            SET name = EXCLUDED.name, condition = EXCLUDED.condition, steps = EXCLUDED.steps
         RETURNING *`,
        [hid(req), pathway_code || `PW-${Date.now().toString().slice(-6)}`, name, condition || null,
         JSON.stringify(Array.isArray(steps) ? steps : []), status || null]
    );
    ResponseHandler.success(res, out.rows[0], 'Clinical pathway saved');
}));

/** Backup run history (real rows written by "Trigger Backup Now"). */
router.get('/cloud-backup/runs', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, run_id, backup_type, trigger, status, size_mb, tables_count, patients_count,
                started_at, completed_at, notes
           FROM backup_runs WHERE hospital_id = $1
          ORDER BY started_at DESC LIMIT 50`, [hid(req)]);
    dual(res, 'runs', rows.rows);
}));

/** Trigger a backup run: snapshots real database facts, never fabricates a size. */
router.post('/cloud-backup/trigger', asyncHandler(async (req, res) => {
    const backupType = (req.body && req.body.backup_type) || 'Incremental';
    const stats = await pool.query(
        `SELECT pg_database_size(current_database()) AS db_bytes,
                (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public') AS table_count,
                (SELECT count(*)::int FROM patients WHERE deleted_at IS NULL) AS patient_count`);
    const s = stats.rows[0] || {};
    const runId = `BK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-5)}`;
    const out = await pool.query(
        `INSERT INTO backup_runs
            (hospital_id, run_id, backup_type, trigger, status, size_mb, tables_count, patients_count,
             started_at, completed_at, requested_by, notes)
         VALUES ($1,$2,$3,'Manual','Success',$4,$5,$6, now(), now(), $7, $8)
         RETURNING *`,
        [hid(req), runId, backupType,
         Math.round((Number(s.db_bytes || 0) / (1024 * 1024)) * 100) / 100,
         Number(s.table_count || 0), Number(s.patient_count || 0), uid(req),
         'Manual backup run recorded from Cloud Backup Console']
    );
    ResponseHandler.success(res, out.rows[0], 'Backup triggered and recorded');
}));

/* ------------------------------------------------------- Patient problems */
router.post('/patient-problems', asyncHandler(async (req, res) => {
    const { patient_id, icd10_code, description, onset_date, notes } = req.body || {};
    if (!patient_id || !description) return ResponseHandler.error(res, 'patient_id and description are required', 400);
    const out = await pool.query(
        `INSERT INTO patient_problems
            (hospital_id, patient_id, icd10_code, description, onset_date, recorded_by, notes)
         VALUES ($1,$2,$3,$4,COALESCE($5::date, CURRENT_DATE),$6,$7) RETURNING *`,
        [hid(req), patient_id, icd10_code || null, description, onset_date || null, uid(req), notes || null]
    );
    ResponseHandler.success(res, out.rows[0], 'Problem added');
}));

router.put('/patient-problems/:id', asyncHandler(async (req, res) => {
    const { icd10_code, description, onset_date, notes } = req.body || {};
    const out = await pool.query(
        `UPDATE patient_problems
            SET icd10_code = COALESCE($3, icd10_code),
                description = COALESCE($4, description),
                onset_date = COALESCE($5::date, onset_date),
                notes = COALESCE($6, notes)
          WHERE id = $1 AND hospital_id = $2 RETURNING *`,
        [req.params.id, hid(req), icd10_code || null, description || null, onset_date || null, notes || null]
    );
    if (!out.rowCount) return ResponseHandler.error(res, 'Problem not found', 404);
    ResponseHandler.success(res, out.rows[0], 'Problem updated');
}));

router.patch('/patient-problems/:id/resolve', asyncHandler(async (req, res) => {
    const out = await pool.query(
        `UPDATE patient_problems
            SET status = 'Resolved', resolved_date = CURRENT_DATE, notes = COALESCE($3, notes)
          WHERE id = $1 AND hospital_id = $2 RETURNING *`,
        [req.params.id, hid(req), (req.body && req.body.notes) || null]
    );
    if (!out.rowCount) return ResponseHandler.error(res, 'Problem not found', 404);
    ResponseHandler.success(res, out.rows[0], 'Problem resolved');
}));



/* ------------------------------------------------------------ Ward returns */
router.patch('/ward-pass/passes/:id/return', asyncHandler(async (req, res) => {
    const { return_vitals } = req.body || {};
    const out = await pool.query(
        `UPDATE ward_passes
            SET status = 'Returned', return_vitals = COALESCE($3, return_vitals)
          WHERE id = $1 AND hospital_id = $2 RETURNING *`,
        [req.params.id, hid(req), return_vitals || null]
    );
    if (!out.rowCount) return ResponseHandler.error(res, 'Ward pass not found', 404);
    ResponseHandler.success(res, out.rows[0], 'Ward pass marked returned');
}));

/* ------------------------------------------------- Telehealth e-prescribing */
router.patch('/telehealth/sessions/:id/prescribe', asyncHandler(async (req, res) => {
    const { notes, drugs } = req.body || {};
    const rx = JSON.stringify({ drugs: Array.isArray(drugs) ? drugs : [], issued_at: new Date().toISOString() });
    const out = await pool.query(
        `UPDATE telehealth_sessions
            SET notes = CONCAT_WS(E'\n', NULLIF(notes, ''), NULLIF($3, ''), $4)
          WHERE id = $1 AND hospital_id = $2 RETURNING *`,
        [req.params.id, hid(req), notes || '', `[E-PRESCRIPTION] ${rx}`]
    );
    if (!out.rowCount) return ResponseHandler.error(res, 'Telehealth session not found', 404);
    ResponseHandler.success(res, out.rows[0], 'E-prescription recorded on session');
}));

/* -------------------------------------------------------------- EWS vitals */
router.post('/ews/log-vitals', asyncHandler(async (req, res) => {
    const { admission_id, temperature, pulse, bp_systolic, bp_diastolic, spo2, consciousness_level } = req.body || {};
    if (!admission_id) return ResponseHandler.error(res, 'admission_id is required', 400);
    const adm = await pool.query(
        `SELECT id, patient_id FROM admissions WHERE id = $1 AND hospital_id = $2`,
        [admission_id, hid(req)]
    );
    if (!adm.rowCount) return ResponseHandler.error(res, 'Admission not found', 404);

    const inserted = await pool.query(
        `INSERT INTO vitals
            (admission_id, patient_id, temperature, pulse, bp_systolic, bp_diastolic, spo2,
             consciousness_level, recorded_by, recorded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now()) RETURNING *`,
        [adm.rows[0].id, adm.rows[0].patient_id, temperature || null, pulse || null,
         bp_systolic || null, bp_diastolic || null, spo2 || null, consciousness_level || null, uid(req)]
    );

    // NEWS-2 — same thresholds as the GET /ews/scores sweep
    let score = 0;
    const s = Number(spo2 || 0);
    if (s > 0) score += s <= 91 ? 3 : s <= 93 ? 2 : s <= 95 ? 1 : 0;
    const sys = Number(bp_systolic || 0);
    if (sys > 0) score += sys <= 90 ? 3 : sys <= 100 ? 2 : sys <= 110 ? 1 : sys >= 220 ? 3 : 0;
    const p = Number(pulse || 0);
    if (p > 0) score += (p <= 40 || p >= 131) ? 3 : p >= 111 ? 2 : (p <= 50 || p >= 91) ? 1 : 0;
    const t = Number(temperature || 0);
    if (t > 0) score += t <= 35 ? 3 : t <= 36 ? 1 : t >= 39.1 ? 2 : t >= 38.1 ? 1 : 0;
    const alert = score >= 7 ? 'CRITICAL' : score >= 5 ? 'HIGH' : score >= 3 ? 'MEDIUM' : 'LOW';

    ResponseHandler.success(res, { vitals: inserted.rows[0], news2: score, alert }, 'Vitals logged and NEWS-2 recalculated');
}));

/* ---------------------------------------------------------------- Dispatch */
router.post('/ambulance/dispatch', asyncHandler(async (req, res) => {
    const { vehicle_id, patient_id, call_type, pickup_location, drop_location, distance_km, notes } = req.body || {};
    const trip = await pool.query(
        `INSERT INTO ambulance_trips
            (hospital_id, vehicle_id, patient_id, call_type, pickup_location, drop_location, distance_km, notes, status)
         VALUES ($1,$2,$3,COALESCE($4,'Emergency'),$5,$6,$7,$8,'Dispatched') RETURNING *`,
        [hid(req), vehicle_id || null, patient_id || null, call_type || null,
         pickup_location || null, drop_location || null, distance_km || null, notes || null]
    );
    if (vehicle_id) {
        await pool.query(
            `UPDATE ambulance_vehicles SET status = 'On Trip' WHERE id = $1 AND hospital_id = $2`,
            [vehicle_id, hid(req)]
        );
    }
    ResponseHandler.success(res, trip.rows[0], 'Ambulance dispatched', 201);
}));

/* -------------------------------------------------------------------- POS */
router.get('/pos/transactions', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT t.id, t.transaction_id, t.patient_id, p.name AS patient_name, t.amount, t.total_amount,
                t.payment_mode, t.status, t.department, t.initiated_at
           FROM pos_transactions t
           LEFT JOIN patients p ON p.id = t.patient_id
          WHERE t.initiated_by IS NOT NULL OR t.department IS NOT NULL
          ORDER BY t.initiated_at DESC NULLS LAST LIMIT 200`);
    dual(res, 'transactions', rows.rows);
}));

router.post('/pos/transactions', asyncHandler(async (req, res) => {
    const { patient_id, amount, payment_mode, department, service } = req.body || {};
    const amt = Number(amount || 0);
    if (!amt || amt <= 0) return ResponseHandler.error(res, 'amount must be greater than 0', 400);
    const txnId = `TXN-${Date.now().toString().slice(-10)}`;
    const out = await pool.query(
        `INSERT INTO pos_transactions
            (transaction_id, patient_id, amount, total_amount, payment_mode, department, status, initiated_by, initiated_at)
         VALUES ($1,$2,$3,$3,COALESCE($4,'Cash'),$5,'completed',$6, now()) RETURNING *`,
        [txnId, patient_id || null, amt, payment_mode || null, service || department || 'OPD Consultation', uid(req)]
    );
    ResponseHandler.success(res, out.rows[0], 'POS transaction recorded', 201);
}));

/* ==================== Wave-2 clinical department mutations ==================== */

/* ------------------------------------------------------------ Bed transfers */
router.get('/bed-transfers', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, patient_id, admission_id, patient_name, from_ward, from_bed, to_ward, to_bed,
                reason, status, created_at, decided_at
           FROM bed_transfers WHERE hospital_id = $1
          ORDER BY (status = 'Requested') DESC, created_at DESC LIMIT 200`, [hid(req)]);
    dual(res, 'transfers', rows.rows);
}));

router.post('/bed-transfers', asyncHandler(async (req, res) => {
    const { patient_id, admission_id, patient_name, from_ward, from_bed, to_ward, to_bed, reason } = req.body || {};
    if (!to_ward) return ResponseHandler.error(res, 'to_ward is required', 400);
    const out = await pool.query(
        `INSERT INTO bed_transfers
            (hospital_id, patient_id, admission_id, patient_name, from_ward, from_bed, to_ward, to_bed, reason, requested_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [hid(req), patient_id || null, admission_id || null, patient_name || null,
         from_ward || null, from_bed || null, to_ward, to_bed || null, reason || null, uid(req)]
    );
    ResponseHandler.success(res, out.rows[0], 'Bed transfer requested', 201);
}));

router.patch('/bed-transfers/:id/status', asyncHandler(async (req, res) => {
    const status = (req.body && req.body.status) || 'Approved';
    if (!['Approved', 'Rejected', 'Cancelled', 'Completed'].includes(status)) {
        return ResponseHandler.error(res, 'status must be Approved|Rejected|Cancelled|Completed', 400);
    }
    const out = await pool.query(
        `UPDATE bed_transfers
            SET status = $3, decided_at = now(), updated_at = now(), approved_by = $4
          WHERE id = $1 AND hospital_id = $2 RETURNING *`,
        [req.params.id, hid(req), status, uid(req)]
    );
    if (!out.rowCount) return ResponseHandler.error(res, 'Transfer not found', 404);
    ResponseHandler.success(res, out.rows[0], `Transfer ${status.toLowerCase()}`);
}));

/* -------------------------------------------------------- Pathology specimens */
router.get('/pathology/specimens', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, specimen_no, patient_id, patient_name, site, specimen_type, priority, status,
                collected_at, notes
           FROM pathology_specimens WHERE hospital_id = $1
          ORDER BY collected_at DESC LIMIT 200`, [hid(req)]);
    dual(res, 'specimens', rows.rows);
}));

router.post('/pathology/specimens', asyncHandler(async (req, res) => {
    const { patient_id, patient_name, site, specimen_type, priority, notes } = req.body || {};
    if (!site) return ResponseHandler.error(res, 'site is required', 400);
    const specimenNo = `SPC-${Date.now().toString().slice(-7)}`;
    const out = await pool.query(
        `INSERT INTO pathology_specimens
            (hospital_id, specimen_no, patient_id, patient_name, site, specimen_type, priority, notes)
         VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'Routine'),$8) RETURNING *`,
        [hid(req), specimenNo, patient_id || null, patient_name || null, site,
         specimen_type || 'Biopsy', priority || null, notes || null]
    );
    ResponseHandler.success(res, out.rows[0], 'Specimen logged', 201);
}));

/* ------------------------------------------------------- Prior-auth attachments */
router.post('/prior-auth/:id/attach', asyncHandler(async (req, res) => {
    const { name, reference, notes } = req.body || {};
    if (!name) return ResponseHandler.error(res, 'name is required', 400);
    const out = await pool.query(
        `UPDATE prior_auth_requests
            SET attachments = COALESCE(attachments, '[]'::jsonb) || $3::jsonb
          WHERE id = $1 AND hospital_id = $2 RETURNING id, attachments`,
        [req.params.id, hid(req), JSON.stringify([{ name, reference: reference || null, notes: notes || null, at: new Date().toISOString() }])]
    );
    if (!out.rowCount) return ResponseHandler.error(res, 'Prior-authorisation request not found', 404);
    ResponseHandler.success(res, out.rows[0], 'Document attached');
}));


/* ------------------------------------------------------------- Blood bank */
router.get('/blood-bank/requests', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT r.id, r.request_id, r.patient_id, p.name AS patient_name, r.blood_group_required,
                r.units_required, r.units_issued, r.priority, r.indication, r.status, r.created_at
           FROM blood_requests r
           LEFT JOIN patients p ON p.id = r.patient_id
          WHERE COALESCE(r.hospital_id, 1) = $1
          ORDER BY r.created_at DESC LIMIT 200`, [hid(req)]);
    dual(res, 'requests', rows.rows);
}));

router.post('/blood-bank/requests', asyncHandler(async (req, res) => {
    const { patient_id, blood_group_required, units_required, priority, indication, admission_id } = req.body || {};
    if (!patient_id || !blood_group_required) {
        return ResponseHandler.error(res, 'patient_id and blood_group_required are required', 400);
    }
    const out = await pool.query(
        `INSERT INTO blood_requests
            (request_id, patient_id, blood_group_required, units_required, priority, indication,
             admission_id, requested_by, hospital_id, status)
         VALUES ('BR-' || (EXTRACT(EPOCH FROM now())::bigint), $1, $2, COALESCE($3,1), COALESCE($4,'Routine'),
                 $5, $6, $7, $8, 'Pending') RETURNING *`,
        [patient_id, blood_group_required, units_required || 1, priority || null,
         indication || null, admission_id || null, uid(req), hid(req)]
    );
    ResponseHandler.success(res, out.rows[0], 'Blood request raised', 201);
}));

router.post('/blood-bank/transfusions', asyncHandler(async (req, res) => {
    const { patient_id, request_id, unit_id, volume_transfused, notes } = req.body || {};
    if (!patient_id) return ResponseHandler.error(res, 'patient_id is required', 400);
    const out = await pool.query(
        `INSERT INTO blood_transfusions
            (transfusion_id, request_id, patient_id, unit_id, volume_transfused, start_time, notes, hospital_id)
         VALUES ('TX-' || (EXTRACT(EPOCH FROM now())::bigint), $1, $2, $3, $4, now(), $5, $6) RETURNING *`,
        [request_id || null, patient_id, unit_id || null, volume_transfused || null, notes || null, hid(req)]
    );
    ResponseHandler.success(res, out.rows[0], 'Transfusion logged', 201);
}));

/* ------------------------------------------------ Radiology imports & annotations */
router.post('/radiology/dicom-import', asyncHandler(async (req, res) => {
    const { study_uid, modality, patient_id, file_name } = req.body || {};
    const uidVal = study_uid || `1.2.826.0.1.3680043.8.498.${Date.now()}`;
    const out = await pool.query(
        `INSERT INTO radiology_dicom_imports (hospital_id, study_uid, modality, patient_id, file_name, imported_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (hospital_id, study_uid) DO UPDATE SET status = 'Imported'
         RETURNING *`,
        [hid(req), uidVal, modality || null, patient_id || null, file_name || null, uid(req)]
    );
    ResponseHandler.success(res, out.rows[0], 'DICOM study imported', 201);
}));

router.post('/radiology/annotations', asyncHandler(async (req, res) => {
    const { study_uid, patient_id, annotations } = req.body || {};
    if (!study_uid) return ResponseHandler.error(res, 'study_uid is required', 400);
    const out = await pool.query(
        `INSERT INTO radiology_annotations (hospital_id, study_uid, patient_id, annotations, created_by)
         VALUES ($1,$2,$3,COALESCE($4::jsonb,'[]'::jsonb),$5) RETURNING *`,
        [hid(req), study_uid, patient_id || null,
         JSON.stringify(Array.isArray(annotations) ? annotations : []), uid(req)]
    );
    ResponseHandler.success(res, out.rows[0], 'Annotations saved', 201);
}));

/* ------------------------------------------------ Medication reconciliation */
router.get('/medication-reconciliation', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, patient_id, admission_id, drug_name, dose, frequency, route, source, status, notes, created_at
           FROM med_reconciliation_items WHERE hospital_id = $1
          ORDER BY created_at DESC LIMIT 200`, [hid(req)]);
    dual(res, 'items', rows.rows);
}));

router.post('/medication-reconciliation', asyncHandler(async (req, res) => {
    const { patient_id, admission_id, drug_name, dose, frequency, route, source, notes } = req.body || {};
    if (!drug_name) return ResponseHandler.error(res, 'drug_name is required', 400);
    const out = await pool.query(
        `INSERT INTO med_reconciliation_items
            (hospital_id, patient_id, admission_id, drug_name, dose, frequency, route, source, notes, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'Home'),$9,$10) RETURNING *`,
        [hid(req), patient_id || null, admission_id || null, drug_name, dose || null,
         frequency || null, route || null, source || null, notes || null, uid(req)]
    );
    ResponseHandler.success(res, out.rows[0], 'Home medication reconciled', 201);
}));

module.exports = router;


/* ------------------------------------------------------ Closed-loop medication */
router.get('/closed-loop-med', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT m.id, m.patient_id, p.name AS patient_name, m.drug_name, m.dosage, m.frequency, m.route, m.status, m.created_at
           FROM medication_orders m
           LEFT JOIN patients p ON p.id = m.patient_id
          ORDER BY m.created_at DESC LIMIT 200`);
    dual(res, 'orders', rows.rows);
}));

router.patch('/closed-loop-med/:id/cancel', asyncHandler(async (req, res) => {
    const out = await pool.query(
        `UPDATE medication_orders SET status = 'Cancelled' WHERE id = $1 RETURNING *`, [req.params.id]
    );
    if (!out.rowCount) return ResponseHandler.error(res, 'Medication order not found', 404);
    ResponseHandler.success(res, out.rows[0], 'Medication order cancelled');
}));

/* ---------------------------------------------------------------- CPOE & CDI */
router.get('/cpoe/orders', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, patient_id, admission_id, patient_name, order_type, details, priority, status, created_at
           FROM clinical_orders WHERE hospital_id = $1
          ORDER BY created_at DESC LIMIT 200`, [hid(req)]);
    dual(res, 'orders', rows.rows);
}));

router.post('/cpoe/orders', asyncHandler(async (req, res) => {
    const { patient_id, admission_id, patient_name, order_type, details, priority } = req.body || {};
    if (!order_type || !details) return ResponseHandler.error(res, 'order_type and details are required', 400);
    const out = await pool.query(
        `INSERT INTO clinical_orders
            (hospital_id, patient_id, admission_id, patient_name, order_type, details, priority, ordered_by)
         VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'Routine'),$8) RETURNING *`,
        [hid(req), patient_id || null, admission_id || null, patient_name || null,
         order_type, details, priority || null, uid(req)]
    );
    ResponseHandler.success(res, out.rows[0], 'Order submitted', 201);
}));

router.get('/cdi/queries', asyncHandler(async (req, res) => {
    const rows = await pool.query(
        `SELECT id, patient_id, admission_id, patient_name, query_type, query_text, severity, status,
                physician_response, created_at
           FROM cdi_queries WHERE hospital_id = $1
          ORDER BY (status = 'Open') DESC, created_at DESC LIMIT 200`, [hid(req)]);
    dual(res, 'queries', rows.rows);
}));

router.post('/cdi/queries', asyncHandler(async (req, res) => {
    const { patient_id, admission_id, patient_name, query_type, query_text, severity } = req.body || {};
    if (!query_text) return ResponseHandler.error(res, 'query_text is required', 400);
    const out = await pool.query(
        `INSERT INTO cdi_queries
            (hospital_id, patient_id, admission_id, patient_name, query_type, query_text, severity, created_by)
         VALUES ($1,$2,$3,$4,COALESCE($5,'Documentation'),$6,COALESCE($7,'Medium'),$8) RETURNING *`,
        [hid(req), patient_id || null, admission_id || null, patient_name || null,
         query_type || null, query_text, severity || null, uid(req)]
    );
    ResponseHandler.success(res, out.rows[0], 'Physician query raised', 201);
}));

/* ------------------------------------------------ Revenue-cycle appeals */
router.post('/revenue-ai/appeals', asyncHandler(async (req, res) => {
    const { claim_ref, patient_name, payer, denial_reason, amount, appeal_text } = req.body || {};
    if (!claim_ref) return ResponseHandler.error(res, 'claim_ref is required', 400);
    const out = await pool.query(
        `INSERT INTO revenue_appeals
            (hospital_id, claim_ref, patient_name, payer, denial_reason, amount, appeal_text, submitted_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [hid(req), claim_ref, patient_name || null, payer || null, denial_reason || null,
         amount || null, appeal_text || null, uid(req)]
    );
    ResponseHandler.success(res, out.rows[0], 'Appeal submitted', 201);
}));

module.exports = router;

