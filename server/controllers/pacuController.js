const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get Dashboard Data - Multi-Tenant
exports.getDashboard = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const beds = await pool.query(`
        SELECT pb.*, p.name as patient_name, pr.admission_time, pr.status as recovery_status,
            (SELECT total_score FROM aldrete_scores WHERE record_id = pr.id ORDER BY timestamp DESC LIMIT 1) as last_aldrete_score
        FROM pacu_beds pb LEFT JOIN pacu_records pr ON pb.current_record_id = pr.id LEFT JOIN patients p ON pr.patient_id = p.id
        WHERE (pb.hospital_id = $1 OR pb.hospital_id IS NULL) ORDER BY pb.id
    `, [hospitalId]);

    const queue = await pool.query(`
        SELECT s.id as surgery_id, s.procedure_name, s.end_time, p.name as patient_name, p.id as patient_id
        FROM surgeries s JOIN patients p ON s.patient_id = p.id
        WHERE s.status = 'Completed' AND NOT EXISTS (SELECT 1 FROM pacu_records pr WHERE pr.surgery_id = s.id)
        AND (s.hospital_id = $1 OR s.hospital_id IS NULL) ORDER BY s.end_time DESC
    `, [hospitalId]);

    ResponseHandler.success(res, { beds: beds.rows, queue: queue.rows });
});

// Admit Patient - Multi-Tenant
exports.admitPatient = asyncHandler(async (req, res) => {
    const { surgery_id, patient_id, bed_id } = req.body;
    const hospitalId = getHospitalId(req);
    
    const record = await pool.query(`INSERT INTO pacu_records (surgery_id, patient_id, bed_id, hospital_id) VALUES ($1, $2, $3, $4) RETURNING *`, [surgery_id, patient_id, bed_id, hospitalId]);
    const recordId = record.rows[0].id;
    await pool.query(`UPDATE pacu_beds SET status = 'Occupied', current_patient_id = $1, current_record_id = $2 WHERE id = $3`, [patient_id, recordId, bed_id]);
    ResponseHandler.success(res, { message: 'Admitted to PACU', recordId });
});

// Save Aldrete Score - Multi-Tenant
exports.saveAldreteScore = asyncHandler(async (req, res) => {
    const { record_id, activity, respiration, circulation, consciousness, o2, assessed_by } = req.body;
    const hospitalId = getHospitalId(req);

    await pool.query(
        `INSERT INTO aldrete_scores (record_id, activity_score, respiration_score, circulation_score, consciousness_score, o2_saturation_score, assessed_by, hospital_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [record_id, activity, respiration, circulation, consciousness, o2, assessed_by, hospitalId]
    );
    ResponseHandler.success(res, { message: 'Score Saved' });
});

// Discharge Patient - Multi-Tenant
exports.dischargePatient = asyncHandler(async (req, res) => {
    const { record_id, destination } = req.body;
    const hospitalId = getHospitalId(req);
    
    const rec = await pool.query('SELECT bed_id FROM pacu_records WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [record_id, hospitalId]);
    if (rec.rowCount === 0) return ResponseHandler.error(res, 'Record not found', 404);
    const bedId = rec.rows[0].bed_id;

    await pool.query(`UPDATE pacu_records SET status = 'Discharged', discharge_time = CURRENT_TIMESTAMP, discharge_destination = $1 WHERE id = $2`, [destination, record_id]);
    await pool.query(`UPDATE pacu_beds SET status = 'Available', current_patient_id = NULL, current_record_id = NULL WHERE id = $1`, [bedId]);
    ResponseHandler.success(res, { message: 'Patient Discharged from PACU' });
});
