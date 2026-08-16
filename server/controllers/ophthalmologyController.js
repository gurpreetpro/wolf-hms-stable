const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

function getHid(req) { return req.hospital_id || req.hospitalId || req.user?.hospital_id || 1; }

// Visits
const createVisit = asyncHandler(async (req, res) => {
  const hid = getHid(req);
  const { patient_id, visual_acuity_od, visual_acuity_os, best_corrected_od, best_corrected_os, iop_od, iop_os, refraction_sphere, refraction_cylinder, refraction_axis, diagnosis, treatment_plan, notes } = req.body;
  const doctor_id = req.user.id;
  if (!patient_id) return ResponseHandler.error(res, 'patient_id required', 400);
  const r = await pool.query(
    'INSERT INTO ophthalmology_visits (patient_id, visual_acuity_od, visual_acuity_os, best_corrected_od, best_corrected_os, iop_od, iop_os, refraction_sphere, refraction_cylinder, refraction_axis, diagnosis, treatment_plan, notes, doctor_id, hospital_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *',
    [patient_id, visual_acuity_od, visual_acuity_os, best_corrected_od, best_corrected_os, iop_od, iop_os, refraction_sphere, refraction_cylinder, refraction_axis, diagnosis, treatment_plan, notes, doctor_id, hid]);
  ResponseHandler.success(res, r.rows[0], 'Visit created', 201);
});

const getVisits = asyncHandler(async (req, res) => {
  const hid = getHid(req);
  const { patient_id } = req.query;
  let q = 'SELECT ov.*, p.name AS patient_name, u.username AS doctor_name FROM ophthalmology_visits ov LEFT JOIN patients p ON ov.patient_id = p.id LEFT JOIN users u ON ov.doctor_id = u.id WHERE ov.hospital_id = $1';
  const params = [hid];
  if (patient_id) { q += ' AND ov.patient_id = $2'; params.push(patient_id); }
  q += ' ORDER BY ov.created_at DESC LIMIT 100';
  const r = await pool.query(q, params);
  ResponseHandler.success(res, r.rows);
});

const getVisitById = asyncHandler(async (req, res) => {
  const hid = getHid(req);
  const { id } = req.params;
  const r = await pool.query('SELECT ov.*, p.name AS patient_name, u.username AS doctor_name FROM ophthalmology_visits ov LEFT JOIN patients p ON ov.patient_id = p.id LEFT JOIN users u ON ov.doctor_id = u.id WHERE ov.id = $1 AND ov.hospital_id = $2', [id, hid]);
  if (r.rows.length === 0) return ResponseHandler.error(res, 'Not found', 404);
  ResponseHandler.success(res, r.rows[0]);
});

// Procedures
const logProcedure = asyncHandler(async (req, res) => {
  const hid = getHid(req);
  const { visit_id, procedure_type, eye_selection, iol_power, iol_model, surgeon_id, complications } = req.body;
  if (!visit_id || !procedure_type) return ResponseHandler.error(res, 'visit_id and procedure_type required', 400);
  const r = await pool.query(
    'INSERT INTO ophthalmology_procedures (visit_id, procedure_type, eye_selection, iol_power, iol_model, surgeon_id, complications, hospital_id, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, Completed) RETURNING *',
    [visit_id, procedure_type, eye_selection, iol_power, iol_model, surgeon_id || req.user.id, complications, hid]);
  ResponseHandler.success(res, r.rows[0], 'Procedure logged', 201);
});

const getProcedures = asyncHandler(async (req, res) => {
  const hid = getHid(req);
  const { visit_id } = req.query;
  let q = 'SELECT op.*, u.username AS surgeon_name FROM ophthalmology_procedures op LEFT JOIN users u ON op.surgeon_id = u.id WHERE op.hospital_id = $1';
  const params = [hid];
  if (visit_id) { q += ' AND op.visit_id = $2'; params.push(visit_id); }
  q += ' ORDER BY op.created_at DESC LIMIT 200';
  const r = await pool.query(q, params);
  ResponseHandler.success(res, r.rows);
});

// Biometry
const addBiometry = asyncHandler(async (req, res) => {
  const hid = getHid(req);
  const { patient_id, axial_length_od, axial_length_os, k1_od, k1_os, k2_od, k2_os, acd_od, acd_os, lens_thickness_od, lens_thickness_os, wtw_od, wtw_os, iol_formula, target_refraction, measured_by } = req.body;
  if (!patient_id) return ResponseHandler.error(res, 'patient_id required', 400);
  const r = await pool.query(
    'INSERT INTO ophthalmology_biometry (patient_id, axial_length_od, axial_length_os, k1_od, k1_os, k2_od, k2_os, acd_od, acd_os, lens_thickness_od, lens_thickness_os, wtw_od, wtw_os, iol_formula, target_refraction, measured_by, hospital_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *',
    [patient_id, axial_length_od, axial_length_os, k1_od, k1_os, k2_od, k2_os, acd_od, acd_os, lens_thickness_od, lens_thickness_os, wtw_od, wtw_os, iol_formula, target_refraction, measured_by || req.user.id, hid]);
  ResponseHandler.success(res, r.rows[0], 'Biometry recorded', 201);
});

const getBiometry = asyncHandler(async (req, res) => {
  const hid = getHid(req);
  const { patient_id } = req.query;
  let q = 'SELECT ob.*, p.name AS patient_name, u.username AS measured_by_name FROM ophthalmology_biometry ob LEFT JOIN patients p ON ob.patient_id = p.id LEFT JOIN users u ON ob.measured_by = u.id WHERE ob.hospital_id = $1';
  const params = [hid];
  if (patient_id) { q += ' AND ob.patient_id = $2'; params.push(patient_id); }
  q += ' ORDER BY ob.measured_at DESC LIMIT 500';
  const r = await pool.query(q, params);
  ResponseHandler.success(res, r.rows);
});

// IOL Inventory
const getIOLInventory = asyncHandler(async (req, res) => {
  const hid = getHid(req);
  const { brand } = req.query;
  let q = 'SELECT * FROM ophthalmology_inventory WHERE hospital_id = $1';
  const params = [hid];
  if (brand) { q += ' AND brand = $2'; params.push(brand); }
  q += ' ORDER BY expiry_date ASC, stock_qty ASC LIMIT 200';
  const r = await pool.query(q, params);
  ResponseHandler.success(res, r.rows);
});

const addIOLInventory = asyncHandler(async (req, res) => {
  const hid = getHid(req);
  const { brand, model, diopter_range, stock_qty, lot_number, expiry_date, unit_price } = req.body;
  if (!brand || !model) return ResponseHandler.error(res, 'brand and model required', 400);
  const r = await pool.query(
    'INSERT INTO ophthalmology_inventory (brand, model, diopter_range, stock_qty, lot_number, expiry_date, unit_price, hospital_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [brand, model, diopter_range, stock_qty || 0, lot_number, expiry_date, unit_price || 0, hid]);
  ResponseHandler.success(res, r.rows[0], 'IOL inventory added', 201);
});

module.exports = { createVisit, getVisits, getVisitById, logProcedure, getProcedures, addBiometry, getBiometry, getIOLInventory, addIOLInventory };