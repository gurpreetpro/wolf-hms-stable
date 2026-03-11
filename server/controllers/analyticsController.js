const pool = require('../config/db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get Doctor Performance Stats - Multi-Tenant
const getDoctorStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const result = await pool.query(`
        SELECT u.username as doctor_name, COUNT(v.id) as total_patients, 0 as total_admissions
        FROM users u LEFT JOIN opd_visits v ON u.id = v.doctor_id
        WHERE u.role = 'doctor' AND (u.hospital_id = $1 OR u.hospital_id IS NULL)
        GROUP BY u.id, u.username ORDER BY total_patients DESC
    `, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Get Patient Footfall Stats - Multi-Tenant
const getPatientStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const result = await pool.query(`
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count FROM patients
        WHERE created_at >= NOW() - INTERVAL '7 days' AND (hospital_id = $1)
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') ORDER BY date
    `, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Get Activity Stats - Multi-Tenant
const getActivityStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    const result = await pool.query(`
        SELECT TO_CHAR(d.date, 'Dy') as name, COALESCE(COUNT(a.id), 0) as value
        FROM (SELECT generate_series(NOW() - INTERVAL '6 days', NOW(), '1 day')::date as date) d
        LEFT JOIN admissions a ON DATE(a.admission_date) = d.date AND (a.hospital_id = $1 OR a.hospital_id IS NULL)
        GROUP BY d.date ORDER BY d.date
    `, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

module.exports = { getDoctorStats, getPatientStats, getActivityStats };

// ============================================================
// Phase 5: S-Tier Backend Hardening — APIs for Phase 3-4 UIs
// ============================================================

/**
 * GET /api/analytics/readmission-risk
 * Readmission risk scoring (backs PredictiveAnalytics.jsx)
 */
const getReadmissionRisk = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`
        SELECT p.id, p.name, p.age, p.gender,
               COUNT(a.id) as total_admissions,
               MAX(a.discharge_date) as last_discharge,
               COALESCE(
                   CASE 
                       WHEN COUNT(a.id) > 3 THEN 'High'
                       WHEN COUNT(a.id) > 1 THEN 'Medium'
                       ELSE 'Low'
                   END, 'Low'
               ) as risk_level,
               ROUND(LEAST(95, GREATEST(5,
                   (COUNT(a.id) * 15) + 
                   (CASE WHEN p.age > 65 THEN 20 ELSE 0 END) +
                   (CASE WHEN p.age > 80 THEN 15 ELSE 0 END)
               ))) as risk_score
        FROM patients p
        LEFT JOIN admissions a ON p.id = a.patient_id AND a.hospital_id = $1
        WHERE p.hospital_id = $1
        GROUP BY p.id, p.name, p.age, p.gender
        HAVING COUNT(a.id) > 0
        ORDER BY COUNT(a.id) DESC LIMIT 50
    `, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

/**
 * GET /api/analytics/bed-forecast
 * 7-day bed demand forecasting (backs PredictiveAnalytics.jsx)
 */
const getBedDemandForecast = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const history = await pool.query(`
        SELECT DATE(a.admission_date) as date,
               COUNT(*) as admissions,
               COUNT(CASE WHEN a.status = 'discharged' THEN 1 END) as discharges
        FROM admissions a
        WHERE a.hospital_id = $1 AND a.admission_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(a.admission_date) ORDER BY date DESC
    `, [hospitalId]);
    const occupancy = await pool.query(`
        SELECT COUNT(*) FILTER (WHERE status = 'occupied') as occupied,
               COUNT(*) as total
        FROM beds WHERE hospital_id = $1
    `, [hospitalId]);
    ResponseHandler.success(res, { history: history.rows, occupancy: occupancy.rows[0] || { occupied: 0, total: 0 } });
});

/**
 * GET /api/analytics/disease-registries
 * Disease registry data (backs PopulationHealth.jsx)
 */
const getDiseaseRegistries = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`
        SELECT d.description as disease, d.icd_code,
               COUNT(DISTINCT d.patient_id) as patient_count,
               COUNT(DISTINCT CASE WHEN a.status = 'active' THEN d.patient_id END) as active_cases
        FROM diagnosis d
        LEFT JOIN admissions a ON d.admission_id = a.id
        WHERE d.hospital_id = $1
        GROUP BY d.description, d.icd_code
        ORDER BY patient_count DESC LIMIT 20
    `, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

/**
 * GET /api/analytics/nabh-readiness
 * NABH certification readiness (backs NABHCertification.jsx)
 */
const getNabhReadiness = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const [consents, discharges, alerts, handovers] = await Promise.all([
        pool.query(`SELECT COUNT(*) as count FROM patients WHERE hospital_id = $1 AND consent_signed = true`, [hospitalId]),
        pool.query(`SELECT COUNT(*) as count FROM admissions WHERE hospital_id = $1 AND discharge_summary_generated = true`, [hospitalId]),
        pool.query(`SELECT COUNT(*) as count FROM clinical_alerts WHERE hospital_id = $1`, [hospitalId]),
        pool.query(`SELECT COUNT(*) as count FROM shift_handover WHERE hospital_id = $1`, [hospitalId]),
    ]);
    ResponseHandler.success(res, {
        consent_management: Number.parseInt(consents.rows[0]?.count || 0),
        discharge_documentation: Number.parseInt(discharges.rows[0]?.count || 0),
        clinical_alerts_active: Number.parseInt(alerts.rows[0]?.count || 0) > 0,
        shift_handover_active: Number.parseInt(handovers.rows[0]?.count || 0) > 0
    });
});

/**
 * GET /api/analytics/hl7-messages
 * HL7 ADT message log (backs HL7ADTFeed.jsx)
 */
const getHL7Messages = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`
        (SELECT 'A01' as msg_type, 'Admit' as event, p.name as patient_name,
                p.patient_id as mrn, w.name as location, a.admission_date as event_time
         FROM admissions a
         JOIN patients p ON a.patient_id = p.id
         LEFT JOIN wards w ON a.ward_id = w.id
         WHERE a.hospital_id = $1
         ORDER BY a.admission_date DESC LIMIT 10)
        UNION ALL
        (SELECT 'A03' as msg_type, 'Discharge' as event, p.name as patient_name,
                p.patient_id as mrn, w.name as location, a.discharge_date as event_time
         FROM admissions a
         JOIN patients p ON a.patient_id = p.id
         LEFT JOIN wards w ON a.ward_id = w.id
         WHERE a.hospital_id = $1 AND a.discharge_date IS NOT NULL
         ORDER BY a.discharge_date DESC LIMIT 10)
        ORDER BY event_time DESC LIMIT 20
    `, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

/**
 * POST /api/analytics/drug-interactions/check
 * Real drug interaction checking against expanded DB (backs DrugInteractionAlert.jsx)
 */
const checkDrugInteractions = asyncHandler(async (req, res) => {
    const { medications } = req.body;
    if (!medications || !Array.isArray(medications) || medications.length < 2) {
        return ResponseHandler.success(res, { interactions: [], message: 'Need at least 2 medications to check' });
    }

    const drugInteractionsDB = require('../data/drugInteractions.json');
    const interactions = [];

    // Expand drug classes to individual drug names
    const expandDrug = (drugName) => {
        const classes = drugInteractionsDB.drugClasses || {};
        for (const [className, members] of Object.entries(classes)) {
            if (members.some(m => m.toLowerCase() === drugName.toLowerCase())) {
                return [drugName, className];
            }
        }
        return [drugName];
    };

    for (let i = 0; i < medications.length; i++) {
        for (let j = i + 1; j < medications.length; j++) {
            const drug1Names = expandDrug(medications[i]);
            const drug2Names = expandDrug(medications[j]);

            for (const d1 of drug1Names) {
                for (const d2 of drug2Names) {
                    const interaction = drugInteractionsDB.interactions.find(
                        int => (int.drug1.toLowerCase() === d1.toLowerCase() && int.drug2.toLowerCase() === d2.toLowerCase()) ||
                               (int.drug1.toLowerCase() === d2.toLowerCase() && int.drug2.toLowerCase() === d1.toLowerCase())
                    );
                    if (interaction) {
                        interactions.push({
                            drug1: medications[i],
                            drug2: medications[j],
                            ...interaction
                        });
                    }
                }
            }
        }
    }

    ResponseHandler.success(res, { interactions, total_checked: medications.length });
});

module.exports = {
    getDoctorStats, getPatientStats, getActivityStats,
    getReadmissionRisk, getBedDemandForecast, getDiseaseRegistries,
    getNabhReadiness, getHL7Messages, checkDrugInteractions
};
