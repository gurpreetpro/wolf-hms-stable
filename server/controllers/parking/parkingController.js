const pool = require('../../config/db');
const ResponseHandler = require('../../utils/responseHandler');
const { getHospitalId } = require('../../utils/tenantHelper');
const { asyncHandler } = require('../../middleware/errorHandler');

// =============================================================================
//   WOLF GUARD MOBILE — GATE CONTROLLER INTEGRATION
//   resolveVehicle | collectPayment | logManualOverride
//   Central pricing authority: tariffs flow from parking_tariffs.
// =============================================================================

/**
 * resolveVehicle
 * Called by the IoT gate tablet when a vehicle pulls up.
 * Accepts: { identifier, type }
 *   - type: 'PLATE' or 'QR'
 *
 * Logic:
 *  1. Look up identifier in vehicle_registry (whitelist).
 *     - If found with category DOCTOR/STAFF/AMBULANCE → fee: 0, action: AUTO_OPEN.
 *  2. If no registry match, check parking_sessions for an active PARKED row.
 *     - If active session exists → this is an EXIT. Calculate duration, join
 *       parking_tariffs to compute amount_due, return fee for payment.
 *     - If no active session → this is an ENTRY. Return action: ENTRY so the
 *       gate opens and the mobile app can create the session.
 */
const resolveVehicle = async (req, res) => {
    const client = await pool.connect();
    try {
        const { identifier, type } = req.body;
        const hospitalId = getHospitalId(req);

        if (!identifier) {
            return res.status(400).json({ success: false, error: 'Identifier required' });
        }

        const lookupType = (type || 'PLATE').toUpperCase();
        const cleanIdentifier = identifier.toUpperCase().replace(/\s/g, '');

        // ---------- Step 1: Check vehicle_registry whitelist ----------
        const registryResult = await client.query(
            `SELECT vr.id, vr.plate_number, vr.category, vr.registered_to, vr.is_active
             FROM vehicle_registry vr
             WHERE vr.plate_number = $1
               AND vr.hospital_id = $2
               AND vr.is_active = TRUE
             LIMIT 1`,
            [cleanIdentifier, hospitalId]
        );

        if (registryResult.rows.length > 0) {
            const reg = registryResult.rows[0];
            const privilegedCategories = ['DOCTOR', 'STAFF', 'AMBULANCE', 'EMERGENCY', 'ADMIN', 'BOARD'];

            if (privilegedCategories.includes((reg.category || '').toUpperCase())) {
                return res.status(200).json({
                    success: true,
                    action: 'AUTO_OPEN',
                    fee: 0,
                    message: `Welcome, ${reg.registered_to || reg.plate_number}`,
                    registry: {
                        id: reg.id,
                        plate_number: reg.plate_number,
                        category: reg.category,
                        registered_to: reg.registered_to
                    }
                });
            }

            // Known vehicle but not privileged — treat as normal entry
            return res.status(200).json({
                success: true,
                action: 'ENTRY',
                fee: 0,
                message: `Registered vehicle: ${reg.plate_number} (${reg.category})`,
                registry: {
                    id: reg.id,
                    plate_number: reg.plate_number,
                    category: reg.category,
                    registered_to: reg.registered_to
                }
            });
        }

        // ---------- Step 2: Check active parking_sessions ----------
        const activeSession = await client.query(
            `SELECT ps.id, ps.vehicle_no, ps.vehicle_type, ps.entry_time, ps.status
             FROM parking_sessions ps
             WHERE ps.vehicle_no = $1
               AND ps.status = 'PARKED'
               AND ps.hospital_id = $2
             ORDER BY ps.entry_time DESC
             LIMIT 1`,
            [cleanIdentifier, hospitalId]
        );

        if (activeSession.rows.length > 0) {
            // ---------- EXIT path ----------
            const session = activeSession.rows[0];
            const entryTime = new Date(session.entry_time);
            const exitTime = new Date();
            const durationMinutes = Math.max(1, Math.ceil((exitTime - entryTime) / (1000 * 60)));

            // Join parking_tariffs for this vehicle_type
            const tariffResult = await client.query(
                `SELECT pt.rate_per_hour, pt.flat_fee, pt.free_minutes, pt.max_daily_fee
                 FROM parking_tariffs pt
                 WHERE pt.vehicle_type = $1
                   AND pt.hospital_id = $2
                   AND pt.is_active = TRUE
                 LIMIT 1`,
                [session.vehicle_type || 'CAR', hospitalId]
            );

            // RATES fallback
            const RATES = { CAR: 20, BIKE: 10, TRUCK: 50 };

            let ratePerHour = RATES[session.vehicle_type] || RATES.CAR;
            let flatFee = 0;
            let freeMinutes = 0;
            let maxDaily = null;

            if (tariffResult.rows.length > 0) {
                const t = tariffResult.rows[0];
                ratePerHour = parseFloat(t.rate_per_hour) || ratePerHour;
                flatFee = parseFloat(t.flat_fee) || 0;
                freeMinutes = parseInt(t.free_minutes) || 0;
                maxDaily = t.max_daily_fee ? parseFloat(t.max_daily_fee) : null;
            }

            const billableMinutes = Math.max(0, durationMinutes - freeMinutes);
            const billedHours = Math.ceil(billableMinutes / 60);
            let amountDue = (billedHours * ratePerHour) + flatFee;

            if (maxDaily !== null && amountDue > maxDaily) {
                amountDue = maxDaily;
            }

            return res.status(200).json({
                success: true,
                action: 'EXIT',
                session_id: session.id,
                vehicle_no: session.vehicle_no,
                vehicle_type: session.vehicle_type,
                entry_time: session.entry_time,
                exit_time: exitTime.toISOString(),
                duration_minutes: durationMinutes,
                free_minutes: freeMinutes,
                billable_minutes: billableMinutes,
                rate_per_hour: ratePerHour,
                flat_fee: flatFee,
                amount_due: Math.round(amountDue * 100) / 100
            });
        }

        // ---------- ENTRY path: no active session, not in registry ----------
        return res.status(200).json({
            success: true,
            action: 'ENTRY',
            fee: 0,
            vehicle_no: cleanIdentifier,
            message: 'New vehicle — proceed to entry'
        });

    } catch (err) {
        console.error('[resolveVehicle] Error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    } finally {
        client.release();
    }
};

/**
 * collectPayment
 * Called after the guard collects cash/card/UPI at the exit gate.
 * Accepts: { sessionId, amount, method }
 *   - Updates the parking_sessions row with payment info.
 *   - Sets phase7_sync_status = 'UNSYNCED' to flag the edge agent.
 *   - Returns success to trigger the IoT gate relay (barrier open).
 */
const collectPayment = async (req, res) => {
    try {
        const { sessionId, amount, method } = req.body;
        const hospitalId = getHospitalId(req);

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'sessionId required' });
        }
        if (amount === undefined || amount === null) {
            return res.status(400).json({ success: false, error: 'amount required' });
        }

        const result = await pool.query(
            `UPDATE parking_sessions
             SET payment_status      = 'PAID',
                 payment_method      = $1,
                 amount_due          = $2,
                 exit_time           = NOW(),
                 status              = 'COMPLETED',
                 phase7_sync_status  = 'UNSYNCED'
             WHERE id = $3
               AND hospital_id = $4
               AND status IN ('PARKED', 'PENDING_PAYMENT')
             RETURNING id, vehicle_no, amount_due, payment_method, status, phase7_sync_status`,
            [
                (method || 'CASH').toUpperCase(),
                parseFloat(amount),
                parseInt(sessionId),
                hospitalId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found, already completed, or not in payable state'
            });
        }

        const updated = result.rows[0];

        // Emit real-time event so SOC dashboard updates
        if (global.io) {
            global.io.emit('parking_update', {
                type: 'PAYMENT_COLLECTED',
                data: updated
            });
        }

        return res.status(200).json({
            success: true,
            action: 'OPEN_GATE',
            session: updated,
            message: 'Payment collected — gate relay authorized'
        });

    } catch (err) {
        console.error('[collectPayment] Error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * logManualOverride
 * Guard forces the gate open without payment (emergency, VIP, technical fault).
 * Accepts: { guardId, plateNumber, reason }
 *   - Inserts a zero-dollar COMPLETED session with is_manual_override = TRUE.
 *   - Emits a Socket.IO 'security_alert_override' event to the SOC for audit.
 */
const logManualOverride = async (req, res) => {
    try {
        const { guardId, plateNumber, reason } = req.body;
        const hospitalId = getHospitalId(req);

        if (!guardId) {
            return res.status(400).json({ success: false, error: 'guardId required' });
        }
        if (!plateNumber) {
            return res.status(400).json({ success: false, error: 'plateNumber required' });
        }

        const cleanPlate = plateNumber.toUpperCase().replace(/\s/g, '');

        const result = await pool.query(
            `INSERT INTO parking_sessions
                (vehicle_no, vehicle_type, status, entry_time, exit_time,
                 amount_due, payment_method, payment_status,
                 guard_id, hospital_id, is_manual_override, override_reason)
             VALUES
                ($1, $2, 'COMPLETED', NOW(), NOW(),
                 0.00, 'MANUAL_OVERRIDE', 'WAIVED',
                 $3, $4, TRUE, $5)
             RETURNING *`,
            [
                cleanPlate,
                'CAR',
                parseInt(guardId),
                hospitalId,
                reason || 'Manual override by guard'
            ]
        );

        const session = result.rows[0];

        // Emit high-priority SOC alert
        if (global.io) {
            global.io.emit('security_alert_override', {
                event: 'PARKING_MANUAL_OVERRIDE',
                severity: 'WARNING',
                timestamp: new Date().toISOString(),
                session,
                guard_id: guardId,
                plate_number: cleanPlate,
                reason: reason || 'No reason provided'
            });
        }

        console.warn(
            `[PARKING] Manual override by guard ${guardId} for ${cleanPlate}: ${reason || 'No reason'}`
        );

        return res.status(201).json({
            success: true,
            action: 'MANUAL_OPEN_LOGGED',
            session,
            message: 'Manual override recorded — SOC alerted'
        });

    } catch (err) {
        console.error('[logManualOverride] Error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * vehicleEntry
 * Standard entry — creates a new PARKED session.
 * Called from the existing guard UI and mobile app.
 */
const vehicleEntry = async (req, res) => {
    try {
        const { vehicle_no, vehicle_type, image_url } = req.body;
        const guard_id = req.user ? req.user.id : (req.body.guard_id || null);
        const hospitalId = getHospitalId(req);

        if (!vehicle_no) {
            return res.status(400).json({ success: false, error: 'Vehicle Number required' });
        }

        const cleanNo = vehicle_no.toUpperCase().replace(/\s/g, '');

        const existing = await pool.query(
            "SELECT * FROM parking_sessions WHERE vehicle_no = $1 AND status = 'PARKED' AND hospital_id = $2",
            [cleanNo, hospitalId]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, error: 'Vehicle already marked as PARKED' });
        }

        const result = await pool.query(
            `INSERT INTO parking_sessions (vehicle_no, vehicle_type, guard_id, image_url, status, hospital_id)
             VALUES ($1, $2, $3, $4, 'PARKED', $5) RETURNING *`,
            [cleanNo, vehicle_type || 'CAR', guard_id, image_url, hospitalId]
        );

        if (global.io) {
            global.io.emit('parking_update', { type: 'ENTRY', data: result.rows[0] });
        }

        return res.status(201).json({ success: true, data: result.rows[0], message: 'Vehicle Checked In' });
    } catch (err) {
        console.error('[vehicleEntry] Error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * exitCalculation
 * Legacy-compatible exit calculation endpoint for existing guard UI.
 */
const exitCalculation = async (req, res) => {
    try {
        const { vehicle_no } = req.query;
        const hospitalId = getHospitalId(req);

        if (!vehicle_no) {
            return res.status(400).json({ success: false, error: 'Vehicle Number required' });
        }

        const cleanNo = vehicle_no.toUpperCase().replace(/\s/g, '');
        const RATES = { CAR: 20, BIKE: 10, TRUCK: 50 };

        const sessionRes = await pool.query(
            "SELECT * FROM parking_sessions WHERE vehicle_no = $1 AND status = 'PARKED' AND hospital_id = $2",
            [cleanNo, hospitalId]
        );
        if (sessionRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Vehicle not found or already exited' });
        }

        const session = sessionRes.rows[0];
        const entry = new Date(session.entry_time);
        const exit = new Date();
        const durationHrs = Math.max(0, (exit - entry) / (1000 * 60 * 60));
        const billedHours = Math.ceil(Math.max(1, durationHrs));
        const rate = RATES[session.vehicle_type] || RATES.CAR;
        const amount = billedHours * rate;

        return res.status(200).json({
            success: true,
            data: {
                session_id: session.id,
                vehicle_no: session.vehicle_no,
                entry_time: session.entry_time,
                exit_time: exit,
                duration_formatted: `${Math.floor(durationHrs)}h ${Math.round((durationHrs % 1) * 60)}m`,
                rate_per_hour: rate,
                amount_due: amount
            }
        });
    } catch (err) {
        console.error('[exitCalculation] Error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * confirmExit
 * Legacy-compatible exit confirmation endpoint.
 */
const confirmExit = async (req, res) => {
    try {
        const { session_id, payment_method, amount_paid } = req.body;
        const hospitalId = getHospitalId(req);

        const result = await pool.query(
            `UPDATE parking_sessions
             SET status = 'PAID', exit_time = NOW(), payment_method = $1, amount_due = $2
             WHERE id = $3 AND status = 'PARKED' AND hospital_id = $4 RETURNING *`,
            [payment_method || 'CASH', amount_paid, session_id, hospitalId]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Session invalid or already closed' });
        }

        if (global.io) {
            global.io.emit('parking_update', { type: 'EXIT', data: result.rows[0] });
        }

        return res.status(200).json({ success: true, data: result.rows[0], message: 'Exit Confirmed' });
    } catch (err) {
        console.error('[confirmExit] Error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

module.exports = {
    // Gate controller integration (primary)
    resolveVehicle,
    collectPayment,
    logManualOverride,
    // Backward-compatible exports for legacy guard UI
    vehicleEntry,
    exitCalculation,
    confirmExit
};