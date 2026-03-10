/**
 * Wolf HMS - Family Profiles Routes
 * 
 * API for managing family members linked to patient accounts
 * Supports Wolf Care patient app proxy booking and records access
 * 
 * Endpoints:
 * - POST /api/family/add              - Add family member
 * - GET  /api/family                  - Get patient's family members
 * - GET  /api/family/:id              - Get single family member
 * - PUT  /api/family/:id              - Update family member
 * - DELETE /api/family/:id            - Remove family member
 * - POST /api/family/:id/link         - Link to existing patient record
 * - GET  /api/family/:id/records      - Get family member's medical records
 * - GET  /api/family/relationships    - Get relationship types
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken } = require('../services/otpAuthService');

// ====================
// Middleware: Patient Auth
// ====================
const authenticatePatient = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        req.patient = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// ====================
// GET /relationships - Get relationship types
// ====================
router.get('/relationships', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT code, label, icon FROM relationship_types ORDER BY sort_order
        `);
        
        res.json({
            success: true,
            relationships: result.rows
        });
    } catch (err) {
        // Fallback if table doesn't exist
        res.json({
            success: true,
            relationships: [
                { code: 'spouse', label: 'Spouse', icon: '💑' },
                { code: 'child', label: 'Child', icon: '👶' },
                { code: 'parent', label: 'Parent', icon: '👴' },
                { code: 'sibling', label: 'Sibling', icon: '👫' },
                { code: 'grandparent', label: 'Grandparent', icon: '👵' },
                { code: 'grandchild', label: 'Grandchild', icon: '🧒' },
                { code: 'other', label: 'Other Relative', icon: '👤' }
            ]
        });
    }
});

// ====================
// POST /add - Add family member
// ====================
router.post('/add', authenticatePatient, async (req, res) => {
    try {
        const { 
            name, phone, relationship, date_of_birth, 
            gender, blood_group, allergies, medical_conditions, notes 
        } = req.body;
        const patientId = req.patient.id;
        const hospitalId = req.patient.hospital_id || 1;
        
        if (!name || !relationship) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name and relationship are required' 
            });
        }
        
        const result = await pool.query(`
            INSERT INTO family_members 
            (primary_patient_id, name, phone, relationship, date_of_birth, 
             gender, blood_group, allergies, medical_conditions, notes, hospital_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [patientId, name, phone, relationship, date_of_birth, 
            gender, blood_group, allergies || [], medical_conditions || [], notes, hospitalId]);
        
        // Log the action
        await pool.query(`
            INSERT INTO family_access_log 
            (family_member_id, primary_patient_id, action_type, details)
            VALUES ($1, $2, 'ADD', $3)
        `, [result.rows[0].id, patientId, `Added family member: ${name}`]);
        
        res.json({
            success: true,
            message: 'Family member added successfully',
            member: result.rows[0]
        });
        
    } catch (err) {
        console.error('[FAMILY] Add error:', err);
        res.status(500).json({ success: false, error: 'Failed to add family member' });
    }
});

// ====================
// GET / - Get patient's family members
// ====================
router.get('/', authenticatePatient, async (req, res) => {
    try {
        const patientId = req.patient.id;
        
        const result = await pool.query(`
            SELECT 
                fm.*,
                p.uhid as linked_uhid,
                p.name as linked_name
            FROM family_members fm
            LEFT JOIN patients p ON fm.linked_patient_id = p.id
            WHERE fm.primary_patient_id = $1 AND fm.is_active = true
            ORDER BY fm.created_at DESC
        `, [patientId]);
        
        res.json({
            success: true,
            members: result.rows,
            count: result.rows.length
        });
        
    } catch (err) {
        console.error('[FAMILY] Get error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch family members' });
    }
});

// ====================
// GET /:id - Get single family member
// ====================
router.get('/:id', authenticatePatient, async (req, res) => {
    try {
        const memberId = req.params.id;
        const patientId = req.patient.id;
        
        const result = await pool.query(`
            SELECT 
                fm.*,
                p.uhid as linked_uhid,
                p.name as linked_name
            FROM family_members fm
            LEFT JOIN patients p ON fm.linked_patient_id = p.id
            WHERE fm.id = $1 AND fm.primary_patient_id = $2 AND fm.is_active = true
        `, [memberId, patientId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Family member not found' });
        }
        
        res.json({
            success: true,
            member: result.rows[0]
        });
        
    } catch (err) {
        console.error('[FAMILY] Get single error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch family member' });
    }
});

// ====================
// PUT /:id - Update family member
// ====================
router.put('/:id', authenticatePatient, async (req, res) => {
    try {
        const memberId = req.params.id;
        const patientId = req.patient.id;
        const { 
            name, phone, relationship, date_of_birth, 
            gender, blood_group, allergies, medical_conditions, notes 
        } = req.body;
        
        // Verify ownership
        const existing = await pool.query(`
            SELECT id FROM family_members 
            WHERE id = $1 AND primary_patient_id = $2 AND is_active = true
        `, [memberId, patientId]);
        
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Family member not found' });
        }
        
        const result = await pool.query(`
            UPDATE family_members SET
                name = COALESCE($1, name),
                phone = COALESCE($2, phone),
                relationship = COALESCE($3, relationship),
                date_of_birth = COALESCE($4, date_of_birth),
                gender = COALESCE($5, gender),
                blood_group = COALESCE($6, blood_group),
                allergies = COALESCE($7, allergies),
                medical_conditions = COALESCE($8, medical_conditions),
                notes = COALESCE($9, notes)
            WHERE id = $10
            RETURNING *
        `, [name, phone, relationship, date_of_birth, gender, 
            blood_group, allergies, medical_conditions, notes, memberId]);
        
        res.json({
            success: true,
            message: 'Family member updated successfully',
            member: result.rows[0]
        });
        
    } catch (err) {
        console.error('[FAMILY] Update error:', err);
        res.status(500).json({ success: false, error: 'Failed to update family member' });
    }
});

// ====================
// DELETE /:id - Remove family member (soft delete)
// ====================
router.delete('/:id', authenticatePatient, async (req, res) => {
    try {
        const memberId = req.params.id;
        const patientId = req.patient.id;
        
        const result = await pool.query(`
            UPDATE family_members 
            SET is_active = false, updated_at = NOW()
            WHERE id = $1 AND primary_patient_id = $2 AND is_active = true
            RETURNING id, name
        `, [memberId, patientId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Family member not found' });
        }
        
        // Log the action
        await pool.query(`
            INSERT INTO family_access_log 
            (family_member_id, primary_patient_id, action_type, details)
            VALUES ($1, $2, 'REMOVE', $3)
        `, [memberId, patientId, `Removed family member: ${result.rows[0].name}`]);
        
        res.json({ success: true, message: 'Family member removed' });
        
    } catch (err) {
        console.error('[FAMILY] Delete error:', err);
        res.status(500).json({ success: false, error: 'Failed to remove family member' });
    }
});

// ====================
// POST /:id/link - Link to existing patient record
// ====================
router.post('/:id/link', authenticatePatient, async (req, res) => {
    try {
        const memberId = req.params.id;
        const patientId = req.patient.id;
        const { patient_id, uhid } = req.body;
        
        // Verify ownership
        const existing = await pool.query(`
            SELECT id FROM family_members 
            WHERE id = $1 AND primary_patient_id = $2 AND is_active = true
        `, [memberId, patientId]);
        
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Family member not found' });
        }
        
        // Find patient by ID or UHID
        let targetPatient;
        if (patient_id) {
            const p = await pool.query('SELECT id, name, uhid FROM patients WHERE id = $1', [patient_id]);
            targetPatient = p.rows[0];
        } else if (uhid) {
            const p = await pool.query('SELECT id, name, uhid FROM patients WHERE uhid = $1', [uhid]);
            targetPatient = p.rows[0];
        }
        
        if (!targetPatient) {
            return res.status(404).json({ success: false, error: 'Patient record not found' });
        }
        
        // Link the family member
        await pool.query(`
            UPDATE family_members SET linked_patient_id = $1 WHERE id = $2
        `, [targetPatient.id, memberId]);
        
        // Log the action
        await pool.query(`
            INSERT INTO family_access_log 
            (family_member_id, primary_patient_id, action_type, entity_type, entity_id, details)
            VALUES ($1, $2, 'LINK', 'patient', $3, $4)
        `, [memberId, patientId, targetPatient.id, `Linked to patient: ${targetPatient.name} (${targetPatient.uhid})`]);
        
        res.json({
            success: true,
            message: 'Family member linked to patient record',
            linked_patient: targetPatient
        });
        
    } catch (err) {
        console.error('[FAMILY] Link error:', err);
        res.status(500).json({ success: false, error: 'Failed to link patient record' });
    }
});

// ====================
// GET /:id/records - Get family member's medical records
// ====================
router.get('/:id/records', authenticatePatient, async (req, res) => {
    try {
        const memberId = req.params.id;
        const patientId = req.patient.id;
        
        // Verify ownership and get linked patient
        const member = await pool.query(`
            SELECT id, name, linked_patient_id FROM family_members 
            WHERE id = $1 AND primary_patient_id = $2 AND is_active = true
        `, [memberId, patientId]);
        
        if (member.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Family member not found' });
        }
        
        const linkedPatientId = member.rows[0].linked_patient_id;
        
        if (!linkedPatientId) {
            return res.json({
                success: true,
                member: member.rows[0],
                records: {
                    appointments: [],
                    lab_results: [],
                    prescriptions: []
                },
                message: 'No linked patient record'
            });
        }
        
        // Fetch records for linked patient
        const [appointments, labResults, prescriptions] = await Promise.all([
            pool.query(`
                SELECT id, doctor_id, date, time, status, type 
                FROM appointments 
                WHERE patient_id = $1 
                ORDER BY date DESC, time DESC 
                LIMIT 10
            `, [linkedPatientId]),
            
            pool.query(`
                SELECT lr.id, lr.test_name, lr.status, lr.created_at, lr.result_value
                FROM lab_requests lr
                WHERE lr.patient_id = $1
                ORDER BY lr.created_at DESC
                LIMIT 10
            `, [linkedPatientId]),
            
            pool.query(`
                SELECT id, items, created_at, doctor_id
                FROM prescriptions
                WHERE patient_id = $1
                ORDER BY created_at DESC
                LIMIT 10
            `, [linkedPatientId])
        ]);
        
        // Log the access
        await pool.query(`
            INSERT INTO family_access_log 
            (family_member_id, primary_patient_id, action_type, entity_type, entity_id)
            VALUES ($1, $2, 'VIEW_RECORDS', 'patient', $3)
        `, [memberId, patientId, linkedPatientId]);
        
        res.json({
            success: true,
            member: member.rows[0],
            records: {
                appointments: appointments.rows,
                lab_results: labResults.rows,
                prescriptions: prescriptions.rows
            }
        });
        
    } catch (err) {
        console.error('[FAMILY] Records error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch records' });
    }
});

// ====================
// Admin: GET /admin/all - Get all family members (for admin panel)
// ====================
router.get('/admin/all', async (req, res) => {
    try {
        const { patient_id, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                fm.*,
                pp.name as primary_patient_name,
                pp.phone as primary_patient_phone,
                lp.name as linked_patient_name,
                lp.uhid as linked_uhid
            FROM family_members fm
            LEFT JOIN patients pp ON fm.primary_patient_id = pp.id
            LEFT JOIN patients lp ON fm.linked_patient_id = lp.id
            WHERE fm.is_active = true
        `;
        const params = [];
        let paramIndex = 1;
        
        if (patient_id) {
            query += ` AND fm.primary_patient_id = $${paramIndex++}`;
            params.push(patient_id);
        }
        
        query += ` ORDER BY fm.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            members: result.rows,
            count: result.rows.length
        });
        
    } catch (err) {
        console.error('[FAMILY] Admin all error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch family members' });
    }
});

module.exports = router;
