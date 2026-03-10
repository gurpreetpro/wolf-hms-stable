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

module.exports = ClinicalSentinel;
