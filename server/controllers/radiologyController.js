const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const IMAGING_TESTS = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'ECG', '2D Echo', 'Chest X-Ray', 'Abdomen X-Ray'];

// Get Imaging Queue - Multi-Tenant
const getImagingQueue = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`
        SELECT lr.id, lr.patient_id, lr.admission_id, lr.status, lr.requested_at, t.name as test_name, t.price, p.name as patient_name, p.gender
        FROM lab_requests lr JOIN lab_test_types t ON lr.test_type_id = t.id LEFT JOIN patients p ON lr.patient_id = p.id
        WHERE lr.status = 'Pending' AND (t.name ILIKE '%X-Ray%' OR t.name ILIKE '%CT%' OR t.name ILIKE '%MRI%' OR t.name ILIKE '%Ultrasound%' OR t.name ILIKE '%ECG%' OR t.name ILIKE '%Echo%')
        AND (lr.hospital_id = $1 OR lr.hospital_id IS NULL) ORDER BY lr.requested_at ASC
    `, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Get Imaging Templates - Multi-Tenant
const getImagingTemplates = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query("SELECT to_regclass('radiology_templates')");
    if (!result.rows[0].to_regclass) {
        return ResponseHandler.success(res, [
            { id: 1, name: 'Chest X-Ray Normal', content: 'Normal cardiac size. Clear lung fields.' },
            { id: 2, name: 'CT Brain Normal', content: 'No intracranial hemorrhage, mass effect, or infarct.' }
        ]);
    }
    const templates = await pool.query('SELECT * FROM radiology_templates WHERE (hospital_id = $1 OR hospital_id IS NULL) ORDER BY name ASC', [hospitalId]);
    ResponseHandler.success(res, templates.rows);
});

// Upload Imaging Result - Multi-Tenant
const uploadImagingResult = asyncHandler(async (req, res) => {
    const { request_id, findings, impression, recommendation, image_url, ai_tags, ai_confidence } = req.body;
    const technician_id = req.user.id;
    const hospitalId = getHospitalId(req);

    const result_json = {
        findings: findings || '', impression: impression || '', recommendation: recommendation || '',
        image_url: image_url || null, ai_tags: ai_tags || [], ai_confidence: ai_confidence || null,
        reported_by: req.user.username, reported_at: new Date().toISOString()
    };

    await pool.query('INSERT INTO lab_results (request_id, result_json, hospital_id) VALUES ($1, $2, $3)', [request_id, result_json, hospitalId]);
    
    // Attempt update although columns might not exist in all schema versions (safe failure handled if column missing, but good to wrap)
    try {
       await pool.query("UPDATE lab_results SET ai_tags = $1, ai_confidence = $2 WHERE request_id = $3", [ai_tags || [], ai_confidence || 0, request_id]);
    } catch (e) {
        console.warn('AI Tags update failed (column might be missing)', e.message);
    }

    await pool.query("UPDATE lab_requests SET status = 'Completed', updated_at = NOW(), image_url = $1 WHERE id = $2", [image_url, request_id]);
    ResponseHandler.success(res, { message: 'Imaging result uploaded successfully' });
});

// Get Imaging History - Multi-Tenant
const getImagingHistory = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`
        SELECT * FROM lab_requests WHERE status = 'Completed' 
        AND test_type_id IN (SELECT id FROM lab_test_types WHERE name ILIKE '%X-Ray%' OR name ILIKE '%CT%' OR name ILIKE '%MRI%')
        AND (hospital_id = $1 OR hospital_id IS NULL) ORDER BY updated_at DESC LIMIT 50
    `, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Get Radiology Stats - Multi-Tenant
const getRadiologyStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    
    // Count pending imaging studies
    const pendingResult = await pool.query(`
        SELECT COUNT(*) as count FROM lab_requests lr 
        JOIN lab_test_types t ON lr.test_type_id = t.id
        WHERE lr.status = 'Pending' 
        AND (t.name ILIKE '%X-Ray%' OR t.name ILIKE '%CT%' OR t.name ILIKE '%MRI%' OR t.name ILIKE '%Ultrasound%' OR t.name ILIKE '%ECG%' OR t.name ILIKE '%Echo%')
        AND (lr.hospital_id = $1 OR lr.hospital_id IS NULL)
    `, [hospitalId]);
    
    // Count completed today
    const completedResult = await pool.query(`
        SELECT COUNT(*) as count FROM lab_requests lr 
        JOIN lab_test_types t ON lr.test_type_id = t.id
        WHERE lr.status = 'Completed' 
        AND DATE(lr.updated_at) = CURRENT_DATE
        AND (t.name ILIKE '%X-Ray%' OR t.name ILIKE '%CT%' OR t.name ILIKE '%MRI%' OR t.name ILIKE '%Ultrasound%' OR t.name ILIKE '%ECG%' OR t.name ILIKE '%Echo%')
        AND (lr.hospital_id = $1 OR lr.hospital_id IS NULL)
    `, [hospitalId]);

    ResponseHandler.success(res, { 
        pending: parseInt(pendingResult.rows[0].count) || 0, 
        completed_today: parseInt(completedResult.rows[0].count) || 0 
    });
});

module.exports = { getImagingQueue, uploadImagingResult, getImagingHistory, getRadiologyStats, getImagingTemplates };
