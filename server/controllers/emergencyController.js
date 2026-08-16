const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { addToInvoice } = require('../services/billingService');
const { getHospitalId } = require('../utils/tenantHelper');
const BillingInterceptor = require('../services/BillingInterceptor');

// Trigger Emergency / Code Blue
// - Logs into emergency_logs & emergency_events
// - Broadcasts via Socket.IO
// - Auto-bills Resuscitation Kit if patient_id is present
const triggerCodeBlue = asyncHandler(async (req, res) => {
    const {
        patient_id, patientId,
        location, wardId, bedNumber,
        type, emergencyType,
        code,
        notes
    } = req.body;

    const hospitalId = getHospitalId(req) || 1;
    const triggeredBy = req.user?.id || 1;
    const triggeredByName = req.user?.username || 'Staff';
    const pid = patientId || patient_id || null;
    const eLocation = location || (wardId ? `Ward ${wardId} ${bedNumber || ''}`.trim() : bedNumber || 'Ward A');

    // Normalize code string e.g. "Blue", "Red", "Yellow"
    let cleanCode = code || (type ? type.replace(/^CODE_/i, '') : null) || (emergencyType ? emergencyType.replace(/^CODE_/i, '') : null) || 'Blue';
    cleanCode = cleanCode.charAt(0).toUpperCase() + cleanCode.slice(1).toLowerCase();
    const eType = `CODE_${cleanCode.toUpperCase()}`;

    // 1. Insert into emergency_logs (Primary Ward Emergency table)
    const logRes = await pool.query(
        `INSERT INTO emergency_logs (code, location, status, triggered_by, hospital_id, triggered_at, patient_id, notes)
         VALUES ($1, $2, 'Active', $3, $4, NOW(), $5, $6)
         RETURNING id, code, location, status, triggered_at`,
        [cleanCode, eLocation, triggeredBy, hospitalId, pid, notes || null]
    );
    const emergencyLog = logRes.rows[0];

    // 2. Also log in emergency_events for multi-system auditing
    await pool.query(
        `INSERT INTO emergency_events (hospital_id, event_type, type, location, status, patient_id, reported_by, triggered_by, triggered_at, description)
         VALUES ($1, $2, $3, $4, 'Active', $5, $6, $7, NOW(), $8)`,
        [hospitalId, eType, eType, eLocation, pid, triggeredBy, triggeredBy, notes || `Emergency ${cleanCode}`]
    ).catch(err => console.warn('[Emergency Events Insert Warning]', err.message));

    // 3. Auto-Bill Code Blue Response Kit via BillingInterceptor ONLY for Code Blue / Cardiac Arrest
    const isCodeBlue = cleanCode.toUpperCase() === 'BLUE' || eType === 'CODE_BLUE' || eType === 'CARDIAC_ARREST';
    if (pid && isCodeBlue) {
        await BillingInterceptor.captureCharge(
            pid,
            BillingInterceptor.SOURCE_MODULES?.EMERGENCY || 'EMERGENCY',
            'Emergency: Code Blue Resuscitation Response Kit',
            1,
            5000.00,
            { capturedBy: triggeredBy },
            hospitalId
        ).catch(err => console.warn('[Code Blue BillingInterceptor] Charge capture failed:', err.message));
    }

    const alertMessages = {
        'CODE_BLUE': `🚨 CODE BLUE ALERT DISPATCHED to ${eLocation}. Crash cart & resuscitation team mobilized.`,
        'CODE_RED': `🔥 CODE RED ALERT DISPATCHED to ${eLocation}. Evacuation & fire safety protocol activated.`,
        'CODE_PINK': `👶 CODE PINK ALERT DISPATCHED to ${eLocation}. Hospital exit gates locked down.`,
        'CODE_BLACK': `💣 CODE BLACK ALERT DISPATCHED to ${eLocation}. Security forces alerted.`,
        'CODE_ORANGE': `☣️ CODE ORANGE ALERT DISPATCHED to ${eLocation}. Biohazard response team deployed.`,
        'CODE_YELLOW': `🚑 CODE YELLOW ALERT DISPATCHED to ${eLocation}. Emergency Triage active.`,
        'CODE_GREY': `🛡️ CODE GREY ALERT DISPATCHED to ${eLocation}. Security personnel responding.`
    };

    const alertMsg = alertMessages[eType] || `🚨 EMERGENCY ALERT (CODE ${cleanCode.toUpperCase()}) DISPATCHED to ${eLocation}.`;

    const payload = {
        id: emergencyLog.id,
        event_id: emergencyLog.id,
        code: cleanCode,
        emergency_type: eType,
        location: eLocation,
        status: 'Active',
        triggered_at: emergencyLog.triggered_at,
        triggered_by_name: triggeredByName,
        message: alertMsg
    };

    // 4. Real-time Broadcast via Socket.IO
    if (req.io) {
        req.io.emit('emergency_broadcast', payload);
        req.io.to(`hosp_${hospitalId}`).emit('emergency_broadcast', payload);
    }

    ResponseHandler.success(res, payload, alertMsg);
});

// Admit from ER (Quick Admit)
const quickAdmit = asyncHandler(async (req, res) => {
    const { patient_id, triage_category } = req.body;
    const hospitalId = getHospitalId(req) || 1;

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

    const admitRes = await pool.query(
        `INSERT INTO admissions (patient_id, ward, bed_number, status, hospital_id, admission_date, diagnosis)
         VALUES ($1, $2, $3, 'Admitted', $4, NOW(), 'Emergency Admission')
         RETURNING id`,
        [patient_id, ward_name, bed_number, hospitalId]
    );

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

// Alias for routes compatibility
const triggerEmergency = triggerCodeBlue;

// Get Active Emergency Status
const getActiveEmergency = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req) || 1;
    const result = await pool.query(
        `SELECT id, code, location, status, triggered_at, triggered_by, patient_id
         FROM emergency_logs 
         WHERE hospital_id = $1 AND status = 'Active' 
         ORDER BY triggered_at DESC, id DESC LIMIT 1`,
        [hospitalId]
    );
    const active = result.rows[0] || null;
    ResponseHandler.success(res, active);
});

// Respond to Emergency (Doctor/Anaesthetist)
const respondToEmergency = asyncHandler(async (req, res) => {
    const { event_id, id, response_notes } = req.body;
    const targetId = id || event_id;
    const responderId = req.user?.id || 1;
    
    await pool.query(
        `UPDATE emergency_events SET responder_id = $1, response_notes = $2, responded_at = NOW() WHERE id = $3`,
        [responderId, response_notes, targetId]
    );
    ResponseHandler.success(res, { message: 'Response recorded' });
});

// Resolve Emergency
const resolveEmergency = asyncHandler(async (req, res) => {
    const { event_id, id, resolution_notes } = req.body;
    const targetId = id || event_id;
    const hospitalId = getHospitalId(req) || 1;
    const resolvedBy = req.user?.id || 1;
    const resolvedByName = req.user?.username || 'Staff';

    let logQuery = `UPDATE emergency_logs SET status = 'Resolved', resolved_by = $1, resolved_at = NOW(), resolution_notes = $2 WHERE hospital_id = $3`;
    const logParams = [resolvedBy, resolution_notes || 'Resolved by user', hospitalId];
    if (targetId) {
        logQuery += ` AND id = $4`;
        logParams.push(targetId);
    } else {
        logQuery += ` AND status = 'Active'`;
    }
    await pool.query(logQuery, logParams);

    let evQuery = `UPDATE emergency_events SET status = 'Resolved', resolved_by = $1, resolved_at = NOW(), resolution_notes = $2 WHERE hospital_id = $3`;
    const evParams = [resolvedBy, resolution_notes || 'Resolved by user', hospitalId];
    if (targetId) {
        evQuery += ` AND id = $4`;
        evParams.push(targetId);
    } else {
        evQuery += ` AND status = 'Active'`;
    }
    await pool.query(evQuery, evParams).catch(() => {});

    if (req.io) {
        req.io.emit('emergency_resolved', {
            id: targetId,
            resolved_by: resolvedByName,
            resolved_at: new Date()
        });
        req.io.to(`hosp_${hospitalId}`).emit('emergency_resolved', {
            id: targetId,
            resolved_by: resolvedByName,
            resolved_at: new Date()
        });
    }

    ResponseHandler.success(res, { success: true, message: 'Emergency resolved successfully' });
});

// Get Alert Configuration
const getAlertConfig = asyncHandler(async (req, res) => {
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
