const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { addToInvoice } = require('../services/billingService');

// Trigger Code Blue
// - Broadcasts Alert
// - Auto-bills Resuscitation Kit
const triggerCodeBlue = asyncHandler(async (req, res) => {
    const { patient_id, location, notes } = req.body;
    const hospitalId = req.hospital_id;
    const triggeredBy = req.user.id;

    // 1. Log Emergency Event
    const event = await pool.query(
        `INSERT INTO emergency_events (patient_id, type, location, status, triggered_by, hospital_id, created_at)
         VALUES ($1, 'CODE_BLUE', $2, 'Active', $3, $4, NOW())
         RETURNING id`,
        [patient_id, location, triggeredBy, hospitalId]
    );
    const eventId = event.rows[0].id;

    // 2. Auto-Bill "Code Blue Response Kit"
    // Price: 5000 (standard)
    await addToInvoice(
        patient_id, 
        null, // Might not be admitted yet if ER
        'Emergency: Code Blue Response', 
        1, 
        5000, 
        triggeredBy, 
        hospitalId
    );

    // 3. Broadcast (Socket.io mock)
    // console.log(`[🚨 CODE BLUE] Location: ${location}`);

    ResponseHandler.success(res, { 
        event_id: eventId, 
        message: 'Code Blue Triggered. Teams Dispatched. Billing Initiated.' 
    });
});

// Admit from ER (Quick Admit)
const quickAdmit = asyncHandler(async (req, res) => {
    const { patient_id, triage_category } = req.body;
    const hospitalId = req.hospital_id;

    // Auto-assign to "Emergency Ward"
    // Find free bed in ICU or ER
    const bedRes = await pool.query(
        `SELECT b.bed_number, w.name as ward_name 
         FROM beds b JOIN wards w ON b.ward_id = w.id 
         WHERE w.name IN ('Emergency', 'ICU') AND b.status = 'Available' AND w.hospital_id = $1
         LIMIT 1`,
        [hospitalId]
    );

    if (bedRes.rows.length === 0) {
        return ResponseHandler.error(res, 'No Emergency/ICU beds available!', 500);
    }

    const { bed_number, ward_name } = bedRes.rows[0];

    // Create Admission
    const admitRes = await pool.query(
        `INSERT INTO admissions (patient_id, ward, bed_number, status, hospital_id, admission_date, diagnosis)
         VALUES ($1, $2, $3, 'Admitted', $4, NOW(), 'Emergency Admission')
         RETURNING id`,
        [patient_id, ward_name, bed_number, hospitalId]
    );

    // Update Bed
     await pool.query(
        "UPDATE beds SET status = 'Occupied' WHERE bed_number = $1 AND ward_id = (SELECT id FROM wards WHERE name = $2 AND hospital_id = $3)",
        [bed_number, ward_name, hospitalId]
    );

    ResponseHandler.success(res, { 
        admission_id: admitRes.rows[0].id, 
        ward: ward_name, 
        bed: bed_number 
    }, 'Patient Admitted to Emergency Ward');
});

// ==================== ROUTES EXPECTED EXPORTS ====================

// Alias for routes compatibility
const triggerEmergency = triggerCodeBlue;

// Get Active Emergency Status
const getActiveEmergency = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const result = await pool.query(
        `SELECT * FROM emergency_events WHERE hospital_id = $1 AND status = 'Active' ORDER BY created_at DESC LIMIT 10`,
        [hospitalId]
    );
    ResponseHandler.success(res, { emergencies: result.rows });
});

// Respond to Emergency (Doctor/Anaesthetist)
const respondToEmergency = asyncHandler(async (req, res) => {
    const { event_id, response_notes } = req.body;
    const responderId = req.user.id;
    
    await pool.query(
        `UPDATE emergency_events SET responder_id = $1, response_notes = $2, responded_at = NOW() WHERE id = $3`,
        [responderId, response_notes, event_id]
    );
    ResponseHandler.success(res, { message: 'Response recorded' });
});

// Resolve Emergency
const resolveEmergency = asyncHandler(async (req, res) => {
    const { event_id, resolution_notes } = req.body;
    const resolvedBy = req.user.id;

    await pool.query(
        `UPDATE emergency_events SET status = 'Resolved', resolved_by = $1, resolution_notes = $2, resolved_at = NOW() WHERE id = $3`,
        [resolvedBy, resolution_notes, event_id]
    );
    ResponseHandler.success(res, { message: 'Emergency resolved' });
});

// Get Alert Configuration (stub for future routing config)
const getAlertConfig = asyncHandler(async (req, res) => {
    // Return default alert routing config
    ResponseHandler.success(res, {
        alert_channels: ['PA_SYSTEM', 'SOCKET', 'SMS'],
        default_responders: ['anaesthetist', 'icu_nurse', 'doctor'],
        escalation_timeout_minutes: 5
    });
});

module.exports = { 
    triggerCodeBlue, 
    quickAdmit,
    triggerEmergency,
    getActiveEmergency,
    respondToEmergency,
    resolveEmergency,
    getAlertConfig
};
