const prisma = require('../config/prisma');
const { VITALS_THRESHOLDS } = require('../config/hmsConstants');

/**
 * Service to handle clinical operations
 */
const ClinicalService = {

    /**
     * Log patient vitals and generate alerts if thresholds are breached.
     * @param {Object} data - { admission_id, patient_id, bp, temp, spo2, heart_rate, user_id }
     * @returns {Object} { vitalsLog: Object, alerts: Array }
     */
    async logVitals({ admission_id, patient_id, bp, temp, spo2, heart_rate, user_id }) {
        // Prepare data for Prisma (convert to strings as per schema)
        // Parse numbers for logic check
        const hrVal = parseInt(heart_rate);
        const spo2Val = parseInt(spo2);
        const tempVal = parseFloat(temp);

        // Alert Generation Logic (Calculate BEFORE transaction)
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

        // Execute Transaction
        return await prisma.$transaction(async (tx) => {
            // 1. Create Log
            const vitalsLog = await tx.vitals_logs.create({
                data: {
                    admission_id: admission_id || null,
                    patient_id: patient_id || null,
                    bp: bp ? String(bp) : null,
                    temp: temp ? String(temp) : null,
                    spo2: spo2 ? String(spo2) : null,
                    heart_rate: heart_rate ? String(heart_rate) : null,
                    recorded_by: user_id ? parseInt(user_id) : null,
                    recorded_at: new Date()
                }
            });

            // 2. Create Alerts
            if (patient_id) {
                for (const alert of alertsData) {
                    await tx.clinical_alerts.create({
                        data: {
                            patients: patient_id ? { connect: { id: patient_id } } : undefined,
                            admissions: admission_id ? { connect: { id: admission_id } } : undefined,
                            type: alert.type,
                            title: alert.title,
                            // severity: alert.severity, // Column does not exist
                            message: alert.message,
                            value: alert.value,
                            threshold: alert.threshold,
                            created_at: new Date()
                        }
                    });
                }
            }

            return { vitalsLog, alerts: alertsData };
        });
    }
};

module.exports = ClinicalService;
