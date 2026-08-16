const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 🫁 ICU Ventilator Metrics Controller
 * High-frequency telemetry updates (Mode, PEEP, FiO2, Resp Rate, Tidal Volume, Pressures)
 */
const logVentilatorMetrics = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;
    const recordedBy = req.user?.id || null;

    const {
        admission_id,
        ventilator_mode,
        peep,
        fio2,
        respiratory_rate,
        tidal_volume,
        peak_pressure,
        plateau_pressure,
        sp02,
        ie_ratio
    } = req.body;

    if (!admission_id) {
        return ResponseHandler.error(res, 'admission_id is required', 400);
    }

    const query = `
        INSERT INTO icu_ventilator_logs (
            admission_id, ventilator_mode, peep, fio2, respiratory_rate,
            tidal_volume, peak_pressure, plateau_pressure, sp02, ie_ratio,
            recorded_by, hospital_id, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, NOW(), NOW()
        ) RETURNING *
    `;

    const values = [
        admission_id,
        ventilator_mode || null,
        peep !== undefined && peep !== null ? parseFloat(peep) : null,
        fio2 !== undefined && fio2 !== null ? parseFloat(fio2) : null,
        respiratory_rate !== undefined && respiratory_rate !== null ? parseInt(respiratory_rate) : null,
        tidal_volume !== undefined && tidal_volume !== null ? parseFloat(tidal_volume) : null,
        peak_pressure !== undefined && peak_pressure !== null ? parseFloat(peak_pressure) : null,
        plateau_pressure !== undefined && plateau_pressure !== null ? parseFloat(plateau_pressure) : null,
        sp02 !== undefined && sp02 !== null ? parseFloat(sp02) : null,
        ie_ratio || null,
        recordedBy,
        hospitalId
    ];

    const result = await pool.query(query, values);
    return ResponseHandler.success(res, result.rows[0], 'ICU ventilator metrics logged successfully', 201);
});

/**
 * Fetch ventilator history for an ICU admission
 */
const getVentilatorHistory = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;
    const { admissionId } = req.params;

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
        admission_id: parseInt(admissionId),
        count: result.rows.length,
        logs: result.rows
    }, 'Ventilator log history retrieved successfully');
});

/**
 * 💧 Hourly Fluid Intake / Output (I/O) Charting
 * Calculates hourly and rolling cumulative fluid balance on the fly.
 */
const logFluidIO = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;
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
    } = req.body;

    if (!admission_id) {
        return ResponseHandler.error(res, 'admission_id is required', 400);
    }

    const intakeTotal = parseFloat(iv_fluids_ml || 0) + 
                        parseFloat(blood_products_ml || 0) + 
                        parseFloat(oral_intake_ml || 0) + 
                        parseFloat(enteral_feeding_ml || 0);

    const outputTotal = parseFloat(urine_output_ml || 0) + 
                         parseFloat(drain_output_ml || 0) + 
                         parseFloat(stool_output_ml || 0) + 
                         parseFloat(emesis_ml || 0);

    const hourlyBalance = intakeTotal - outputTotal;

    // Retrieve previous cumulative balance for this admission
    const prevRes = await pool.query(
        `SELECT cumulative_balance_ml FROM icu_fluid_io_charting 
         WHERE admission_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)
         ORDER BY chart_time DESC, created_at DESC LIMIT 1`,
        [admission_id, hospitalId]
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
        admission_id,
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
    const hospitalId = req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;
    const { admissionId } = req.params;

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
        admission_id: parseInt(admissionId),
        latest_cumulative_balance_ml: latestCumulative,
        summary_24h: summaryRes.rows[0],
        chart_count: listRes.rows.length,
        logs: listRes.rows
    }, 'Fluid I/O charting history retrieved successfully');
});

module.exports = {
    logVentilatorMetrics,
    getVentilatorHistory,
    logFluidIO,
    getFluidIOHistory
};
