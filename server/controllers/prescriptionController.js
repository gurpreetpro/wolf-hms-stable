const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Mock Interaction Database
const DRUG_INTERACTIONS = {
    'Aspirin': ['Warfarin', 'Heparin'],
    'Warfarin': ['Aspirin', 'Ibuprofen'],
    'Sildenafil': ['Nitroglycerin'],
    'Nitroglycerin': ['Sildenafil']
};

const ALLERGIES_MOCK = {
    'Penicillin': ['Amoxicillin', 'Ampicillin', 'Augmentin']
};

// Check for Interactions & Allergies
const checkSafety = async (patientId, newDrug) => {
    const findings = [];

    // 1. Check Allergies
    const patientRes = await pool.query("SELECT history_json FROM patients WHERE id = $1", [patientId]);
    if (patientRes.rows.length > 0) {
        const history = patientRes.rows[0].history_json || {};
        const allergies = history.allergies || [];
        
        // Check exact match
        if (allergies.includes(newDrug)) {
            findings.push({ type: 'ALLERGY', severity: 'HIGH', message: `Patient is allergic to ${newDrug}` });
        }

        // Check family match (Mock)
        for (const allergy of allergies) {
            if (ALLERGIES_MOCK[allergy] && ALLERGIES_MOCK[allergy].includes(newDrug)) {
                findings.push({ type: 'ALLERGY_FAMILY', severity: 'MEDIUM', message: `Patient is allergic to ${allergy} (Related to ${newDrug})` });
            }
        }
    }

    // 2. Check Drug-Drug Interactions (against active prescriptions)
    // Mocking finding active meds
    const activeMedsRes = await pool.query(
        "SELECT drug_name FROM prescriptions WHERE patient_id = $1 AND status = 'Active'",
        [patientId]
    );
    
    for (const med of activeMedsRes.rows) {
        const existingDrug = med.drug_name;
        if (DRUG_INTERACTIONS[newDrug] && DRUG_INTERACTIONS[newDrug].includes(existingDrug)) {
            findings.push({ type: 'INTERACTION', severity: 'HIGH', message: `Interaction detected: ${newDrug} + ${existingDrug}` });
        }
    }

    return findings;
};

// Create Prescription
const createPrescription = asyncHandler(async (req, res) => {
    const { patient_id, admission_id, drug_name, dosage, frequency, duration, instructions, is_draft } = req.body;
    const doctor_id = req.user.id;
    const hospitalId = req.hospital_id;

    // Safety Check
    const risks = await checkSafety(patient_id, drug_name);
    
    // If strict checks are enabled, we might block. For now, we return warnings.
    // If client sends 'override_warnings: true', we proceed.
    if (risks.length > 0 && !req.body.override_warnings) {
        return ResponseHandler.success(res, { 
            status: 'WARNING', 
            risks: risks, 
            message: 'Safety risks detected. Please review or confirm override.' 
        });
    }

    const result = await pool.query(
        `INSERT INTO prescriptions (patient_id, admission_id, doctor_id, hospital_id, drug_name, dosage, frequency, duration, instructions, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [patient_id, admission_id, doctor_id, hospitalId, drug_name, dosage, frequency, duration, instructions, is_draft ? 'Draft' : 'Active']
    );

    ResponseHandler.success(res, { prescription: result.rows[0], risks_overridden: risks.length > 0 }, 201);
});

// Get Prescriptions
const getPrescriptions = asyncHandler(async (req, res) => {
    const { patient_id, admission_id } = req.query;
    const hospitalId = req.hospital_id;

    let query = `SELECT p.*, u.username as doctor_name 
                 FROM prescriptions p 
                 LEFT JOIN users u ON p.doctor_id = u.id 
                 WHERE p.hospital_id = $1`;
    const params = [hospitalId];

    if (patient_id) {
        params.push(patient_id);
        query += ` AND p.patient_id = $${params.length}`;
    }
    if (admission_id) {
        params.push(admission_id);
        query += ` AND p.admission_id = $${params.length}`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

module.exports = { createPrescription, getPrescriptions };
