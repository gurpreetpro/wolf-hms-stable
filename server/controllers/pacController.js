const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get Pending PACs - Multi-Tenant
exports.getPendingPAC = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const query = `
        SELECT s.id as surgery_id, s.patient_id, s.procedure_name, s.start_time, p.name as patient_name, p.age, p.gender, pac.fitness_status as current_status
        FROM surgeries s JOIN patients p ON s.patient_id = p.id LEFT JOIN pac_assessments pac ON s.id = pac.surgery_id
        WHERE s.status IN ('Scheduled', 'Urgent') AND (s.hospital_id = $1 OR s.hospital_id IS NULL) ORDER BY s.start_time ASC
    `;
    const result = await pool.query(query, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Get Single Assessment - Multi-Tenant
exports.getAssessment = asyncHandler(async (req, res) => {
    const { surgeryId } = req.params;
    const hospitalId = getHospitalId(req);
    const result = await pool.query('SELECT * FROM pac_assessments WHERE surgery_id = $1 AND (hospital_id = $2) ORDER BY created_at DESC LIMIT 1', [surgeryId, hospitalId]);
    if (result.rowCount === 0) return ResponseHandler.error(res, 'No assessment found', 404);
    ResponseHandler.success(res, result.rows[0]);
});

// Save Assessment - Multi-Tenant
exports.saveAssessment = asyncHandler(async (req, res) => {
    const { patient_id, surgery_id, anaesthetist_id, mallampati_score, asa_grade, airway_assessment, comorbidities, medications, fitness_status, remarks } = req.body;
    const hospitalId = getHospitalId(req);

    const check = await pool.query('SELECT id FROM pac_assessments WHERE surgery_id = $1 AND (hospital_id = $2)', [surgery_id, hospitalId]);

    if (check.rowCount > 0) {
        const updateQuery = `UPDATE pac_assessments SET mallampati_score = $1, asa_grade = $2, airway_assessment = $3, comorbidities = $4, medications = $5,
            fitness_status = $6, remarks = $7, anaesthetist_id = $8, updated_at = CURRENT_TIMESTAMP WHERE surgery_id = $9 RETURNING *`;
        const updated = await pool.query(updateQuery, [mallampati_score, asa_grade, JSON.stringify(airway_assessment), JSON.stringify(comorbidities), JSON.stringify(medications), fitness_status, remarks, anaesthetist_id, surgery_id]);
        return ResponseHandler.success(res, updated.rows[0]);
    } else {
        const insertQuery = `INSERT INTO pac_assessments (patient_id, surgery_id, anaesthetist_id, mallampati_score, asa_grade, airway_assessment, comorbidities, medications, fitness_status, remarks, hospital_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
        const inserted = await pool.query(insertQuery, [patient_id, surgery_id, anaesthetist_id, mallampati_score, asa_grade, JSON.stringify(airway_assessment), JSON.stringify(comorbidities), JSON.stringify(medications), fitness_status, remarks, hospitalId]);
        return ResponseHandler.success(res, inserted.rows[0], 'Assessment saved', 201);
    }
});
