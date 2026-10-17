const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 🫁 ICU Controller — ventilator telemetry, hourly fluid I/O and ICU quick-admit.
 *
 * ID TYPES: `admissions.id` is INTEGER locally but UUID in production. Every admission
 * identifier goes through `normAdmissionId()` — numeric strings become integers, anything
 * else is preserved as a UUID string. parseInt() on a UUID would yield NaN and 500.
 */
const normAdmissionId = (v) => (/^\d+$/.test(String(v ?? '').trim()) ? parseInt(String(v).trim(), 10) : String(v ?? '').trim());
const hospitalOf = (req) => req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
const intOrNull = (v) => (v === undefined || v === null || v === '' ? null : parseInt(v, 10));

/**
 * 🫁 Ventilator telemetry — mode, PEEP, FiO2, RR, tidal volume, pressures, SpO2, I:E,
 * plus the four columns added in migration 312 (MAP / systolic / diastolic / temp).
 */
const logVentilatorMetrics = asyncHandler(async (req, res) => {
    const hospitalId = hospitalOf(req);
    const recordedBy = req.user?.id || null;

    const {
        admission_id, ventilator_mode, peep, fio2, respiratory_rate, tidal_volume,
        peak_pressure, plateau_pressure, sp02, ie_ratio,
        map_mmhg, sys_bp, dia_bp, temperature_c,
    } = req.body || {};

    if (!admission_id) {
        return ResponseHandler.error(res, 'admission_id is required', 400);
    }

    const query = `
        INSERT INTO icu_ventilator_logs (
            admission_id, ventilator_mode, peep, fio2, respiratory_rate,
            tidal_volume, peak_pressure, plateau_pressure, sp02, ie_ratio,
            map_mmhg, sys_bp, dia_bp, temperature_c,
            recorded_by, hospital_id, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14,
            $15, $16, NOW(), NOW()
        ) RETURNING *
    `;

    const values = [
        normAdmissionId(admission_id),
        ventilator_mode || null,
        num(peep),
        num(fio2),
        intOrNull(respiratory_rate),
        num(tidal_volume),
        num(peak_pressure),
        num(plateau_pressure),
        num(sp02),
        ie_ratio || null,
        intOrNull(map_mmhg),
        intOrNull(sys_bp),
        intOrNull(dia_bp),
        num(temperature_c),
        recordedBy,
        hospitalId,
    ];

    const result = await pool.query(query, values);
    return ResponseHandler.success(res, result.rows[0], 'ICU ventilator metrics logged successfully', 201);
});

/**
 * Ventilator history for one ICU admission (newest first).
 */
const getVentilatorHistory = asyncHandler(async (req, res) => {
    const hospitalId = hospitalOf(req);
    const admissionId = normAdmissionId(req.params.admissionId);

    if (!admissionId) {
        return ResponseHandler.error(res, 'Admission ID is required', 400);
    }

    const result = await pool.query(
        `SELECT * FROM icu_ventilator_logs 
         WHERE admission_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)
         ORDER BY created_at DESC LIMIT 100`,
        [admissionId, hospitalId]
    );

    return ResponseHandler.success(res, {
        admission_id: admissionId,
        count: result.rows.length,
        logs: result.rows
    }, 'Ventilator log history retrieved successfully');
});

/**
 * 💧 Hourly Fluid Intake / Output (I/O) Charting
 * Calculates hourly and rolling cumulative fluid balance on the fly.
 */
const logFluidIO = asyncHandler(async (req, res) => {
    const hospitalId = hospitalOf(req);
    const recordedBy = req.user?.id || null;

    const {
        admission_id,
        chart_time,
        iv_fluids_ml = 0,
        blood_products_ml = 0,
        oral_intake_ml = 0,
        enteral_feeding_ml = 0,
        urine_output_ml = 0,
        drain_output_ml = 0,
        stool_output_ml = 0,
        emesis_ml = 0,
        notes
    } = req.body || {};

    if (!admission_id) {
        return ResponseHandler.error(res, 'admission_id is required', 400);
    }
    const admissionId = normAdmissionId(admission_id);

    const intakeTotal = Number(iv_fluids_ml || 0) +
                        Number(blood_products_ml || 0) +
                        Number(oral_intake_ml || 0) +
                        Number(enteral_feeding_ml || 0);

    const outputTotal = Number(urine_output_ml || 0) +
                         Number(drain_output_ml || 0) +
                         Number(stool_output_ml || 0) +
                         Number(emesis_ml || 0);

    const hourlyBalance = intakeTotal - outputTotal;

    // Retrieve previous cumulative balance for this admission
    const prevRes = await pool.query(
        `SELECT cumulative_balance_ml FROM icu_fluid_io_charting 
         WHERE admission_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)
         ORDER BY chart_time DESC, created_at DESC LIMIT 1`,
        [admissionId, hospitalId]
    );

    const prevCumulative = prevRes.rows.length > 0 ? parseFloat(prevRes.rows[0].cumulative_balance_ml || 0) : 0.0;
    const newCumulativeBalance = prevCumulative + hourlyBalance;

    const query = `
        INSERT INTO icu_fluid_io_charting (
            admission_id, chart_time, iv_fluids_ml, blood_products_ml,
            oral_intake_ml, enteral_feeding_ml, total_intake_ml,
            urine_output_ml, drain_output_ml, stool_output_ml, emesis_ml,
            total_output_ml, hourly_balance_ml, cumulative_balance_ml,
            notes, recorded_by, hospital_id, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16, $17, NOW(), NOW()
        ) RETURNING *
    `;

    const values = [
        admissionId,
        chart_time ? new Date(chart_time) : new Date(),
        parseFloat(iv_fluids_ml || 0),
        parseFloat(blood_products_ml || 0),
        parseFloat(oral_intake_ml || 0),
        parseFloat(enteral_feeding_ml || 0),
        intakeTotal,
        parseFloat(urine_output_ml || 0),
        parseFloat(drain_output_ml || 0),
        parseFloat(stool_output_ml || 0),
        parseFloat(emesis_ml || 0),
        outputTotal,
        hourlyBalance,
        newCumulativeBalance,
        notes || null,
        recordedBy,
        hospitalId
    ];

    const result = await pool.query(query, values);
    return ResponseHandler.success(res, result.rows[0], 'ICU Fluid I/O entry charted successfully', 201);
});

/**
 * Fetch fluid I/O chart timeline and 24h summary for an ICU admission
 */
const getFluidIOHistory = asyncHandler(async (req, res) => {
    const hospitalId = hospitalOf(req);
    const admissionId = normAdmissionId(req.params.admissionId);

    if (!admissionId) {
        return ResponseHandler.error(res, 'Admission ID is required', 400);
    }

    const listRes = await pool.query(
        `SELECT * FROM icu_fluid_io_charting 
         WHERE admission_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)
         ORDER BY chart_time ASC`,
        [admissionId, hospitalId]
    );

    // 24h aggregate metrics
    const summaryRes = await pool.query(
        `SELECT 
            COALESCE(SUM(total_intake_ml), 0) AS total_24h_intake,
            COALESCE(SUM(total_output_ml), 0) AS total_24h_output,
            COALESCE(SUM(hourly_balance_ml), 0) AS total_24h_balance
         FROM icu_fluid_io_charting 
         WHERE admission_id = $1 AND chart_time >= NOW() - INTERVAL '24 hours'`,
        [admissionId]
    );

    const latestCumulative = listRes.rows.length > 0 
        ? parseFloat(listRes.rows[listRes.rows.length - 1].cumulative_balance_ml || 0)
        : 0.0;

    return ResponseHandler.success(res, {
        admission_id: admissionId,
        latest_cumulative_balance_ml: latestCumulative,
        summary_24h: summaryRes.rows[0],
        chart_count: listRes.rows.length,
        logs: listRes.rows
    }, 'Fluid I/O charting history retrieved successfully');
});

/**
 * 🛏️ ICU Quick-Admit — guarantees `/icu` is never dead on an empty admission table.
 * Body: { patient_id?: uuid, patient_name?, ward?, bed_number?, diagnosis? }
 *  - with patient_id → admit that existing patient
 *  - without → reuse the most recent patient, else create a minimal one (only `name` is NOT NULL)
 */
const quickAdmit = asyncHandler(async (req, res) => {
    const hospitalId = hospitalOf(req);
    const { patient_id, patient_name, ward, bed_number, diagnosis } = req.body || {};

    let patient = null;
    if (patient_id) {
        const found = await pool.query(
            `SELECT id, name FROM patients WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)`,
            [patient_id, hospitalId]
        );
        if (!found.rowCount) return ResponseHandler.error(res, 'Patient not found for this hospital', 404);
        patient = found.rows[0];
    } else {
        const latest = await pool.query(
            `SELECT id, name FROM patients
              WHERE deleted_at IS NULL AND (hospital_id = $1 OR hospital_id IS NULL)
              ORDER BY created_at DESC NULLS LAST LIMIT 1`, [hospitalId]
        );
        if (latest.rowCount) {
            patient = latest.rows[0];
        } else {
            const created = await pool.query(
                `INSERT INTO patients (name, hospital_id) VALUES ($1, $2) RETURNING id, name`,
                [patient_name || 'ICU Quick-Admit Patient', hospitalId]
            );
            patient = created.rows[0];
        }
    }

    const admission = await pool.query(
        `INSERT INTO admissions (patient_id, ward, bed_number, status, hospital_id, diagnosis)
         VALUES ($1, $2, $3, 'Admitted', $4, $5)
         RETURNING *`,
        [
            patient.id,
            ward || 'ICU Main',
            bed_number || `ICU-${String(Date.now()).slice(-3)}`,
            hospitalId,
            diagnosis || 'Critical care admission (quick-admit)',
        ]
    );

    return ResponseHandler.success(res, {
        admission: admission.rows[0],
        patient,
    }, 'ICU patient quick-admitted', 201);
});

module.exports = {
    logVentilatorMetrics,
    getVentilatorHistory,
    logFluidIO,
    getFluidIOHistory,
    quickAdmit,
    normAdmissionId
};
