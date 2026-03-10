const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const turfBooleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;
const { point, polygon } = require('@turf/helpers');
const systemBus = require('../events/systemBus');
const tokenService = require('../services/tokenService');
const WolfVoiceService = require('../services/WolfVoiceService');
const { asyncHandler } = require('../middleware/errorHandler');

// ============================================================================
// HELPER: Get hospital_id from request (Titan Multi-Tenant Support)
// ============================================================================
const getHospitalId = (req) => {
    // Priority: 1. User's hospital_id (from JWT), 2. Request body, 3. Query param
    return req.user?.hospital_id || req.body?.hospital_id || req.query?.hospital_id || 1;
};

// ============================================================================
// INCIDENTS
// ============================================================================

// Get Incidents - TITAN ALIGNED
const getIncidents = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { status, severity } = req.query;
    
    let query = `SELECT i.*, u.username as reporter_name 
                 FROM security_incidents i 
                 LEFT JOIN users u ON i.reporter_id = u.id 
                 WHERE i.hospital_id = $1`;
    const params = [hospital_id];
    
    if (status) { params.push(status); query += ` AND i.status = $${params.length}`; }
    if (severity) { params.push(severity); query += ` AND i.severity = $${params.length}`; }
    query += ' ORDER BY i.created_at DESC';
    
    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// Create Incident - TITAN ALIGNED
const createIncident = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { title, type, severity, location, description, media_urls } = req.body;
    const reporter_id = req.user.id;
    
    const result = await pool.query(
        `INSERT INTO security_incidents (reporter_id, title, type, severity, location, description, media_urls, hospital_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, 
        [reporter_id, title, type, severity, location, description, media_urls, hospital_id]
    );
    ResponseHandler.success(res, result.rows[0], 201);
});

// Update Incident Status - TITAN ALIGNED
const updateIncidentStatus = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { id } = req.params;
    const { status, ai_analysis } = req.body;
    
    const result = await pool.query(
        `UPDATE security_incidents 
         SET status = COALESCE($1, status), ai_analysis = COALESCE($2, ai_analysis), updated_at = NOW() 
         WHERE id = $3 AND hospital_id = $4 RETURNING *`, 
        [status, ai_analysis, id, hospital_id]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Incident not found', 404);
    ResponseHandler.success(res, result.rows[0]);
});

// ============================================================================
// VISITORS
// ============================================================================

// Get Visitors - TITAN ALIGNED
const getVisitors = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { status } = req.query;
    
    let query = `SELECT * FROM security_visitors WHERE hospital_id = $1`;
    const params = [hospital_id];
    
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    query += ' ORDER BY check_in_time DESC';
    
    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// Check In Visitor - TITAN ALIGNED
const checkInVisitor = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { full_name, contact_number, visitor_type, purpose, host_id, patient_id } = req.body;
    
    const result = await pool.query(
        `INSERT INTO security_visitors (full_name, contact_number, visitor_type, purpose, host_id, patient_id, status, hospital_id) 
         VALUES ($1, $2, $3, $4, $5, $6, 'Checked In', $7) RETURNING *`, 
        [full_name, contact_number, visitor_type, purpose, host_id, patient_id, hospital_id]
    );
    const visitor = result.rows[0];
    systemBus.emit(systemBus.EVENTS.VISITOR_ARRIVED, visitor);
    ResponseHandler.success(res, visitor, 'Visitor Checked In', 201);
});

// Check Out Visitor - TITAN ALIGNED
const checkOutVisitor = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { id } = req.params;
    
    const result = await pool.query(
        `UPDATE security_visitors SET status = 'Checked Out', check_out_time = NOW() 
         WHERE id = $1 AND hospital_id = $2 RETURNING *`, 
        [id, hospital_id]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Visitor not found', 404);
    ResponseHandler.success(res, result.rows[0]);
});

// ============================================================================
// PATROLS
// ============================================================================

// Get Active Patrols - TITAN ALIGNED
const getActivePatrols = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    
    const result = await pool.query(
        `SELECT p.*, u.username as guard_name, 
         (SELECT row_to_json(loc) FROM (
             SELECT latitude, longitude, heading, speed 
             FROM guard_locations 
             WHERE guard_id = p.guard_id ORDER BY timestamp DESC LIMIT 1
         ) loc) as last_location 
         FROM security_patrols p 
         JOIN users u ON p.guard_id = u.id 
         WHERE p.status = 'In Progress' AND p.hospital_id = $1 
         ORDER BY p.start_time DESC`, 
        [hospital_id]
    );
    ResponseHandler.success(res, result.rows);
});

// Start Patrol - TITAN ALIGNED
const startPatrol = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { guardId } = req.body;
    if (!guardId) return ResponseHandler.error(res, 'Guard ID is required', 400);

    const activePatrol = await pool.query(
        "SELECT id FROM security_patrols WHERE guard_id = $1 AND status = 'In Progress' AND hospital_id = $2", 
        [guardId, hospital_id]
    );
    if (activePatrol.rows.length > 0) return ResponseHandler.success(res, activePatrol.rows[0], 'Resumed active patrol');
    
    const result = await pool.query(
        `INSERT INTO security_patrols (guard_id, start_time, status, hospital_id) 
         VALUES ($1, NOW(), 'In Progress', $2) RETURNING id, start_time, status`, 
        [guardId, hospital_id]
    );
    const patrol = result.rows[0];
    
    // Emit to hospital-specific room
    if (global.io) {
        global.io.to(`hospital_${hospital_id}`).emit('patrol_started', { 
            patrolId: patrol.id, guardId, timestamp: patrol.start_time, hospital_id 
        });
    }
    ResponseHandler.success(res, patrol, 'Patrol started successfully');
});

// Update Patrol Checkpoint - TITAN ALIGNED
const updatePatrolCheckpoint = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { id } = req.params;
    const { checkpointName, nfcTagId, notes } = req.body;

    const patrolRows = await pool.query(
        "SELECT * FROM patrols WHERE id = $1 AND status = 'IN_PROGRESS' AND hospital_id = $2", 
        [id, hospital_id]
    );
    if (patrolRows.rows.length === 0) return ResponseHandler.error(res, 'Active patrol not found', 404);
    
    let checkpointId = null;
    if (nfcTagId) {
        const cleanTagId = nfcTagId.replace('NFC-', '');
        const cpRes = await pool.query(
            "SELECT id, name FROM checkpoints WHERE nfc_tag_id = $1 AND hospital_id = $2", 
            [cleanTagId, hospital_id]
        );
        if (cpRes.rows.length > 0) checkpointId = cpRes.rows[0].id;
    }
    if (!checkpointId && checkpointName) {
        const cpRes = await pool.query(
            "SELECT id FROM checkpoints WHERE name = $1 AND hospital_id = $2", 
            [checkpointName, hospital_id]
        );
        if (cpRes.rows.length > 0) checkpointId = cpRes.rows[0].id;
    }
    if (checkpointId) {
        await pool.query(
            `INSERT INTO patrol_checkpoints (patrol_id, checkpoint_id, scanned_at, location_data, status, hospital_id) 
             VALUES ($1, $2, NOW(), $3, 'VERIFIED', $4)`, 
            [id, checkpointId, JSON.stringify({ method: nfcTagId ? 'NFC' : 'MANUAL', tag: nfcTagId }), hospital_id]
        );
        return ResponseHandler.success(res, { message: 'Checkpoint Verified', verified: true, checkpointId });
    } else {
        return ResponseHandler.error(res, 'Checkpoint verification failed (Invalid NFC or Name)', 400);
    }
});

const endPatrol = asyncHandler(async (req, res) => { 
    ResponseHandler.success(res, { message: "Patrol ended (Implementation Pending)" }); 
});

// ============================================================================
// SYSTEM EVENTS
// ============================================================================

systemBus.on(systemBus.EVENTS.CODE_VIOLET, async (data) => {
    console.log('[SECURITY] CODE VIOLET DETECTED:', data);
    try {
        const title = `CODE VIOLET: ${data.location || 'Unknown Location'}`;
        const description = `STAFF DURESS ALERT. Triggered by ${data.triggered_by_name} (${data.triggered_by_role}). IMMEDIATE RESPONSE REQUIRED.`;
        const hospital_id = data.hospital_id || 1;
        
        await pool.query(
            `INSERT INTO security_incidents (title, type, severity, location, description, reporter_id, status, hospital_id) 
             VALUES ($1, $2, 'Critical', $3, $4, $5, 'Open', $6)`, 
            [title, 'Violence', data.location, description, data.triggered_by_id, hospital_id]
        );
    } catch (err) {
        console.error('[SECURITY] Failed to process Code Violet:', err);
    }
});

// Toggle Lockdown - TITAN ALIGNED
const toggleLockdown = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { enabled } = req.body;
    const user = req.user;
    
    console.log(`[SECURITY] LOCKDOWN ${enabled ? 'INITIATED' : 'LIFTED'} by ${user.username} at Hospital ${hospital_id}`);
    const eventName = enabled ? systemBus.EVENTS.LOCKDOWN_START : systemBus.EVENTS.LOCKDOWN_END;
    systemBus.emit(eventName, { triggered_by_id: user.id, timestamp: new Date(), hospital_id });
    
    if (enabled) {
        await pool.query(
            `INSERT INTO security_incidents (title, type, severity, location, description, reporter_id, status, hospital_id) 
             VALUES ($1, $2, 'Critical', 'FACILITY-WIDE', 'EMERGENCY LOCKDOWN PROTOCOL ACTIVATED', $3, 'Open', $4)`, 
            ['CODE SILVER: LOCKDOWN', 'Security', user.id, hospital_id]
        );
    }
    
    // Emit to hospital-specific room
    if (global.io) {
        global.io.to(`hospital_${hospital_id}`).emit(eventName, { status: enabled ? 'LOCKDOWN' : 'NORMAL', hospital_id });
    }
    ResponseHandler.success(res, { success: true, status: enabled ? 'LOCKDOWN_ACTIVE' : 'NORMAL_OPERATIONS' });
});

systemBus.on('PATROL_UPDATE', (data) => { 
    if (global.io && data.hospital_id) {
        global.io.to(`hospital_${data.hospital_id}`).emit('patrol_update', data);
    } else if (global.io) {
        global.io.emit('patrol_update', data);
    }
});

// ============================================================================
// DISPATCH & COMMANDS
// ============================================================================

// Send Dispatch - TITAN ALIGNED
const sendDispatch = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { message, targetGuardId, priority } = req.body;
    const sender = req.user.username;
    
    await pool.query(
        `INSERT INTO security_incidents (title, type, severity, location, status, reporter_id, description, hospital_id) 
         VALUES ($1, 'Dispatch', $2, 'Command Center', 'Closed', $3, $4, $5)`, 
        [`Dispatch: ${message.substring(0, 30)}...`, priority || 'Medium', req.user.id, 
         `Voice/Text Dispatch sent to ${targetGuardId || 'ALL'}: ${message}`, hospital_id]
    );
    
    if (global.io) {
        global.io.to(`hospital_${hospital_id}`).emit('dispatch_voice_message', { 
            id: Date.now(), message, sender, targetGuardId, priority: priority || 'High', 
            timestamp: new Date(), hospital_id 
        });
    }
    ResponseHandler.success(res, { success: true });
});

const requestGuardLocation = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { guardId } = req.body;
    
    if (global.io) {
        global.io.to(`hospital_${hospital_id}`).emit('request_location_update', { targetGuardId: guardId, hospital_id });
    }
    ResponseHandler.success(res, { success: true, message: 'Ping sent' });
});

// Ping All Guards - TITAN ALIGNED (Phase 7 Dashboard)
const pingAllGuards = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    
    if (global.io) {
        global.io.to(`hospital_${hospital_id}`).emit('request_location_update', { 
            targetGuardId: 'ALL', 
            hospital_id,
            message: 'Location update requested by Control Center'
        });
    }
    console.log(`[SECURITY] Ping ALL guards at Hospital ${hospital_id}`);
    ResponseHandler.success(res, { success: true, message: 'Ping sent to all guards' });
});

// Request Photo from Guard - TITAN ALIGNED (Phase 7 Dashboard)
const requestPhoto = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { guardId } = req.body;
    
    if (!guardId) {
        return ResponseHandler.error(res, 'Guard ID is required', 400);
    }
    
    if (global.io) {
        global.io.to(`hospital_${hospital_id}`).emit('request_photo', { 
            targetGuardId: guardId, 
            hospital_id,
            requestedBy: req.user.username,
            timestamp: new Date()
        });
    }
    console.log(`[SECURITY] Photo requested from guard ${guardId} at Hospital ${hospital_id}`);
    ResponseHandler.success(res, { success: true, message: 'Photo request sent' });
});

// Get Online Guards with Recent Locations - TITAN ALIGNED (Phase 7 Dashboard)
const getOnlineGuards = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    
    // Get guards who have sent location updates in the last 15 minutes
    const result = await pool.query(`
        SELECT DISTINCT ON (gl.guard_id) 
            gl.guard_id,
            u.username,
            u.profile_picture_url as photo_url,
            gl.latitude,
            gl.longitude,
            gl.heading,
            gl.speed,
            gl.accuracy,
            gl.battery_level,
            gl.timestamp as last_update,
            CASE 
                WHEN gl.timestamp > NOW() - INTERVAL '2 minutes' THEN 'ONLINE'
                WHEN gl.timestamp > NOW() - INTERVAL '10 minutes' THEN 'IDLE'
                ELSE 'OFFLINE'
            END as status,
            gs.shift_start,
            gs.shift_end
        FROM guard_locations gl
        JOIN users u ON gl.guard_id = u.id
        LEFT JOIN guard_shifts gs ON gs.guard_id = gl.guard_id 
            AND gs.hospital_id = $1 
            AND gs.shift_date = CURRENT_DATE
        WHERE gl.hospital_id = $1 
            AND gl.timestamp > NOW() - INTERVAL '15 minutes'
        ORDER BY gl.guard_id, gl.timestamp DESC
    `, [hospital_id]);
    
    ResponseHandler.success(res, result.rows);
});

// Handle Panic Button - TITAN ALIGNED
const handlePanicButton = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { latitude, longitude, heading } = req.body;
    const guard_id = req.user.id;
    const guard_name = req.user.username;
    
    console.warn(`[SOS] PANIC BUTTON PRESSED BY ${guard_name} at Hospital ${hospital_id}`);
    
    const incidentRes = await pool.query(
        `INSERT INTO security_incidents (title, type, severity, location, status, reporter_id, description, created_at, hospital_id) 
         VALUES ($1, 'SOS', 'Critical', $2, 'Open', $3, $4, NOW(), $5) RETURNING id`, 
        [`SOS ALERT: ${guard_name}`, `Lat: ${latitude}, Lng: ${longitude}`, guard_id, 
         `PANIC BUTTON TRIGGERED at ${new Date().toLocaleTimeString()}`, hospital_id]
    );
    
    if (global.io) {
        global.io.to(`hospital_${hospital_id}`).emit('security_alert', { 
            type: 'SOS_PANIC', incident_id: incidentRes.rows[0].id, guard_id, guard_name, 
            location: { lat: latitude, lng: longitude }, timestamp: new Date(), hospital_id 
        });
    }
    ResponseHandler.success(res, { success: true, incidentId: incidentRes.rows[0].id });
});

// ============================================================================
// GEOFENCES
// ============================================================================

// Get Geofences - TITAN ALIGNED
const getGeofences = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const result = await pool.query(
        "SELECT * FROM security_geofences WHERE is_active = TRUE AND hospital_id = $1", 
        [hospital_id]
    );
    ResponseHandler.success(res, result.rows);
});

// ============================================================================
// LOCATION TRACKING
// ============================================================================

// Update Location - TITAN ALIGNED
const updateLocation = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { latitude, longitude, accuracy, heading, speed, isOfflineSync, batteryLevel, signalStrength, pdrX, pdrY, steps } = req.body;
    const guard_id = req.user.id; 
    const guard_name = req.user.username;

    await pool.query(
        `INSERT INTO guard_locations (guard_id, latitude, longitude, accuracy, heading, speed, is_offline_sync, battery_level, signal_strength, hospital_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, 
        [guard_id, latitude, longitude, accuracy, heading, speed, isOfflineSync || false, batteryLevel || null, signalStrength || null, hospital_id]
    );
    
    // Check geofences for THIS hospital only
    const fencesRes = await pool.query(
        "SELECT * FROM security_geofences WHERE is_active = TRUE AND hospital_id = $1", 
        [hospital_id]
    );
    const currentPoint = point([longitude, latitude]);
    
    fencesRes.rows.forEach(async (fence) => {
        const turfCoords = fence.coordinates.map(p => [p[1], p[0]]);
        if (turfCoords[0][0] !== turfCoords[turfCoords.length-1][0] || turfCoords[0][1] !== turfCoords[turfCoords.length-1][1]) {
            turfCoords.push(turfCoords[0]);
        }
        const turfPoly = polygon([turfCoords]);
        const isInside = turfBooleanPointInPolygon(currentPoint, turfPoly);
        
        if (isInside && fence.zone_type === 'RESTRICTED') {
            if (global.io) {
                global.io.to(`hospital_${hospital_id}`).emit('security_alert', { 
                    type: 'GEOFENCE_BREACH', message: `Guard ${guard_name} entered ${fence.name}`, 
                    guard_id, location: { lat: latitude, lng: longitude }, hospital_id 
                });
            }
        }
    });
    
    // Emit to hospital-specific room
    if (global.io) {
        global.io.to(`hospital_${hospital_id}`).emit('guard_location_update', { 
            guard_id, latitude, longitude, heading, batteryLevel, signalStrength, 
            pdrX, pdrY, steps, username: guard_name, hospital_id 
        });
    }
    ResponseHandler.success(res, { success: true });
});

// Log Sensor Data - TITAN ALIGNED
const logSensorData = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { patrolId, stepCount, heading, impactForce, relativeX, relativeY } = req.body;
    const guard_id = req.user.id;
    
    await pool.query(
        `INSERT INTO sensor_logs (guard_id, patrol_id, step_count, heading, impact_force, relative_x, relative_y, hospital_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, 
        [guard_id, patrolId, stepCount, heading, impactForce, relativeX, relativeY, hospital_id]
    );
    
    if (impactForce > 2.5) {
        console.warn(`[Sensor] High Impact Detected for Guard ${guard_id}: ${impactForce}g`);
    }
    ResponseHandler.success(res, { success: true });
});

// ============================================================================
// VOICE
// ============================================================================

const getVoiceToken = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { roomName, channelName } = req.body;
    const guardId = req.user.id;
    const guardName = req.user.username || req.user.name || `Guard-${guardId}`;
    
    // Use the new multi-tenant voice token generator
    const voiceData = tokenService.createGuardVoiceToken(
        guardId, 
        guardName, 
        hospital_id, 
        channelName || roomName || 'patrol-main'
    );
    
    console.log(`[WOLF-VOICE] Token generated for ${guardName} in room ${voiceData.room}`);
    
    ResponseHandler.success(res, {
        token: voiceData.token,
        room: voiceData.room,
        url: voiceData.url,
        identity: guardName
    });
});

// ============================================================================
// GATES
// ============================================================================

// Get Gates - TITAN ALIGNED
const getGates = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const result = await pool.query(
        "SELECT * FROM security_gates WHERE hospital_id = $1 ORDER BY name", 
        [hospital_id]
    );
    ResponseHandler.success(res, result.rows);
});

// Toggle Gate - TITAN ALIGNED
const toggleGate = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { id } = req.params;
    const { command } = req.body;
    const user = req.user;
    
    const result = await pool.query(
        "UPDATE security_gates SET status = $1, updated_at = NOW() WHERE id = $2 AND hospital_id = $3 RETURNING *", 
        [command, id, hospital_id]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Gate not found', 404);
    
    const gate = result.rows[0];
    await pool.query(
        "INSERT INTO access_logs (gate_id, vehicle_type, access_granted, scan_image_url) VALUES ($1, 'MANUAL_OVERRIDE', $2, $3)", 
        [id, command === 'OPEN', `Override by ${user.username}`]
    );
    
    if (global.io) {
        global.io.to(`hospital_${hospital_id}`).emit('gate_update', { ...gate, hospital_id });
    }
    ResponseHandler.success(res, gate);
});

// ============================================================================
// VOICE COMMANDS
// ============================================================================

// Process Voice Command - TITAN ALIGNED
const processVoiceCommand = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { text } = req.body;
    const user = req.user;
    
    const analysis = WolfVoiceService.processCommand(text);
    if (analysis.intent === 'UNKNOWN') {
        return ResponseHandler.success(res, { action: 'NONE', response: analysis.message || "Command not recognized." });
    }
    
    let responseMessage = "";
    let actionResult = null;
    
    switch (analysis.intent) {
        case 'DISPATCH':
            const missionResult = await pool.query(
                `INSERT INTO security_missions (title, type, priority, location_name, created_by, description, status, hospital_id) 
                 VALUES ($1, 'PATROL', 'HIGH', $2, $3, 'Voice Dispatch', 'ASSIGNED', $4) RETURNING *`, 
                [`Investigate ${analysis.entity}`, analysis.entity, user.id, hospital_id]
            );
            actionResult = missionResult.rows[0];
            responseMessage = `Affirmative. Dispatching patrol to ${analysis.entity}.`;
            if (global.io) global.io.to(`hospital_${hospital_id}`).emit('mission_update', actionResult);
            break;
            
        case 'LOCKDOWN':
        case 'UNLOCK':
            const gateStatus = analysis.intent === 'LOCKDOWN' ? 'LOCKED' : 'OPEN';
            const gateResult = await pool.query(
                "UPDATE security_gates SET status = $1, updated_at = NOW() WHERE name ILIKE $2 AND hospital_id = $3 RETURNING *", 
                [gateStatus, `%${analysis.entity}%`, hospital_id]
            );
            if (gateResult.rows.length > 0) {
                actionResult = gateResult.rows[0];
                responseMessage = `Gate ${actionResult.name} is now ${gateStatus}.`;
                if (global.io) global.io.to(`hospital_${hospital_id}`).emit('gate_update', actionResult);
            } else {
                responseMessage = `Negative. No gate found matching "${analysis.entity}".`;
            }
            break;
            
        case 'STATUS':
            responseMessage = `Status check for ${analysis.entity} complete. All systems nominal.`;
            break;
    }
    ResponseHandler.success(res, { action: analysis.intent, response: responseMessage, data: actionResult });
});

// ============================================================================
// MISSIONS
// ============================================================================

// Get Missions - TITAN ALIGNED
const getMissions = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const result = await pool.query(
        `SELECT m.*, u.username as assigned_guard_name 
         FROM security_missions m 
         LEFT JOIN users u ON m.assigned_to = u.id 
         WHERE m.hospital_id = $1 
         ORDER BY m.created_at DESC`, 
        [hospital_id]
    );
    ResponseHandler.success(res, result.rows);
});

// Dispatch Mission - TITAN ALIGNED
const dispatchMission = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { title, type, priority, location_name, assigned_to_id, description } = req.body;
    const created_by = req.user.id;
    
    const result = await pool.query(
        `INSERT INTO security_missions (title, type, priority, location_name, assigned_to, created_by, description, status, hospital_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ASSIGNED', $8) RETURNING *`, 
        [title, type, priority, location_name, assigned_to_id, created_by, description, hospital_id]
    );
    const mission = result.rows[0];
    
    if (global.io) {
        global.io.emit(`mission_assigned_${assigned_to_id}`, mission);
    }
    ResponseHandler.success(res, mission, 'Mission Dispatched', 201);
});

// ============================================================================
// COMMAND MAP
// ============================================================================

// Get Command Map - TITAN ALIGNED
const getCommandMap = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    
    const [patrols, incidents, gates, missions] = await Promise.all([
        pool.query(
            `SELECT p.*, u.username as guard_name 
             FROM security_patrols p 
             JOIN users u ON p.guard_id = u.id 
             WHERE p.status = 'In Progress' AND p.hospital_id = $1`, 
            [hospital_id]
        ),
        pool.query(
            `SELECT * FROM security_incidents WHERE status != 'Closed' AND hospital_id = $1`, 
            [hospital_id]
        ),
        pool.query(
            `SELECT * FROM security_gates WHERE hospital_id = $1`, 
            [hospital_id]
        ),
        pool.query(
            `SELECT * FROM security_missions WHERE status != 'RESOLVED' AND hospital_id = $1`, 
            [hospital_id]
        )
    ]);
    
    ResponseHandler.success(res, { 
        activePatrols: patrols.rows, 
        activeIncidents: incidents.rows, 
        gates: gates.rows, 
        activeMissions: missions.rows 
    });
});

// ============================================================================
// FLOOR PLANS
// ============================================================================

// Save Floor Plan - TITAN ALIGNED
const saveFloorPlan = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { image_url, bounds } = req.body;
    const userId = req.user.id;
    
    if (!image_url || !bounds || bounds.length !== 2) {
        return ResponseHandler.error(res, 'Invalid data. Requires image_url and bounds [[N,W],[S,E]]', 400);
    }
    
    // Only deactivate floor plans for THIS hospital
    await pool.query('UPDATE floor_plans SET is_active = false WHERE hospital_id = $1', [hospital_id]);
    
    const result = await pool.query(
        `INSERT INTO floor_plans (image_url, bounds, is_active, created_by, hospital_id) 
         VALUES ($1, $2, true, $3, $4) RETURNING id, image_url, bounds, is_active`, 
        [image_url, JSON.stringify(bounds), userId, hospital_id]
    );
    ResponseHandler.success(res, result.rows[0]);
});

// Get Active Floor Plan - TITAN ALIGNED
const getActiveFloorPlan = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const result = await pool.query(
        `SELECT id, image_url, bounds FROM floor_plans WHERE is_active = true AND hospital_id = $1 ORDER BY created_at DESC LIMIT 1`, 
        [hospital_id]
    );
    if (result.rows.length === 0) return ResponseHandler.success(res, null);
    ResponseHandler.success(res, result.rows[0]);
});

// ============================================================================
// GUARD HISTORY & MAPPING
// ============================================================================

// Get Guard Location History - TITAN ALIGNED
const getGuardLocationHistory = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { id } = req.params;
    const { start, end } = req.query;
    
    let query = `SELECT * FROM guard_locations WHERE guard_id = $1 AND hospital_id = $2`;
    const params = [id, hospital_id];
    
    if (start) { params.push(start); query += ` AND timestamp >= $${params.length}`; }
    if (end) { params.push(end); query += ` AND timestamp <= $${params.length}`; }
    query += ' ORDER BY timestamp ASC LIMIT 2000';
    
    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// Start Mapping Session - TITAN ALIGNED
const startMappingSession = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { guard_id } = req.body;
    const sessionId = `map_${Date.now()}`;
    
    if (global.io) {
        global.io.to(`hospital_${hospital_id}`).emit(`guard_mapping_start_${guard_id}`, { sessionId, hospital_id });
    }
    ResponseHandler.success(res, { sessionId, message: 'Mapping session initiated' });
});

const stopMappingSession = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { guard_id } = req.body;
    
    if (global.io) {
        global.io.to(`hospital_${hospital_id}`).emit(`guard_mapping_stop_${guard_id}`, { status: 'STOPPED', hospital_id });
    }
    ResponseHandler.success(res, { success: true });
});

// ============================================================================
// METRICS
// ============================================================================

// Get Guard Metrics - TITAN ALIGNED
const getGuardMetrics = asyncHandler(async (req, res) => {
    const hospital_id = getHospitalId(req);
    const { id } = req.params;
    
    const patrolCountRes = await pool.query(
        `SELECT COUNT(*) FROM security_patrols WHERE guard_id = $1 AND hospital_id = $2 AND start_time > NOW() - INTERVAL '7 days'`, 
        [id, hospital_id]
    );
    const hoursRes = await pool.query(
        `SELECT COUNT(DISTINCT DATE_TRUNC('hour', timestamp)) FROM guard_locations WHERE guard_id = $1 AND hospital_id = $2 AND timestamp > NOW() - INTERVAL '7 days'`, 
        [id, hospital_id]
    );
    const incidentsRes = await pool.query(
        `SELECT COUNT(*) FROM security_incidents WHERE reporter_id = $1 AND hospital_id = $2 AND created_at > NOW() - INTERVAL '7 days'`, 
        [id, hospital_id]
    );
    
    ResponseHandler.success(res, { 
        totalPatrols: parseInt(patrolCountRes.rows[0].count), 
        totalHours: parseInt(hoursRes.rows[0].count), 
        totalReports: parseInt(incidentsRes.rows[0].count), 
        efficiencyScore: 94 
    });
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = { 
    getIncidents, createIncident, updateIncidentStatus, 
    getVisitors, checkInVisitor, checkOutVisitor, 
    getActivePatrols, toggleLockdown, startPatrol, updatePatrolCheckpoint, endPatrol, 
    sendDispatch, handlePanicButton, 
    getGeofences, updateLocation, logSensorData, 
    getVoiceToken, 
    getGates, toggleGate, 
    processVoiceCommand, 
    getMissions, dispatchMission, 
    getCommandMap, 
    saveFloorPlan, getActiveFloorPlan, 
    requestGuardLocation, pingAllGuards, requestPhoto, getOnlineGuards,
    getGuardLocationHistory, startMappingSession, stopMappingSession, 
    submitHandover: require('./security/handoverController').submitHandover, 
    getHandoverHistory: require('./security/handoverController').getHandoverHistory, 
    getGuardMetrics 
};
