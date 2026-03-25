/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Wolf HMS — Phase 8, Pillar 3
 * CLINICAL AI: PATHWAY DEVIATION & CARE QUALITY
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Sub-modules:
 *  1. Clinical Pathway Deviation Detector — flags when treatment deviates from protocols
 *  2. Readmission Risk Predictor — predicts 30-day readmission probability
 *  3. Antibiotic Stewardship Monitor — catches inappropriate antibiotic usage
 *  4. Sepsis Early Warning — integrates vitals for qSOFA-based alerts
 */

const pool = require('../../config/db');

class ClinicalPathwayAI {

    // ════════════════════════════════════════════════════════
    // 1. CLINICAL PATHWAY DEVIATION DETECTOR
    // ════════════════════════════════════════════════════════

    /**
     * Compare a patient's actual treatment against the standard 
     * clinical pathway for their diagnosis.
     * 
     * @param {number} admissionId
     * @param {number} hospitalId
     * @returns {Object} { adherenceScore, deviations[], recommendations[] }
     */
    static async checkPathwayAdherence(admissionId, hospitalId) {
        // Get admission diagnosis
        const admRes = await pool.query(`
            SELECT a.*, p.name, p.gender, p.dob
            FROM admissions a
            LEFT JOIN patients p ON a.patient_id = p.id
            WHERE a.id = $1 AND a.hospital_id = $2
        `, [admissionId, hospitalId]);

        if (admRes.rows.length === 0) return { error: 'Admission not found' };
        const admission = admRes.rows[0];
        const diagnosis = (admission.diagnosis || '').toLowerCase();

        // Standard Clinical Pathways (India-specific)
        const PATHWAYS = {
            'pneumonia': {
                requiredLabs: ['CBC', 'Chest X-Ray', 'Blood Culture', 'ABG'],
                requiredMeds: ['Ceftriaxone', 'Azithromycin'],
                expectedLOS: 5,
                vitalsFrequency: 4, // per day
                mandatoryActions: ['O2 monitoring', 'Sputum Culture if no improvement in 48h']
            },
            'sepsis': {
                requiredLabs: ['CBC', 'Procalcitonin', 'Blood Culture x2', 'Lactate', 'CRP'],
                requiredMeds: ['Piperacillin-Tazobactam', 'IV Fluid Bolus'],
                expectedLOS: 7,
                vitalsFrequency: 6,
                mandatoryActions: ['IV fluid resuscitation within 1 hour', 'Antibiotics within 1 hour', 'Lactate re-check at 6h']
            },
            'ami': {
                requiredLabs: ['Troponin', 'ECG', 'Echo', 'CBC', 'Lipid Profile'],
                requiredMeds: ['Aspirin', 'Clopidogrel', 'Atorvastatin', 'Heparin'],
                expectedLOS: 5,
                vitalsFrequency: 6,
                mandatoryActions: ['PCI evaluation within 90 minutes', 'Cardiology consult']
            },
            'diabetic ketoacidosis': {
                requiredLabs: ['Blood Sugar', 'ABG', 'Electrolytes', 'Ketones', 'HbA1c'],
                requiredMeds: ['Insulin Infusion', 'IV Normal Saline', 'Potassium Supplementation'],
                expectedLOS: 3,
                vitalsFrequency: 4,
                mandatoryActions: ['Hourly blood sugar monitoring', 'Fluid balance chart', 'Endocrinology consult']
            },
            'normal delivery': {
                requiredLabs: ['CBC', 'Blood Group', 'Urine R/M'],
                requiredMeds: ['Oxytocin'],
                expectedLOS: 3,
                vitalsFrequency: 4,
                mandatoryActions: ['Neonatal assessment within 1 hour', 'Breastfeeding initiation']
            },
        };

        // Find matching pathway
        let pathway = null;
        let pathwayKey = '';
        for (const [key, p] of Object.entries(PATHWAYS)) {
            if (diagnosis.includes(key)) {
                pathway = p;
                pathwayKey = key;
                break;
            }
        }

        if (!pathway) {
            return {
                admissionId,
                diagnosis: admission.diagnosis,
                message: 'No standard pathway configured for this diagnosis. Manual review recommended.',
                adherenceScore: null
            };
        }

        // Get actual labs ordered
        const labs = await pool.query(`
            SELECT DISTINCT test_name 
            FROM lab_requests lr
            JOIN admissions a ON lr.patient_id = a.patient_id
            WHERE a.id = $1 AND lr.hospital_id = $2
        `, [admissionId, hospitalId]);
        const orderedLabs = labs.rows.map(l => l.test_name);

        // Get medications given
        const meds = await pool.query(`
            SELECT DISTINCT description 
            FROM care_tasks
            WHERE admission_id = $1 AND hospital_id = $2 AND type = 'Medication'
        `, [admissionId, hospitalId]);
        const givenMeds = meds.rows.map(m => m.description);

        // Get vitals count
        const vitalsCount = await pool.query(`
            SELECT COUNT(*) as count,
                   EXTRACT(DAY FROM (MAX(recorded_at) - MIN(recorded_at))) + 1 as days
            FROM vitals_logs 
            WHERE admission_id = $1 AND hospital_id = $2
        `, [admissionId, hospitalId]);
        const totalVitals = Number(vitalsCount.rows[0]?.count || 0);
        const stayDays = Number(vitalsCount.rows[0]?.days || 1);

        // Calculate deviations
        const deviations = [];
        let adherencePoints = 100;

        // Check labs
        for (const reqLab of pathway.requiredLabs) {
            if (!orderedLabs.some(l => l.toLowerCase().includes(reqLab.toLowerCase()))) {
                deviations.push({
                    type: 'MISSING_LAB',
                    severity: 'HIGH',
                    expected: reqLab,
                    message: `Required lab "${reqLab}" was NOT ordered for ${pathwayKey}. This may delay diagnosis/treatment.`
                });
                adherencePoints -= 10;
            }
        }

        // Check medications 
        for (const reqMed of pathway.requiredMeds) {
            if (!givenMeds.some(m => m.toLowerCase().includes(reqMed.toLowerCase()))) {
                deviations.push({
                    type: 'MISSING_MEDICATION',
                    severity: 'CRITICAL',
                    expected: reqMed,
                    message: `Standard protocol medication "${reqMed}" NOT administered. Review clinical rationale.`
                });
                adherencePoints -= 15;
            }
        }

        // Check vitals frequency
        const expectedVitalsPerDay = pathway.vitalsFrequency;
        const actualVitalsPerDay = stayDays > 0 ? totalVitals / stayDays : 0;
        if (actualVitalsPerDay < expectedVitalsPerDay * 0.6) {
            deviations.push({
                type: 'INSUFFICIENT_MONITORING',
                severity: 'HIGH',
                expected: `${expectedVitalsPerDay}/day`,
                actual: `${Math.round(actualVitalsPerDay * 10) / 10}/day`,
                message: `Vitals monitoring below protocol: ${Math.round(actualVitalsPerDay)}/day vs required ${expectedVitalsPerDay}/day.`
            });
            adherencePoints -= 10;
        }

        return {
            admissionId,
            diagnosis: admission.diagnosis,
            pathway: pathwayKey,
            adherenceScore: Math.max(adherencePoints, 0),
            adherenceGrade: adherencePoints >= 90 ? 'A' : adherencePoints >= 75 ? 'B' : adherencePoints >= 60 ? 'C' : 'D',
            deviations,
            totalDeviations: deviations.length,
            analyzedAt: new Date().toISOString()
        };
    }

    // ════════════════════════════════════════════════════════
    // 2. READMISSION RISK PREDICTOR
    // ════════════════════════════════════════════════════════

    /**
     * Predict 30-day readmission risk based on patient factors.
     * Uses the HOSPITAL scoring model adapted for Indian context.
     * 
     * @param {string} patientId
     * @param {number} hospitalId
     * @returns {Object} { riskScore, riskLevel, factors[], interventions[] }
     */
    static async predictReadmissionRisk(patientId, hospitalId) {
        let riskScore = 0;
        const factors = [];

        // Get patient demographics
        const patRes = await pool.query(`
            SELECT p.*, 
                   (SELECT COUNT(*) FROM admissions WHERE patient_id = p.id AND hospital_id = $2) as total_admissions,
                   (SELECT MAX(discharged_at) FROM admissions WHERE patient_id = p.id AND hospital_id = $2) as last_discharge
            FROM patients p
            WHERE p.id = $1
        `, [patientId, hospitalId]);

        if (patRes.rows.length === 0) return { error: 'Patient not found' };
        const patient = patRes.rows[0];

        // Factor 1: Age > 65
        const age = patient.dob ? Math.floor((new Date() - new Date(patient.dob)) / (365.25*24*60*60*1000)) : null;
        if (age && age > 65) {
            riskScore += 15;
            factors.push({ name: 'Elderly (>65)', score: 15, detail: `Patient age: ${age}` });
        }

        // Factor 2: Prior admissions in last 6 months
        const priorAdm = await pool.query(`
            SELECT COUNT(*) as count FROM admissions
            WHERE patient_id = $1 AND hospital_id = $2
              AND admitted_at >= NOW() - INTERVAL '6 months'
        `, [patientId, hospitalId]);
        const priorCount = Number(priorAdm.rows[0]?.count || 0);
        if (priorCount >= 2) {
            riskScore += 20;
            factors.push({ name: 'Frequent admissions', score: 20, detail: `${priorCount} admissions in 6 months` });
        }

        // Factor 3: Chronic conditions
        const latestSOAP = await pool.query(`
            SELECT assessment FROM soap_notes sn
            JOIN admissions a ON sn.admission_id = a.id
            WHERE a.patient_id = $1 AND sn.hospital_id = $2
            ORDER BY sn.created_at DESC LIMIT 3
        `, [patientId, hospitalId]);
        
        const chronicTerms = ['diabetes', 'hypertension', 'copd', 'ckd', 'heart failure', 'cancer', 'cirrhosis'];
        const assessments = latestSOAP.rows.map(r => (r.assessment || '').toLowerCase()).join(' ');
        const chronicMatches = chronicTerms.filter(t => assessments.includes(t));
        if (chronicMatches.length > 0) {
            riskScore += chronicMatches.length * 10;
            factors.push({ name: 'Chronic comorbidities', score: chronicMatches.length * 10, detail: chronicMatches.join(', ') });
        }

        // Factor 4: Abnormal labs at discharge
        const lastLabs = await pool.query(`
            SELECT test_name, lres.result_json
            FROM lab_requests lr
            LEFT JOIN lab_results lres ON lres.request_id = lr.id
            JOIN admissions a ON lr.patient_id = a.patient_id
            WHERE a.patient_id = $1 AND lr.hospital_id = $2 AND lr.status = 'Completed'
            ORDER BY lr.requested_at DESC LIMIT 5
        `, [patientId, hospitalId]);
        
        if (lastLabs.rows.length > 0) {
            // Simple heuristic: if result_json contains "high" or "abnormal"
            const abnormalCount = lastLabs.rows.filter(l => 
                JSON.stringify(l.result_json || '').toLowerCase().match(/high|abnormal|critical|elevated/)
            ).length;
            if (abnormalCount > 0) {
                riskScore += abnormalCount * 8;
                factors.push({ name: 'Abnormal lab values at discharge', score: abnormalCount * 8, detail: `${abnormalCount} abnormal results` });
            }
        }

        // Cap at 100
        riskScore = Math.min(riskScore, 100);

        // Generate interventions
        const interventions = [];
        if (riskScore >= 50) {
            interventions.push('Schedule follow-up within 7 days of discharge');
            interventions.push('Assign care coordinator for telephonic check-in');
        }
        if (riskScore >= 30) {
            interventions.push('Ensure medication reconciliation at discharge');
            interventions.push('Provide written discharge instructions in local language');
        }
        if (chronicMatches.length > 0) {
            interventions.push(`Refer to ${chronicMatches.includes('diabetes') ? 'Endocrinology' : 'Specialist'} OPD`);
        }

        return {
            patientId,
            patientName: patient.name,
            riskScore,
            riskLevel: riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MODERATE' : 'LOW',
            factors,
            interventions,
            predictedAt: new Date().toISOString()
        };
    }

    // ════════════════════════════════════════════════════════
    // 3. SEPSIS EARLY WARNING (qSOFA-based)
    // ════════════════════════════════════════════════════════

    /**
     * Screen a patient's latest vitals for sepsis risk using qSOFA criteria.
     * 
     * qSOFA (Quick Sequential Organ Failure Assessment):
     *  - Respiratory Rate ≥ 22
     *  - Altered mentation (GCS <15)
     *  - Systolic BP ≤ 100
     * 
     * Score ≥ 2 = suspected sepsis → trigger alert
     * 
     * @param {number} admissionId
     * @param {number} hospitalId
     * @returns {Object} { qsofaScore, criteria[], isSepsisAlert, actions[] }
     */
    static async screenForSepsis(admissionId, hospitalId) {
        const vitals = await pool.query(`
            SELECT * FROM vitals_logs
            WHERE admission_id = $1 AND hospital_id = $2
            ORDER BY recorded_at DESC LIMIT 1
        `, [admissionId, hospitalId]);

        if (vitals.rows.length === 0) {
            return { error: 'No vitals found for this admission' };
        }

        const v = vitals.rows[0];
        let qsofaScore = 0;
        const criteria = [];

        // Criterion 1: Respiratory Rate ≥ 22
        const rr = Number(v.respiratory_rate || v.rr || 0);
        if (rr >= 22) {
            qsofaScore++;
            criteria.push({ criterion: 'Tachypnea', value: rr, threshold: '≥22', met: true });
        } else {
            criteria.push({ criterion: 'Tachypnea', value: rr || 'Not recorded', threshold: '≥22', met: false });
        }

        // Criterion 2: Altered mentation (using GCS if available, else skip)
        const gcs = Number(v.gcs || 15);
        if (gcs < 15) {
            qsofaScore++;
            criteria.push({ criterion: 'Altered Mentation', value: `GCS ${gcs}`, threshold: '<15', met: true });
        } else {
            criteria.push({ criterion: 'Altered Mentation', value: `GCS ${gcs}`, threshold: '<15', met: false });
        }

        // Criterion 3: Systolic BP ≤ 100
        const sbp = v.bp ? Number(v.bp.split('/')[0]) : 0;
        if (sbp > 0 && sbp <= 100) {
            qsofaScore++;
            criteria.push({ criterion: 'Hypotension', value: `SBP ${sbp}`, threshold: '≤100', met: true });
        } else {
            criteria.push({ criterion: 'Hypotension', value: sbp > 0 ? `SBP ${sbp}` : 'Not recorded', threshold: '≤100', met: false });
        }

        // Additional warning signs
        const temp = Number(v.temp || 0);
        const hr = Number(v.heart_rate || 0);
        const spo2 = Number(v.spo2 || 100);
        
        const additionalFlags = [];
        if (temp > 101.3) additionalFlags.push(`Fever (${temp}°F)`);
        if (hr > 110) additionalFlags.push(`Tachycardia (HR ${hr})`);
        if (spo2 < 92) additionalFlags.push(`Hypoxia (SpO2 ${spo2}%)`);

        const isSepsisAlert = qsofaScore >= 2;

        return {
            admissionId,
            qsofaScore,
            maxScore: 3,
            criteria,
            additionalFlags,
            isSepsisAlert,
            alertLevel: isSepsisAlert ? '🔴 SEPSIS ALERT' : qsofaScore === 1 ? '🟡 MONITOR CLOSELY' : '🟢 LOW RISK',
            actions: isSepsisAlert ? [
                '🚨 STAT: Blood cultures x2 (before antibiotics)',
                '🚨 STAT: Serum lactate level',
                '🚨 IV broad-spectrum antibiotics within 1 HOUR',
                '🚨 30ml/kg IV fluid bolus within 3 HOURS',
                '🚨 Escalate to ICU / Senior Physician immediately'
            ] : [],
            recordedAt: v.recorded_at,
            screenedAt: new Date().toISOString()
        };
    }
}

module.exports = ClinicalPathwayAI;
