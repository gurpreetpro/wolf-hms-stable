/**
 * Device Controller
 * Handles IoT device data ingestion (vitals monitors, lab instruments, smart beds)
 * 
 * Supports:
 * - Patient vital signs from bedside monitors
 * - Lab analyzer results (HL7/ASTM format)
 * - Smart bed status updates
 * - Infusion pump data
 */

const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/devices/ingest
 * Ingest vital signs from bedside monitors
 */
const ingestVitals = asyncHandler(async (req, res) => {
    const { 
        device_id, 
        patient_id, 
        admission_id,
        vitals,
        timestamp 
    } = req.body;

    // Validate required fields
    if (!device_id || !vitals) {
        return ResponseHandler.error(res, 'device_id and vitals are required', 400);
    }

    // Extract vital values
    const {
        heart_rate,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        spo2,
        temperature,
        respiratory_rate
    } = vitals;

    // Insert into clinical_vitals table
    const result = await pool.query(
        `INSERT INTO clinical_vitals 
         (patient_id, admission_id, heart_rate, bp_systolic, bp_diastolic, spo2, temperature, respiratory_rate, recorded_at, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
            patient_id,
            admission_id,
            heart_rate,
            blood_pressure_systolic,
            blood_pressure_diastolic,
            spo2,
            temperature,
            respiratory_rate,
            timestamp || new Date(),
            `device:${device_id}`
        ]
    );

    // Check for critical values and emit alert
    const alerts = [];
    if (heart_rate && (heart_rate < 40 || heart_rate > 150)) {
        alerts.push({ type: 'CRITICAL_HR', value: heart_rate, threshold: '40-150' });
    }
    if (spo2 && spo2 < 90) {
        alerts.push({ type: 'LOW_SPO2', value: spo2, threshold: '>= 90' });
    }
    if (blood_pressure_systolic && blood_pressure_systolic > 180) {
        alerts.push({ type: 'HIGH_BP', value: blood_pressure_systolic, threshold: '<= 180' });
    }

    // Emit real-time update via Socket.IO
    if (global.io && admission_id) {
        global.io.to(`admission_${admission_id}`).emit('vitals_update', {
            ...vitals,
            timestamp: timestamp || new Date(),
            alerts
        });
    }

    ResponseHandler.success(res, {
        vitals_id: result.rows[0].id,
        alerts_generated: alerts.length,
        alerts: alerts.length > 0 ? alerts : undefined
    }, 'Vitals ingested successfully', 201);
});

/**
 * POST /api/devices/lab-result
 * Ingest lab results from analyzers (HL7/ASTM format)
 */
const ingestLabResult = asyncHandler(async (req, res) => {
    const {
        device_id,
        sample_id,
        test_code,
        test_name,
        result_value,
        result_unit,
        reference_range,
        flags,
        timestamp
    } = req.body;

    if (!device_id || !sample_id || !test_code) {
        return ResponseHandler.error(res, 'device_id, sample_id, and test_code are required', 400);
    }

    // Find the lab order by sample ID
    const orderResult = await pool.query(
        `SELECT lo.id, lo.patient_id, lo.admission_id, lo.hospital_id
         FROM lab_orders lo
         WHERE lo.sample_id = $1`,
        [sample_id]
    );

    if (orderResult.rows.length === 0) {
        return ResponseHandler.error(res, `Sample ID ${sample_id} not found`, 404);
    }

    const order = orderResult.rows[0];

    // Update or insert lab result
    await pool.query(
        `INSERT INTO lab_results (lab_order_id, test_code, test_name, result_value, result_unit, reference_range, flags, result_source, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (lab_order_id, test_code) 
         DO UPDATE SET result_value = $4, flags = $6, recorded_at = $9`,
        [order.id, test_code, test_name, result_value, result_unit, reference_range, flags, `device:${device_id}`, timestamp || new Date()]
    );

    // Update order status
    await pool.query(
        `UPDATE lab_orders SET status = 'Results Available' WHERE id = $1 AND status != 'Completed'`,
        [order.id]
    );

    // Emit notification
    if (global.io) {
        global.io.to(`hosp_${order.hospital_id}_lab`).emit('lab_result', {
            order_id: order.id,
            sample_id,
            test_code,
            test_name,
            result_value,
            flags
        });
    }

    ResponseHandler.success(res, {
        order_id: order.id,
        test_code,
        result_value,
        flags
    }, 'Lab result ingested', 201);
});

/**
 * POST /api/devices/bed-status
 * Update smart bed status
 */
const updateBedStatus = asyncHandler(async (req, res) => {
    const {
        device_id,
        bed_number,
        ward_id,
        status, // occupied, vacant, maintenance
        patient_position, // sitting, lying, raised
        weight_kg,
        bed_exit_alert
    } = req.body;

    if (!device_id || !bed_number) {
        return ResponseHandler.error(res, 'device_id and bed_number are required', 400);
    }

    // Update bed status
    await pool.query(
        `UPDATE beds 
         SET smart_status = $1, 
             last_device_update = NOW(),
             device_id = $2
         WHERE bed_number = $3 AND ward_id = $4`,
        [JSON.stringify({ patient_position, weight_kg, bed_exit_alert }), device_id, bed_number, ward_id]
    );

    // Handle bed exit alert
    if (bed_exit_alert) {
        // Find patient in this bed
        const admissionResult = await pool.query(
            `SELECT a.id, a.patient_id, p.name, a.hospital_id
             FROM admissions a
             JOIN patients p ON a.patient_id = p.id
             WHERE a.bed_number = $1 AND a.status = 'Admitted'`,
            [bed_number]
        );

        if (admissionResult.rows.length > 0) {
            const admission = admissionResult.rows[0];
            
            // Emit fall risk alert
            if (global.io) {
                global.io.to(`hosp_${admission.hospital_id}_nursing`).emit('bed_exit_alert', {
                    admission_id: admission.id,
                    patient_name: admission.name,
                    bed_number,
                    alert_type: 'BED_EXIT',
                    timestamp: new Date()
                });
            }
        }
    }

    ResponseHandler.success(res, {
        bed_number,
        status: 'updated',
        bed_exit_alert: bed_exit_alert || false
    });
});

/**
 * GET /api/devices/status
 * Get registered device status
 */
const getDeviceStatus = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || 1;

    // This would check a devices table - for now return mock
    ResponseHandler.success(res, {
        devices: [
            { id: 'MONITOR-001', type: 'vitals_monitor', status: 'online', last_ping: new Date() },
            { id: 'ANALYZER-LAB1', type: 'lab_analyzer', status: 'online', last_ping: new Date() },
            { id: 'BED-ICU-01', type: 'smart_bed', status: 'online', last_ping: new Date() }
        ],
        total_online: 3,
        total_offline: 0
    });
});

/**
 * POST /api/devices/register
 * Register a new device
 */
const registerDevice = asyncHandler(async (req, res) => {
    const { device_id, device_type, location, ward_id } = req.body;
    const hospitalId = req.hospital_id || 1;

    if (!device_id || !device_type) {
        return ResponseHandler.error(res, 'device_id and device_type are required', 400);
    }

    // For now just acknowledge - would insert into devices table
    ResponseHandler.success(res, {
        device_id,
        device_type,
        hospital_id: hospitalId,
        registered: true,
        api_key: `wolf_dev_${device_id}_${Date.now()}`
    }, 'Device registered', 201);
});

module.exports = {
    ingestVitals,
    ingestLabResult,
    updateBedStatus,
    getDeviceStatus,
    registerDevice
};
