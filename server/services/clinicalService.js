const { pool } = require('../db');
const { VITALS_THRESHOLDS } = require('../config/hmsConstants');

/**
 * Service to handle clinical operations
 */
const ClinicalService = {

    /**
     * Log patient vitals and generate alerts if thresholds are breached.
     * @param {Object} data - { admission_id, patient_id, bp, temp, spo2, heart_rate, user_id, hospital_id }
     * @returns {Object} { vitalsLog: Object, alerts: Array }
     */
    async logVitals({ admission_id, patient_id, bp, temp, spo2, heart_rate, user_id, hospital_id }) {
        // Parse numbers for logic check
        const hrVal = parseInt(heart_rate, 10);
        const spo2Val = parseInt(spo2, 10);
        const tempVal = parseFloat(temp);

        // Normalize IDs
        const cleanAdmissionId = (admission_id && admission_id !== 'undefined' && admission_id !== 'null') ? admission_id : null;
        const cleanPatientId = (patient_id && patient_id !== 'undefined' && patient_id !== 'null') ? patient_id : null;
        const cleanUserId = user_id ? parseInt(user_id, 10) : null;
        const cleanHospitalId = hospital_id ? parseInt(hospital_id, 10) : 1;

        // Extract systolic and diastolic if bp is '120/80'
        let bp_systolic = null;
        let bp_diastolic = null;
        if (bp && typeof bp === 'string' && bp.includes('/')) {
            const parts = bp.split('/');
            bp_systolic = parseInt(parts[0], 10) || null;
            bp_diastolic = parseInt(parts[1], 10) || null;
        }

        // Alert Generation Logic (Calculate BEFORE database insert)
        const alertsData = [];
        
        if (!isNaN(hrVal)) {
            if (hrVal > VITALS_THRESHOLDS.HEART_RATE.CRITICAL_HIGH || hrVal < VITALS_THRESHOLDS.HEART_RATE.CRITICAL_LOW) {
                alertsData.push({ 
                    type: 'Vital Sign', 
                    title: 'Critical Heart Rate',
                    severity: 'High', 
                    message: `Critical Heart Rate: ${hrVal} ${VITALS_THRESHOLDS.HEART_RATE.UNIT}`, 
                    value: `${hrVal} ${VITALS_THRESHOLDS.HEART_RATE.UNIT}`, 
                    threshold: `>${VITALS_THRESHOLDS.HEART_RATE.CRITICAL_HIGH} or <${VITALS_THRESHOLDS.HEART_RATE.CRITICAL_LOW}` 
                });
            } else if (hrVal > VITALS_THRESHOLDS.HEART_RATE.ABNORMAL_HIGH || hrVal < VITALS_THRESHOLDS.HEART_RATE.ABNORMAL_LOW) {
                alertsData.push({ 
                    type: 'Vital Sign', 
                    title: 'Abnormal Heart Rate',
                    severity: 'Medium', 
                    message: `Abnormal Heart Rate: ${hrVal} ${VITALS_THRESHOLDS.HEART_RATE.UNIT}`, 
                    value: `${hrVal} ${VITALS_THRESHOLDS.HEART_RATE.UNIT}`, 
                    threshold: `>${VITALS_THRESHOLDS.HEART_RATE.ABNORMAL_HIGH} or <${VITALS_THRESHOLDS.HEART_RATE.ABNORMAL_LOW}` 
                });
            }
        }

        if (!isNaN(spo2Val)) {
            if (spo2Val < VITALS_THRESHOLDS.SPO2.CRITICAL_LOW) {
                alertsData.push({ 
                    type: 'Vital Sign', 
                    title: 'Critical SpO2',
                    severity: 'Critical', 
                    message: `Critical SpO2: ${spo2Val}${VITALS_THRESHOLDS.SPO2.UNIT}`, 
                    value: `${spo2Val}${VITALS_THRESHOLDS.SPO2.UNIT}`, 
                    threshold: `<${VITALS_THRESHOLDS.SPO2.CRITICAL_LOW}%` 
                });
            } else if (spo2Val < VITALS_THRESHOLDS.SPO2.LOW) {
                alertsData.push({ 
                    type: 'Vital Sign', 
                    title: 'Low SpO2',
                    severity: 'Medium', 
                    message: `Low SpO2: ${spo2Val}${VITALS_THRESHOLDS.SPO2.UNIT}`, 
                    value: `${spo2Val}${VITALS_THRESHOLDS.SPO2.UNIT}`, 
                    threshold: `<${VITALS_THRESHOLDS.SPO2.LOW}%` 
                });
            }
        }

        if (!isNaN(tempVal)) {
            if (tempVal > VITALS_THRESHOLDS.TEMP.CRITICAL_HIGH || tempVal < VITALS_THRESHOLDS.TEMP.CRITICAL_LOW) {
                alertsData.push({ 
                    type: 'Vital Sign', 
                    title: 'Critical Temperature',
                    severity: 'High', 
                    message: `Critical Temp: ${tempVal}${VITALS_THRESHOLDS.TEMP.UNIT}`, 
                    value: `${tempVal}${VITALS_THRESHOLDS.TEMP.UNIT}`, 
                    threshold: `>${VITALS_THRESHOLDS.TEMP.CRITICAL_HIGH} or <${VITALS_THRESHOLDS.TEMP.CRITICAL_LOW}` 
                });
            }
        }

        // 1. Insert into vitals_logs using raw node-postgres pool.query
        // We omit 'id' to allow PostgreSQL defaults (gen_random_uuid() on prod, nextval() on local)
        const insertRes = await pool.query(`
            INSERT INTO vitals_logs (
                patient_id, admission_id,
                bp, temp, spo2, heart_rate,
                bp_systolic, bp_diastolic, pulse, temperature,
                recorded_by, hospital_id, recorded_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            RETURNING *
        `, [
            cleanPatientId,
            cleanAdmissionId,
            bp ? String(bp) : null,
            temp ? String(temp) : null,
            !isNaN(spo2Val) ? spo2Val : (spo2 ? String(spo2) : null),
            heart_rate ? String(heart_rate) : null,
            bp_systolic,
            bp_diastolic,
            !isNaN(hrVal) ? hrVal : null,
            !isNaN(tempVal) ? tempVal : null,
            cleanUserId,
            cleanHospitalId
        ]);

        const vitalsLog = insertRes.rows[0];

        // 2. Dual-write to vitals twin table if patient_id is present (safe best-effort)
        if (cleanPatientId) {
            try {
                await pool.query(`
                    INSERT INTO vitals (
                        patient_id, temperature, pulse, bp_systolic, bp_diastolic, spo2, hospital_id, recorded_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                `, [
                    cleanPatientId,
                    !isNaN(tempVal) ? tempVal : null,
                    !isNaN(hrVal) ? hrVal : null,
                    bp_systolic,
                    bp_diastolic,
                    !isNaN(spo2Val) ? spo2Val : null,
                    cleanHospitalId
                ]);
            } catch (twinErr) {
                console.warn('[Vitals Dual-Write] Note:', twinErr.message);
            }
        }

        // 3. Create Alerts (best-effort raw SQL)
        if (cleanPatientId && alertsData.length > 0) {
            for (const alert of alertsData) {
                try {
                    await pool.query(`
                        INSERT INTO clinical_alerts (
                            patient_id, admission_id, type, title, message, value, threshold, created_at
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                    `, [
                        cleanPatientId,
                        cleanAdmissionId,
                        alert.type,
                        alert.title,
                        alert.message,
                        alert.value,
                        alert.threshold
                    ]);
                } catch (alertErr) {
                    console.warn('[Clinical Alert] Note:', alertErr.message);
                }
            }
        }

        return { vitalsLog, alerts: alertsData };
    }
};

module.exports = ClinicalService;
