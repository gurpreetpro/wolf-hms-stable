const { pool } = require('../db');
const { calculateNEWS2 } = require('../lib/news2Calculator');
const AlertService = require('./AlertService');
const logger = require('./Logger');

class ClinicalSentinel {

    /**
     * Check a specific patient's vitals immediately
     * (Triggered by IoT ingestion or Nurse Entry)
     */
    static async checkPatient(patientId, vitalsData) {
        try {
            // 1. Calculate Score
            const result = calculateNEWS2(vitalsData);

            // Only act if risk is significant
            if (result.riskLevel === 'Low' && result.score < 3) {
                return result; // No alert needed
            }

            // 2. Get Patient & Bed Info for Context
            const patientRes = await pool.query(`
                SELECT p.name, a.bed_number, a.id as admission_id, a.doctor_id
                FROM patients p
                JOIN admissions a ON p.id = a.patient_id
                WHERE p.id = $1 AND a.status = 'Admitted'
            `, [patientId]);

            if (patientRes.rows.length === 0) return result; // Patient likely discharged

            const { name, bed_number, admission_id, doctor_id } = patientRes.rows[0];

            // 3. Create Alert if Medium/High Risk
            if (result.riskLevel === 'Medium' || result.riskLevel === 'High') {
                const alertTitle = `CLINICAL ALERT: ${result.riskLevel} Risk (NEWS2: ${result.score})`;
                const alertType = result.riskLevel === 'High' ? 'critical' : 'warning';

                // INSERT DIRECTLY TO CLINICAL ALERTS
                // AlertService writes to system_alerts (DevOps), we need patient alerts.
                const alertRes = await pool.query(`
                    INSERT INTO clinical_alerts 
                    (patient_id, admission_id, type, category, title, message, details, score, breakdown, source, value)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING *
                `, [
                    patientId,
                    admission_id,
                    alertType,
                    'clinical',
                    alertTitle,
                    `Patient ${name} (Bed ${bed_number}) shows signs of deterioration. ${result.clinicalAction}`,
                    JSON.stringify(vitalsData),
                    result.score,
                    JSON.stringify(result.breakdown),
                    'Wolf-Sentinel',
                    'NEWS2'
                ]);

                const alert = alertRes.rows[0];

                // 4. Emit Real-time Flash to Nurses
                if (global.io) {
                    global.io.emit('sentinel:alert', {
                        patientId,
                        bedNumber: bed_number,
                        score: result.score,
                        risk: result.riskLevel,
                        message: `Bed ${bed_number}: NEWS2 Score ${result.score} (${result.riskLevel})`,
                        alertId: alert.id
                    });
                    // Also emit generic clinical_alert for dashboard list
                    global.io.emit('clinical_alert', alert);
                }

                logger.warn(`[Sentinel] Deterioration detected for ${name} (Bed ${bed_number}) - Score: ${result.score}`);
            }

            return result;

        } catch (error) {
            logger.error('[Sentinel] Check Failed:', error);
            return null;
        }
    }

    /**
     * Background Sweep: Check ALL admitted patients
     * (Runs every 5-10 mins to catch slow deterioration)
     */
    static async startSurveillance() {
        try {
            logger.info('👁️ Wolf Sentinel: Starting Ward Sweep...');

            // Get latest vitals for all admitted patients
            const query = `
                SELECT DISTINCT ON (cv.patient_id) 
                    cv.*, p.id as pid, p.name
                FROM clinical_vitals cv
                JOIN admissions a ON cv.patient_id = a.patient_id
                JOIN patients p ON cv.patient_id = p.id
                WHERE a.status = 'Admitted'
                ORDER BY cv.patient_id, cv.recorded_at DESC
            `;

            const res = await pool.query(query);

            for (const row of res.rows) {
                // Normalize DB Columns to Calc format
                const vitals = {
                    bp_systolic: row.bp_systolic,
                    heart_rate: row.heart_rate,
                    temperature: row.temperature,
                    spo2: row.spo2,
                    respiratory_rate: row.respiratory_rate,
                    consciousness: row.consciousness || 'Alert', // Default
                    oxygen_supplement: row.oxygen_supplement // boolean/string
                };

                await this.checkPatient(row.pid, vitals);
            }

            logger.info(`👁️ Wolf Sentinel: Sweep Complete. Checked ${res.rows.length} patients.`);

        } catch (error) {
            logger.error('[Sentinel] Surveillance Error:', error);
        }
    }
}

// =============================================================================
// WOLF GUARD — Phase 3: AI Overwatch Integration
// =============================================================================
// These two security tools are co-located with ClinicalSentinel for a unified
// "Sentinel + Guard" co-pilot pattern.  Named exports allow server.js to pull
// exactly the pieces it needs:
//
//   const { ClinicalSentinel, tenantBreachDetector, DeviceHeartbeatMonitor }
//       = require('./services/ClinicalSentinel');

// ── Cross-Tenant Breach Detector (Express middleware) ──────────────────────

/**
 * Intercepts every authenticated request and verifies the user's assigned
 * hospital_id matches the hospital they are attempting to access.
 *
 * Mount AFTER tenantResolver + authenticateToken in the middleware chain.
 *
 * @example
 *   // In server.js:
 *   app.use('/api/', tenantBreachDetector);
 */
function tenantBreachDetector(req, res, next) {
    // Only inspect requests that already passed auth middleware
    const userHospitalId =
        req.hospitalId ||            // set by tenantResolver middleware
        req.user?.hospital_id ||
        req.hospital_id;

    if (!userHospitalId) return next();

    // Extract the target hospital from multiple sources
    const targetHospitalId =
        req.params.hospital_id ||
        req.query.hospital_id ||
        req.query.hospitalId ||
        (req.body && (req.body.hospital_id || req.body.hospitalId));

    if (!targetHospitalId) return next();

    // Coerce to string to avoid type mismatches (UUID vs int)
    if (String(targetHospitalId) !== String(userHospitalId)) {
        const userId = req.user?.id || 'UNKNOWN';

        console.error(
            `[WOLF GUARD] 🚨 CRITICAL: Cross-tenant intrusion blocked for User ${userId} targeting Hospital ${targetHospitalId}`
        );

        return res.status(409).json({
            error: 'Cross-tenant access blocked',
            code: 'WOLF_GUARD_CROSS_TENANT'
        });
    }

    next();
}

// ── Device Heartbeat Monitor ───────────────────────────────────────────────

/**
 * Maintains an in-memory map of registered hardware devices and their last
 * ping timestamps.  When a device hasn't pinged within the dropout threshold
 * (15 s), emits console + optional Socket.IO alerts.
 *
 * @example
 *   const heartbeat = new DeviceHeartbeatMonitor();
 *   heartbeat.pingDevice('Lab-Analyzer-01');
 *   heartbeat.startMonitoring(5000);   // sweep every 5 seconds
 */
class DeviceHeartbeatMonitor {
    constructor() {
        /** @type {Map<string, number>}  deviceId → lastPingEpochMs */
        this.registry = new Map();
        this._intervalId = null;
    }

    /** Register or refresh a device heartbeat. */
    pingDevice(deviceId) {
        if (!deviceId) return;
        this.registry.set(deviceId, Date.now());
    }

    /** Remove a device from the watch list. */
    removeDevice(deviceId) {
        this.registry.delete(deviceId);
    }

    /**
     * Start the heartbeat surveillance loop.
     * @param {number} intervalMs — sweep frequency (default 5000)
     */
    startMonitoring(intervalMs = 5000) {
        if (this._intervalId) clearInterval(this._intervalId);

        const DROPOUT_THRESHOLD_MS = 15000;

        this._intervalId = setInterval(() => {
            const now = Date.now();

            for (const [deviceId, lastPing] of this.registry.entries()) {
                if (now - lastPing > DROPOUT_THRESHOLD_MS) {
                    console.error(
                        `[WOLF GUARD] ⚠️ HARDWARE DROPOUT: Device ${deviceId} has lost connection.`
                    );

                    // Push real-time alert to admin dashboards
                    if (globalThis.io) {
                        globalThis.io.emit('wolfguard:hardware_dropout', {
                            deviceId,
                            lastPing: new Date(lastPing).toISOString(),
                            silentForMs: now - lastPing
                        });
                    }
                }
            }
        }, intervalMs);

        return this._intervalId;
    }

    /** Stop the heartbeat loop. */
    stopMonitoring() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    /**
     * Return a snapshot of all tracked devices for a dashboard endpoint.
     * @returns {Array<{deviceId: string, lastPing: string, silentSinceMs: number, online: boolean}>}
     */
    getStatus() {
        const now = Date.now();
        return Array.from(this.registry.entries()).map(([deviceId, lastPing]) => ({
            deviceId,
            lastPing: new Date(lastPing).toISOString(),
            silentSinceMs: now - lastPing,
            online: (now - lastPing) <= 15000
        }));
    }
}

// ── Exports (extended — still includes original ClinicalSentinel class) ───

module.exports = {
    ClinicalSentinel,
    tenantBreachDetector,
    DeviceHeartbeatMonitor
};
