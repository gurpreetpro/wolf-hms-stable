/**
 * Clinical Co-Pilot Service
 * [PHASE 3] AI Supercharge - Gemini-Powered Clinical Intelligence
 * 
 * Uses Google Gemini 2.0 Flash to:
 * - Generate patient clinical summaries from lab/vitals history
 * - Identify clinical trends and risk factors
 * - Provide medication interaction warnings
 * - Suggest follow-up actions
 */

const { pool } = require('../db');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

class ClinicalCoPilot {
    
    // ========================================================================
    // PATIENT DATA AGGREGATION
    // ========================================================================
    
    /**
     * Get patient's recent lab results (last 6 months)
     */
    async getPatientLabHistory(patientId, hospitalId) {
        const result = await pool.query(`
            SELECT lr.id, lr.test_name, lr.requested_at, lr.status,
                   lres.result_json, lres.uploaded_at,
                   tt.name as test_type_name, tt.normal_range
            FROM lab_requests lr
            LEFT JOIN lab_results lres ON lres.request_id = lr.id
            LEFT JOIN lab_test_types tt ON lr.test_type_id = tt.id
            WHERE lr.patient_id = $1 
              AND lr.hospital_id = $2
              AND lr.requested_at >= NOW() - INTERVAL '6 months'
              AND lr.status = 'Completed'
            ORDER BY lr.requested_at DESC
            LIMIT 20
        `, [patientId, hospitalId]);
        return result.rows;
    }

    /**
     * Get patient's recent vitals (last 30 days)
     */
    async getPatientVitals(patientId, hospitalId) {
        const result = await pool.query(`
            SELECT vl.*, a.ward, a.bed_number
            FROM vitals_logs vl
            JOIN admissions a ON vl.admission_id = a.id
            WHERE a.patient_id = $1 
              AND a.hospital_id = $2
              AND vl.recorded_at >= NOW() - INTERVAL '30 days'
            ORDER BY vl.recorded_at DESC
            LIMIT 30
        `, [patientId, hospitalId]);
        return result.rows;
    }

    /**
     * Get patient's medications (active and recent)
     */
    async getPatientMedications(patientId, hospitalId) {
        const result = await pool.query(`
            SELECT ct.description as medication, ct.status, ct.scheduled_time, ct.completed_at
            FROM care_tasks ct
            JOIN admissions a ON ct.admission_id = a.id
            WHERE a.patient_id = $1 
              AND a.hospital_id = $2
              AND ct.type = 'Medication'
              AND ct.created_at >= NOW() - INTERVAL '30 days'
            ORDER BY ct.scheduled_time DESC
            LIMIT 50
        `, [patientId, hospitalId]);
        return result.rows;
    }

    /**
     * Get patient demographics and history
     */
    async getPatientProfile(patientId, hospitalId) {
        const result = await pool.query(`
            SELECT p.*, 
                   (SELECT COUNT(*) FROM admissions WHERE patient_id = p.id) as total_admissions,
                   (SELECT COUNT(*) FROM opd_visits WHERE patient_id = p.id) as total_opd_visits
            FROM patients p
            WHERE p.id = $1 AND p.hospital_id = $2
        `, [patientId, hospitalId]);
        return result.rows[0];
    }

    // ========================================================================
    // AI CLINICAL SUMMARY GENERATION
    // ========================================================================
    
    /**
     * Generate a comprehensive clinical summary for a patient
     * @param {string} patientId - Patient UUID
     * @param {number} hospitalId - Hospital ID
     * @returns {Object} Clinical summary with insights
     */
    async generatePatientSummary(patientId, hospitalId) {
        try {
            // 1. Gather all patient data
            const [profile, labs, vitals, medications] = await Promise.all([
                this.getPatientProfile(patientId, hospitalId),
                this.getPatientLabHistory(patientId, hospitalId),
                this.getPatientVitals(patientId, hospitalId),
                this.getPatientMedications(patientId, hospitalId)
            ]);

            if (!profile) {
                return { error: 'Patient not found', summary: null };
            }

            // 2. Calculate age
            const age = profile.dob 
                ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000))
                : 'Unknown';

            // 3. Prepare context for Gemini
            const context = {
                patient: {
                    name: 'REDACTED', // Privacy Mask
                    age: age,
                    gender: profile.gender,
                    history: profile.history_json || {}
                },
                recentLabs: labs.slice(0, 10).map(l => ({
                    test: l.test_name,
                    date: l.uploaded_at,
                    result: l.result_json,
                    normal_range: l.normal_range
                })),
                recentVitals: vitals.slice(0, 10).map(v => ({
                    date: v.recorded_at,
                    bp: v.bp,
                    temp: v.temp,
                    spo2: v.spo2,
                    heart_rate: v.heart_rate
                })),
                currentMedications: medications.filter(m => m.status === 'Completed').slice(0, 10).map(m => m.medication)
            };

            // 4. Call Gemini for clinical summary
            const prompt = `
Act as a Clinical Decision Support AI for a hospital in India.

PATIENT CONTEXT:
${JSON.stringify(context, null, 2)}

Generate a concise clinical summary with the following sections:

1. **One-Paragraph Summary**: A brief overview of the patient's current clinical status, highlighting key findings from recent labs and vitals.

2. **Key Clinical Findings** (bullet points):
   - Any abnormal lab values with clinical significance
   - Vital sign trends (improvement or deterioration)
   - Potential drug interactions or concerns

3. **Risk Assessment**:
   - List specific risks based on data (e.g., "Risk of dehydration based on elevated BUN/Creatinine")
   - Priority: High/Medium/Low

4. **Suggested Follow-ups**:
   - Specific tests or monitoring recommendations
   - Medication adjustments to consider

OUTPUT FORMAT: JSON object with keys: summary, findings (array), risks (array with priority), followups (array)

Be clinical and precise. If data is insufficient, state "Insufficient data for [X]" rather than guessing.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text()
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            // 5. Parse the response
            let aiSummary;
            try {
                aiSummary = JSON.parse(text);
            } catch (parseError) {
                // If JSON parsing fails, return as plain text
                aiSummary = {
                    summary: text,
                    findings: [],
                    risks: [],
                    followups: [],
                    parseError: true
                };
            }

            // 6. Return structured result
            return {
                patient: {
                    id: patientId,
                    name: profile.name,
                    age,
                    gender: profile.gender
                },
                dataPoints: {
                    labsCount: labs.length,
                    vitalsCount: vitals.length,
                    medicationsCount: medications.length
                },
                aiSummary,
                generatedAt: new Date().toISOString(),
                model: 'gemini-2.5-flash'
            };

        } catch (error) {
            console.error('[ClinicalCoPilot] Error generating summary:', error);
            return {
                error: error.message,
                summary: null,
                fallback: 'AI summary temporarily unavailable. Please review patient records manually.'
            };
        }
    }

    // ========================================================================
    // LAB INSIGHTS
    // ========================================================================
    
    /**
     * Generate insights for a specific lab result
     */
    async generateLabInsights(labRequestId, hospitalId) {
        try {
            const labResult = await pool.query(`
                SELECT lr.*, lres.result_json, tt.name, tt.normal_range, p.name as patient_name, p.gender, p.dob
                FROM lab_requests lr
                LEFT JOIN lab_results lres ON lres.request_id = lr.id
                LEFT JOIN lab_test_types tt ON lr.test_type_id = tt.id
                LEFT JOIN patients p ON lr.patient_id = p.id
                WHERE lr.id = $1 AND lr.hospital_id = $2
            `, [labRequestId, hospitalId]);

            if (labResult.rows.length === 0) {
                return { error: 'Lab request not found' };
            }

            const lab = labResult.rows[0];
            
            const prompt = `
Act as a laboratory medicine specialist.

LAB TEST: ${lab.name || lab.test_name}
RESULT: ${JSON.stringify(lab.result_json)}
NORMAL RANGE: ${lab.normal_range || 'Not specified'}
PATIENT: ${lab.patient_name}, ${lab.gender}, DOB: ${lab.dob}

Provide:
1. Brief interpretation (1-2 sentences)
2. Clinical significance (Normal/Abnormal Low/Abnormal High/Critical)
3. Possible causes if abnormal (top 3)
4. Recommended follow-up tests if any

OUTPUT: JSON with keys: interpretation, significance, causes (array), followupTests (array)
            `;

            const result = await model.generateContent(prompt);
            const text = result.response.text()
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            return JSON.parse(text);

        } catch (error) {
            console.error('[ClinicalCoPilot] Lab insights error:', error);
            return { error: error.message };
        }
    }

    // ========================================================================
    // VITALS TREND ANALYSIS
    // ========================================================================
    
    /**
     * Analyze vitals trends for an admission
     */
    async analyzeVitalsTrend(admissionId, hospitalId) {
        try {
            const vitals = await pool.query(`
                SELECT * FROM vitals_logs 
                WHERE admission_id = $1 AND hospital_id = $2
                ORDER BY recorded_at ASC
            `, [admissionId, hospitalId]);

            if (vitals.rows.length < 3) {
                return { message: 'Insufficient vitals data for trend analysis (minimum 3 readings required)' };
            }

            const prompt = `
Act as a clinical monitoring AI.

VITALS HISTORY (chronological order):
${JSON.stringify(vitals.rows.map(v => ({
    time: v.recorded_at,
    bp: v.bp,
    temp: v.temp,
    spo2: v.spo2,
    hr: v.heart_rate
})), null, 2)}

Analyze the trend and provide:
1. Overall trend: Improving / Stable / Deteriorating
2. Specific concerns (if any)
3. Early warning indicators
4. Recommended monitoring frequency

OUTPUT: JSON with keys: trend, concerns (array), warnings (array), recommendedFrequency
            `;

            const result = await model.generateContent(prompt);
            const text = result.response.text()
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            return JSON.parse(text);

        } catch (error) {
            console.error('[ClinicalCoPilot] Vitals trend error:', error);
            return { error: error.message };
        }
    }

    // ========================================================================
    // MEDICATION SAFETY CHECK
    // ========================================================================
    
    /**
     * Check for medication interactions
     */
    async checkMedicationInteractions(medications) {
        try {
            if (!medications || medications.length < 2) {
                return { message: 'At least 2 medications required for interaction check' };
            }

            const prompt = `
Act as a clinical pharmacist AI.

MEDICATIONS LIST:
${JSON.stringify(medications)}

Check for:
1. Drug-drug interactions (severity: Minor/Moderate/Severe)
2. Contraindications
3. Dosing concerns

OUTPUT: JSON with keys: interactions (array of {drugs, severity, description}), contraindications (array), warnings (array)

Be conservative - flag potential issues even if uncertain.
            `;

            const result = await model.generateContent(prompt);
            const text = result.response.text()
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            return JSON.parse(text);

        } catch (error) {
            console.error('[ClinicalCoPilot] Medication check error:', error);
            return { error: error.message };
        }
    }
}

// Export singleton
module.exports = new ClinicalCoPilot();
