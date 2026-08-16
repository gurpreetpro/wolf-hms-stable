const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 🤰 Maternity / OBGYN Controller
 * Handles Antenatal Profiles, Algorithmic Partograph Labor Monitoring, and Delivery Registry
 */

/**
 * Create or Update Antenatal Profile (GPAL, LMP, EDD, Risk Category)
 */
const saveAntenatalProfile = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;

    const {
        patient_id,
        gravidity = 1,
        parity = 0,
        abortions = 0,
        living_children = 0,
        lmp,
        edd,
        gestational_age_weeks,
        risk_category = 'LOW_RISK',
        blood_group,
        rh_factor,
        special_notes
    } = req.body;

    if (!patient_id) {
        return ResponseHandler.error(res, 'patient_id is required', 400);
    }

    // Auto-calculate EDD from LMP if EDD is missing (Naegele's rule: LMP + 280 days)
    let calculatedEDD = edd ? new Date(edd) : null;
    let calculatedGestationalWeeks = gestational_age_weeks ? parseFloat(gestational_age_weeks) : null;

    if (lmp && !calculatedEDD) {
        const lmpDate = new Date(lmp);
        if (!isNaN(lmpDate.getTime())) {
            calculatedEDD = new Date(lmpDate.getTime() + (280 * 24 * 60 * 60 * 1000));
        }
    }

    if (lmp && !calculatedGestationalWeeks) {
        const lmpDate = new Date(lmp);
        if (!isNaN(lmpDate.getTime())) {
            const diffDays = Math.floor((new Date() - lmpDate) / (1000 * 60 * 60 * 24));
            calculatedGestationalWeeks = Math.round((diffDays / 7) * 10) / 10;
        }
    }

    // Upsert antenatal profile
    const existingRes = await pool.query(
        `SELECT id FROM maternity_antenatal_profiles WHERE patient_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)`,
        [patient_id, hospitalId]
    );

    let result;
    if (existingRes.rows.length > 0) {
        const profileId = existingRes.rows[0].id;
        result = await pool.query(
            `UPDATE maternity_antenatal_profiles SET
                gravidity = $1, parity = $2, abortions = $3, living_children = $4,
                lmp = $5, edd = $6, gestational_age_weeks = $7, risk_category = $8,
                blood_group = $9, rh_factor = $10, special_notes = $11, updated_at = NOW()
             WHERE id = $12 RETURNING *`,
            [
                parseInt(gravidity), parseInt(parity), parseInt(abortions), parseInt(living_children),
                lmp ? new Date(lmp) : null, calculatedEDD, calculatedGestationalWeeks,
                risk_category, blood_group || null, rh_factor || null, special_notes || null, profileId
            ]
        );
    } else {
        result = await pool.query(
            `INSERT INTO maternity_antenatal_profiles (
                patient_id, gravidity, parity, abortions, living_children,
                lmp, edd, gestational_age_weeks, risk_category,
                blood_group, rh_factor, special_notes, hospital_id, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9,
                $10, $11, $12, $13, NOW(), NOW()
            ) RETURNING *`,
            [
                patient_id, parseInt(gravidity), parseInt(parity), parseInt(abortions), parseInt(living_children),
                lmp ? new Date(lmp) : null, calculatedEDD, calculatedGestationalWeeks, risk_category,
                blood_group || null, rh_factor || null, special_notes || null, hospitalId
            ]
        );
    }

    return ResponseHandler.success(res, result.rows[0], 'Antenatal profile saved successfully', 200);
});

/**
 * Fetch Antenatal Profile for a patient
 */
const getAntenatalProfile = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;
    const { patientId } = req.params;

    const result = await pool.query(
        `SELECT * FROM maternity_antenatal_profiles WHERE patient_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)`,
        [patientId, hospitalId]
    );

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'No antenatal profile found for this patient', 404);
    }

    return ResponseHandler.success(res, result.rows[0], 'Antenatal profile retrieved successfully');
});

/**
 * 📈 Record Partograph Matrix Reading with Algorithmic Labor Distress Warnings
 */
const recordPartographReading = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;
    const recordedBy = req.user?.id || null;

    const {
        antenatal_profile_id,
        admission_id,
        patient_id,
        cervical_dilation_cm,
        fetal_heart_rate_bpm,
        fhr_pattern,
        contractions_per_10min,
        contraction_duration_sec,
        amniotic_fluid_status,
        maternal_bp_systolic,
        maternal_bp_diastolic,
        maternal_pulse_bpm,
        oxytocin_units_min = 0
    } = req.body;

    if (!patient_id || cervical_dilation_cm === undefined || fetal_heart_rate_bpm === undefined) {
        return ResponseHandler.error(res, 'patient_id, cervical_dilation_cm, and fetal_heart_rate_bpm are required', 400);
    }

    const dilation = parseFloat(cervical_dilation_cm);
    const fhr = parseInt(fetal_heart_rate_bpm);

    let alertZoneTriggered = false;
    let actionZoneTriggered = false;
    const warnings = [];

    // 1. Algorithmic WHO Partograph Check
    // Active phase threshold starts at 4 cm dilation. Standard expected rate = 1 cm/hour.
    const historyRes = await pool.query(
        `SELECT cervical_dilation_cm, recorded_at FROM maternity_labor_partographs 
         WHERE patient_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)
         ORDER BY recorded_at ASC`,
        [patient_id, hospitalId]
    );

    const firstActiveReading = historyRes.rows.find(r => parseFloat(r.cervical_dilation_cm) >= 4.0);

    if (firstActiveReading && dilation >= 4.0) {
        const startTime = new Date(firstActiveReading.recorded_at).getTime();
        const currentTime = new Date().getTime();
        const hoursElapsed = Math.max(0.5, (currentTime - startTime) / (1000 * 60 * 60));
        
        const initialDilation = parseFloat(firstActiveReading.cervical_dilation_cm);
        const expectedAlertDilation = Math.min(10.0, initialDilation + (hoursElapsed * 1.0)); // 1 cm/hr alert line
        const expectedActionDilation = Math.min(10.0, initialDilation + Math.max(0, (hoursElapsed - 4.0) * 1.0)); // Action line = 4 hours delay

        if (dilation < expectedAlertDilation - 0.5) {
            alertZoneTriggered = true;
            warnings.push(`Cervical dilation rate (${dilation} cm) is lagging behind expected Alert Line (${expectedAlertDilation.toFixed(1)} cm)`);
        }

        if (dilation <= expectedActionDilation && hoursElapsed >= 4.0) {
            actionZoneTriggered = true;
            warnings.push(`CRITICAL: Labor progress reached the Action Line! Protracted labor detected — evaluate for emergency LSCS/intervention`);
        }
    }

    // 2. Fetal Distress Check
    if (fhr < 110) {
        warnings.push(`Fetal Bradycardia detected (FHR: ${fhr} bpm < 110)`);
    } else if (fhr > 160) {
        warnings.push(`Fetal Tachycardia detected (FHR: ${fhr} bpm > 160)`);
    }

    if (fhr_pattern === 'LATE_DECEL') {
        warnings.push(`Late decelerations logged — severe fetal hypoxia risk`);
    }

    if (amniotic_fluid_status === 'MECONIUM_STAINED') {
        warnings.push(`Meconium-stained amniotic fluid logged — aspiration risk`);
    } else if (amniotic_fluid_status === 'BLOOD_STAINED') {
        warnings.push(`Blood-stained amniotic fluid logged — abruptio placentae risk`);
    }

    const distressAlert = alertZoneTriggered || actionZoneTriggered || (fhr < 110 || fhr > 160 || fhr_pattern === 'LATE_DECEL' || amniotic_fluid_status === 'MECONIUM_STAINED');

    const query = `
        INSERT INTO maternity_labor_partographs (
            antenatal_profile_id, admission_id, patient_id, recorded_at,
            cervical_dilation_cm, fetal_heart_rate_bpm, fhr_pattern,
            contractions_per_10min, contraction_duration_sec, amniotic_fluid_status,
            maternal_bp_systolic, maternal_bp_diastolic, maternal_pulse_bpm,
            oxytocin_units_min, alert_zone_triggered, action_zone_triggered,
            recorded_by, hospital_id, created_at, updated_at
        ) VALUES (
            $1, $2, $3, NOW(),
            $4, $5, $6,
            $7, $8, $9,
            $10, $11, $12,
            $13, $14, $15,
            $16, $17, NOW(), NOW()
        ) RETURNING *
    `;

    const values = [
        antenatal_profile_id || null,
        admission_id || null,
        patient_id,
        dilation,
        fhr,
        fhr_pattern || null,
        parseInt(contractions_per_10min || 0),
        parseInt(contraction_duration_sec || 0),
        amniotic_fluid_status || null,
        maternal_bp_systolic ? parseInt(maternal_bp_systolic) : null,
        maternal_bp_diastolic ? parseInt(maternal_bp_diastolic) : null,
        maternal_pulse_bpm ? parseInt(maternal_pulse_bpm) : null,
        parseFloat(oxytocin_units_min || 0),
        alertZoneTriggered,
        actionZoneTriggered,
        recordedBy,
        hospitalId
    ];

    const result = await pool.query(query, values);
    const record = result.rows[0];

    return ResponseHandler.success(res, {
        record,
        distressAlert,
        alertZoneTriggered,
        actionZoneTriggered,
        warnings
    }, distressAlert ? '⚠️ WARNING: Partograph reading logged with labor distress alert' : 'Partograph reading recorded successfully', 201);
});

/**
 * Fetch complete partograph timeline matrix for a patient
 */
const getPartographTimeline = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;
    const { patientId } = req.params;

    const result = await pool.query(
        `SELECT * FROM maternity_labor_partographs 
         WHERE patient_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)
         ORDER BY recorded_at ASC`,
        [patientId, hospitalId]
    );

    return ResponseHandler.success(res, {
        patient_id: patientId,
        readings_count: result.rows.length,
        timeline: result.rows
    }, 'Partograph timeline matrix retrieved successfully');
});

/**
 * 👶 Register Delivery Outcome (Vaginal, LSCS, Newborn Vitals, Apgar, Birth Cert)
 */
const registerDeliveryOutcome = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;

    const {
        patient_id,
        admission_id,
        antenatal_profile_id,
        delivery_timestamp,
        delivery_type = 'NORMAL_VAGINAL',
        indication_for_lscs,
        obstetrician_id,
        pediatrician_id,
        newborn_gender,
        newborn_weight_kg,
        apgar_1min,
        apgar_5min,
        apgar_10min,
        birth_certificate_number,
        complications,
        blood_loss_ml
    } = req.body;

    if (!patient_id || !newborn_gender || newborn_weight_kg === undefined || apgar_1min === undefined || apgar_5min === undefined) {
        return ResponseHandler.error(res, 'patient_id, newborn_gender, newborn_weight_kg, apgar_1min, and apgar_5min are required', 400);
    }

    // Auto-generate birth certificate number if omitted
    const generatedCertNo = birth_certificate_number || `BC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`;

    const query = `
        INSERT INTO maternity_delivery_registry (
            patient_id, admission_id, antenatal_profile_id, delivery_timestamp,
            delivery_type, indication_for_lscs, obstetrician_id, pediatrician_id,
            newborn_gender, newborn_weight_kg, apgar_1min, apgar_5min, apgar_10min,
            birth_certificate_number, complications, blood_loss_ml, hospital_id,
            created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11, $12, $13,
            $14, $15, $16, $17,
            NOW(), NOW()
        ) RETURNING *
    `;

    const values = [
        patient_id,
        admission_id || null,
        antenatal_profile_id || null,
        delivery_timestamp ? new Date(delivery_timestamp) : new Date(),
        delivery_type,
        indication_for_lscs || null,
        obstetrician_id ? parseInt(obstetrician_id) : null,
        pediatrician_id ? parseInt(pediatrician_id) : null,
        newborn_gender,
        parseFloat(newborn_weight_kg),
        parseInt(apgar_1min),
        parseInt(apgar_5min),
        apgar_10min ? parseInt(apgar_10min) : null,
        generatedCertNo,
        complications || null,
        blood_loss_ml ? parseFloat(blood_loss_ml) : null,
        hospitalId
    ];

    const result = await pool.query(query, values);
    return ResponseHandler.success(res, result.rows[0], 'Delivery outcome and birth certificate registered successfully', 201);
});

/**
 * Fetch delivery outcome record for a patient
 */
const getDeliveryOutcome = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;
    const { patientId } = req.params;

    const result = await pool.query(
        `SELECT * FROM maternity_delivery_registry WHERE patient_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL) ORDER BY delivery_timestamp DESC`,
        [patientId, hospitalId]
    );

    return ResponseHandler.success(res, {
        patient_id: patientId,
        count: result.rows.length,
        deliveries: result.rows
    }, 'Delivery registry records retrieved successfully');
});

module.exports = {
    saveAntenatalProfile,
    getAntenatalProfile,
    recordPartographReading,
    getPartographTimeline,
    registerDeliveryOutcome,
    getDeliveryOutcome
};
