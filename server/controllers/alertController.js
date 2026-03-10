const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const systemBus = require('../events/systemBus');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get active alerts for a patient - Multi-Tenant
const getPatientAlerts = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `SELECT * FROM clinical_alerts WHERE patient_id = $1 AND is_acknowledged = FALSE AND (hospital_id = $2 OR hospital_id IS NULL) ORDER BY created_at DESC`,
        [patient_id, hospitalId]
    );
    ResponseHandler.success(res, result.rows);
});

// Get all active alerts - Multi-Tenant
const getAllActiveAlerts = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `SELECT a.*, p.name as patient_name FROM clinical_alerts a LEFT JOIN patients p ON a.patient_id = p.id
            WHERE a.is_acknowledged = FALSE AND (a.hospital_id = $1 OR a.hospital_id IS NULL) ORDER BY a.created_at DESC`,
        [hospitalId]
    );
    ResponseHandler.success(res, result.rows);
});

// Acknowledge an alert - Multi-Tenant
const acknowledgeAlert = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { note } = req.body; // [INTEGRATION] Capture Read-back note
    const user_id = req.user.id;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `UPDATE clinical_alerts SET is_acknowledged = TRUE, acknowledged_by = $1, acknowledged_at = NOW(), acknowledgement_note = $4
            WHERE id = $2 AND (hospital_id = $3 OR hospital_id IS NULL) RETURNING *`,
        [user_id, id, hospitalId, note]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Alert not found', 404);
    ResponseHandler.success(res, result.rows[0]);
});

// Trigger Staff Duress - Multi-Tenant
const triggerDuress = asyncHandler(async (req, res) => {
    const { location } = req.body;
    const user = req.user;
    const hospitalId = getHospitalId(req);

    console.log('[ALERT] Duress Triggered by:', user.username);

    systemBus.emit(systemBus.EVENTS.CODE_VIOLET, {
        triggered_by_id: user.id, triggered_by_name: user.username, triggered_by_role: user.role,
        location: location || 'Unknown Location', timestamp: new Date(), hospital_id: hospitalId
    });

    ResponseHandler.success(res, { success: true, message: 'DURESS ALERT BROADCASTED' });
});

// Helper function to create alert - Multi-Tenant
// Not an API handler, so keeping as regular async function but with try-catch block for internal safety.
const createAlert = async (client, io, { patient_id, admission_id, type, severity, message, value, threshold, hospital_id }) => {
    try {
        const res = await client.query(
            `INSERT INTO clinical_alerts (patient_id, admission_id, type, severity, message, value, threshold, hospital_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [patient_id, admission_id, type, severity, message, value, threshold, hospital_id || 1]
        );
        const alert = res.rows[0];
        if (io) io.emit('clinical_alert', alert);
        return alert;
    } catch (err) {
        console.error('Error creating internal alert:', err);
        // We don't throw here to prevent crashing the caller process (usually a background job or another controller)
        // just log error
    }
};

module.exports = { getPatientAlerts, getAllActiveAlerts, acknowledgeAlert, createAlert, triggerDuress };
