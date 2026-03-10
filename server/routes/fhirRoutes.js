/**
 * FHIR Routes
 * FHIR R4 compliant API endpoints
 * Phase 3: FHIR/HL7 Interoperability (Gold Standard HMS)
 * 
 * Base URL: /fhir/
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const fhirService = require('../services/fhirService');

// FHIR metadata
router.get('/metadata', (req, res) => {
    res.json({
        resourceType: 'CapabilityStatement',
        status: 'active',
        date: new Date().toISOString(),
        kind: 'instance',
        software: {
            name: 'Wolf HMS FHIR Server',
            version: '1.0.0'
        },
        fhirVersion: '4.0.1',
        format: ['application/fhir+json', 'application/json'],
        rest: [{
            mode: 'server',
            resource: [
                { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }] },
                { type: 'Encounter', interaction: [{ code: 'read' }, { code: 'search-type' }] },
                { type: 'Observation', interaction: [{ code: 'read' }, { code: 'search-type' }] },
                { type: 'MedicationRequest', interaction: [{ code: 'read' }, { code: 'search-type' }] },
                { type: 'AllergyIntolerance', interaction: [{ code: 'read' }, { code: 'search-type' }] },
                { type: 'Condition', interaction: [{ code: 'read' }, { code: 'search-type' }] },
                { type: 'Procedure', interaction: [{ code: 'read' }, { code: 'search-type' }] }
            ]
        }]
    });
});

// Protected routes
router.use(protect);

/**
 * GET /fhir/Patient
 * Search patients
 */
router.get('/Patient', async (req, res) => {
    try {
        const { _id, identifier, name, phone, _count = 20 } = req.query;
        
        let query = `
            SELECT * FROM patients 
            WHERE hospital_id = $1
        `;
        const params = [req.hospital_id];
        let paramIndex = 2;
        
        if (_id) {
            query += ` AND id = $${paramIndex++}`;
            params.push(_id);
        }
        if (identifier) {
            query += ` AND (patient_id = $${paramIndex} OR aadhar_number = $${paramIndex} OR abha_id = $${paramIndex})`;
            params.push(identifier);
            paramIndex++;
        }
        if (name) {
            query += ` AND name ILIKE $${paramIndex++}`;
            params.push(`%${name}%`);
        }
        if (phone) {
            query += ` AND phone = $${paramIndex++}`;
            params.push(phone);
        }
        
        query += ` LIMIT $${paramIndex}`;
        params.push(parseInt(_count));
        
        const result = await pool.query(query, params);
        
        const bundle = {
            resourceType: 'Bundle',
            type: 'searchset',
            total: result.rows.length,
            entry: result.rows.map(patient => ({
                fullUrl: `Patient/${patient.id}`,
                resource: fhirService.toFhirPatient(patient)
            }))
        };
        
        res.type('application/fhir+json').json(bundle);
    } catch (error) {
        console.error('[FHIR] Patient search error:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }]
        });
    }
});

/**
 * GET /fhir/Patient/:id
 * Read single patient
 */
router.get('/Patient/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM patients WHERE id = $1 AND hospital_id = $2',
            [req.params.id, req.hospital_id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                resourceType: 'OperationOutcome',
                issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }]
            });
        }
        
        res.type('application/fhir+json').json(fhirService.toFhirPatient(result.rows[0]));
    } catch (error) {
        console.error('[FHIR] Patient read error:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }]
        });
    }
});

/**
 * GET /fhir/Encounter
 * Search encounters (admissions)
 */
router.get('/Encounter', async (req, res) => {
    try {
        const { _id, patient, status, _count = 20 } = req.query;
        
        let query = `
            SELECT a.*, p.name as patient_name, u.username as doctor_name,
                   w.name as ward_name, b.bed_number
            FROM admissions a
            LEFT JOIN patients p ON a.patient_id = p.id
            LEFT JOIN users u ON a.doctor_id = u.id
            LEFT JOIN wards w ON a.ward_id = w.id
            LEFT JOIN beds b ON a.bed_id = b.id
            WHERE a.hospital_id = $1
        `;
        const params = [req.hospital_id];
        let paramIndex = 2;
        
        if (_id) {
            query += ` AND a.id = $${paramIndex++}`;
            params.push(_id);
        }
        if (patient) {
            query += ` AND a.patient_id = $${paramIndex++}`;
            params.push(patient);
        }
        if (status) {
            query += ` AND a.status = $${paramIndex++}`;
            params.push(status);
        }
        
        query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex}`;
        params.push(parseInt(_count));
        
        const result = await pool.query(query, params);
        
        const bundle = {
            resourceType: 'Bundle',
            type: 'searchset',
            total: result.rows.length,
            entry: result.rows.map(admission => ({
                fullUrl: `Encounter/${admission.id}`,
                resource: fhirService.toFhirEncounter(admission)
            }))
        };
        
        res.type('application/fhir+json').json(bundle);
    } catch (error) {
        console.error('[FHIR] Encounter search error:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }]
        });
    }
});

/**
 * GET /fhir/Observation
 * Search observations (lab results, vitals)
 */
router.get('/Observation', async (req, res) => {
    try {
        const { _id, patient, category, code, _count = 50 } = req.query;
        
        let query = `
            SELECT lr.*, p.name as patient_name, lt.name as test_name,
                   lt.loinc_code, lt.unit
            FROM lab_results lr
            LEFT JOIN patients p ON lr.patient_id = p.id
            LEFT JOIN lab_tests lt ON lr.test_id = lt.id
            WHERE lr.hospital_id = $1
        `;
        const params = [req.hospital_id];
        let paramIndex = 2;
        
        if (_id) {
            query += ` AND lr.id = $${paramIndex++}`;
            params.push(_id);
        }
        if (patient) {
            query += ` AND lr.patient_id = $${paramIndex++}`;
            params.push(patient);
        }
        if (code) {
            query += ` AND lt.loinc_code = $${paramIndex++}`;
            params.push(code);
        }
        
        query += ` ORDER BY lr.created_at DESC LIMIT $${paramIndex}`;
        params.push(parseInt(_count));
        
        const result = await pool.query(query, params);
        
        const bundle = {
            resourceType: 'Bundle',
            type: 'searchset',
            total: result.rows.length,
            entry: result.rows.map(labResult => ({
                fullUrl: `Observation/${labResult.id}`,
                resource: fhirService.toFhirObservation(labResult)
            }))
        };
        
        res.type('application/fhir+json').json(bundle);
    } catch (error) {
        console.error('[FHIR] Observation search error:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }]
        });
    }
});

/**
 * GET /fhir/MedicationRequest
 * Search medication requests (prescriptions)
 */
router.get('/MedicationRequest', async (req, res) => {
    try {
        const { _id, patient, status, _count = 50 } = req.query;
        
        let query = `
            SELECT pd.*, p.name as patient_name, u.username as doctor_name,
                   m.name as medicine_name
            FROM prescription_details pd
            LEFT JOIN prescriptions pr ON pd.prescription_id = pr.id
            LEFT JOIN patients p ON pr.patient_id = p.id
            LEFT JOIN users u ON pr.doctor_id = u.id
            LEFT JOIN medicines m ON pd.medicine_id = m.id
            WHERE pr.hospital_id = $1
        `;
        const params = [req.hospital_id];
        let paramIndex = 2;
        
        if (_id) {
            query += ` AND pd.id = $${paramIndex++}`;
            params.push(_id);
        }
        if (patient) {
            query += ` AND pr.patient_id = $${paramIndex++}`;
            params.push(patient);
        }
        if (status) {
            query += ` AND pd.status = $${paramIndex++}`;
            params.push(status);
        }
        
        query += ` ORDER BY pd.created_at DESC LIMIT $${paramIndex}`;
        params.push(parseInt(_count));
        
        const result = await pool.query(query, params);
        
        const bundle = {
            resourceType: 'Bundle',
            type: 'searchset',
            total: result.rows.length,
            entry: result.rows.map(prescription => ({
                fullUrl: `MedicationRequest/${prescription.id}`,
                resource: fhirService.toFhirMedicationRequest(prescription)
            }))
        };
        
        res.type('application/fhir+json').json(bundle);
    } catch (error) {
        console.error('[FHIR] MedicationRequest search error:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }]
        });
    }
});

/**
 * GET /fhir/AllergyIntolerance
 * Search allergies (Phase 5 S-Tier)
 */
router.get('/AllergyIntolerance', async (req, res) => {
    try {
        const { patient, _count = 50 } = req.query;
        let query = `
            SELECT a.*, p.name as patient_name
            FROM patient_allergies a
            LEFT JOIN patients p ON a.patient_id = p.id
            WHERE p.hospital_id = $1
        `;
        const params = [req.hospital_id];
        let paramIndex = 2;
        if (patient) {
            query += ` AND a.patient_id = $${paramIndex++}`;
            params.push(patient);
        }
        query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex}`;
        params.push(parseInt(_count));
        const result = await pool.query(query, params);
        res.type('application/fhir+json').json({
            resourceType: 'Bundle', type: 'searchset', total: result.rows.length,
            entry: result.rows.map(a => ({ fullUrl: `AllergyIntolerance/${a.id}`, resource: fhirService.toFhirAllergyIntolerance(a) }))
        });
    } catch (error) {
        console.error('[FHIR] AllergyIntolerance search error:', error);
        res.status(500).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }] });
    }
});

/**
 * GET /fhir/Condition
 * Search diagnoses (Phase 5 S-Tier)
 */
router.get('/Condition', async (req, res) => {
    try {
        const { patient, _count = 50 } = req.query;
        let query = `
            SELECT d.*, p.name as patient_name, u.username as doctor_name
            FROM diagnosis d
            LEFT JOIN patients p ON d.patient_id = p.id
            LEFT JOIN users u ON d.doctor_id = u.id
            WHERE p.hospital_id = $1
        `;
        const params = [req.hospital_id];
        let paramIndex = 2;
        if (patient) {
            query += ` AND d.patient_id = $${paramIndex++}`;
            params.push(patient);
        }
        query += ` ORDER BY d.created_at DESC LIMIT $${paramIndex}`;
        params.push(parseInt(_count));
        const result = await pool.query(query, params);
        res.type('application/fhir+json').json({
            resourceType: 'Bundle', type: 'searchset', total: result.rows.length,
            entry: result.rows.map(d => ({ fullUrl: `Condition/${d.id}`, resource: fhirService.toFhirCondition(d) }))
        });
    } catch (error) {
        console.error('[FHIR] Condition search error:', error);
        res.status(500).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }] });
    }
});

/**
 * GET /fhir/Procedure
 * Search procedures (Phase 5 S-Tier)
 */
router.get('/Procedure', async (req, res) => {
    try {
        const { patient, _count = 50 } = req.query;
        let query = `
            SELECT ct.*, p.name as patient_name, u.username as surgeon_name
            FROM care_tasks ct
            LEFT JOIN patients p ON ct.patient_id = p.id
            LEFT JOIN users u ON ct.assigned_to = u.id
            WHERE p.hospital_id = $1 AND ct.task_type = 'procedure'
        `;
        const params = [req.hospital_id];
        let paramIndex = 2;
        if (patient) {
            query += ` AND ct.patient_id = $${paramIndex++}`;
            params.push(patient);
        }
        query += ` ORDER BY ct.created_at DESC LIMIT $${paramIndex}`;
        params.push(parseInt(_count));
        const result = await pool.query(query, params);
        res.type('application/fhir+json').json({
            resourceType: 'Bundle', type: 'searchset', total: result.rows.length,
            entry: result.rows.map(p => ({ fullUrl: `Procedure/${p.id}`, resource: fhirService.toFhirProcedure(p) }))
        });
    } catch (error) {
        console.error('[FHIR] Procedure search error:', error);
        res.status(500).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }] });
    }
});

module.exports = router;
