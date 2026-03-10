/**
 * Wolf Path - Home Collection Routes
 * 
 * API for home sample collection logistics
 * "Uber for Blood/Lab Tests"
 * 
 * Features:
 * - Request home collection
 * - Find nearest phlebotomist (PostGIS)
 * - Track collection status
 * - Staff job management
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken } = require('../services/otpAuthService');

// Middleware to verify patient token
const authenticatePatient = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = decoded;
    next();
};

/**
 * @route   POST /api/home-collection/request
 * @desc    Request home sample collection
 * @access  Private (Patient)
 */
router.post('/request', authenticatePatient, async (req, res) => {
    const { latitude, longitude, address, test_ids, preferred_date, preferred_time, notes } = req.body;
    
    if (!latitude || !longitude || !address) {
        return res.status(400).json({ error: 'Location and address are required' });
    }
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const hospitalId = req.user.hospital_id || 1;
        
        // Find nearest available phlebotomist using PostGIS
        const nearestStaff = await client.query(`
            SELECT 
                u.id, u.username as name, u.phone,
                ST_Distance(
                    u.location::geography,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                ) / 1000 as distance_km
            FROM users u
            WHERE u.role = 'phlebotomist' 
              AND u.status = 'Active'
              AND u.hospital_id = $3
              AND u.location IS NOT NULL
            ORDER BY u.location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
            LIMIT 1
        `, [longitude, latitude, hospitalId]);
        
        // Fallback: If no staff with location, get any available phlebotomist
        let assignedStaff = nearestStaff.rows[0];
        
        if (!assignedStaff) {
            const fallback = await client.query(`
                SELECT id, username as name, phone
                FROM users 
                WHERE role = 'phlebotomist' AND status = 'Active' AND hospital_id = $1
                LIMIT 1
            `, [hospitalId]);
            assignedStaff = fallback.rows[0];
        }
        
        if (!assignedStaff) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                error: 'No phlebotomist available',
                message: 'Please try again later or contact the hospital'
            });
        }
        
        // Create collection request
        const result = await client.query(`
            INSERT INTO home_collection_requests (
                patient_id, hospital_id, assigned_to,
                latitude, longitude, address,
                test_ids, preferred_date, preferred_time,
                notes, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', NOW())
            RETURNING id, status, created_at
        `, [
            req.user.id, hospitalId, assignedStaff.id,
            latitude, longitude, address,
            JSON.stringify(test_ids || []), preferred_date, preferred_time,
            notes
        ]);
        
        await client.query('COMMIT');
        
        // Notify staff via Socket.IO if available
        if (global.io) {
            global.io.to(`user:${assignedStaff.id}`).emit('new_collection', {
                requestId: result.rows[0].id,
                patientId: req.user.id,
                address,
                tests: test_ids,
                preferredTime: preferred_time
            });
        }
        
        res.json({
            success: true,
            request: result.rows[0],
            assignedTo: {
                id: assignedStaff.id,
                name: assignedStaff.name,
                phone: assignedStaff.phone,
                distance: assignedStaff.distance_km ? 
                    `${assignedStaff.distance_km.toFixed(1)} km` : 'N/A'
            },
            message: 'Collection request created. Staff will contact you shortly.'
        });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[HOME-COLLECTION] Request error:', err);
        
        // Handle PostGIS not available gracefully
        if (err.code === '42883' || err.message.includes('ST_')) {
            return res.status(500).json({ 
                error: 'Spatial features not enabled',
                message: 'Please contact admin to enable PostGIS'
            });
        }
        
        res.status(500).json({ error: 'Failed to create request' });
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/home-collection/my-requests
 * @desc    Get patient's collection requests
 * @access  Private (Patient)
 */
router.get('/my-requests', authenticatePatient, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                hcr.id, hcr.address, hcr.preferred_date, hcr.preferred_time,
                hcr.status, hcr.notes, hcr.test_ids, hcr.created_at,
                u.username as staff_name, u.phone as staff_phone
            FROM home_collection_requests hcr
            LEFT JOIN users u ON hcr.assigned_to = u.id
            WHERE hcr.patient_id = $1
            ORDER BY hcr.created_at DESC
            LIMIT 20
        `, [req.user.id]);
        
        res.json({
            success: true,
            requests: result.rows
        });
    } catch (err) {
        console.error('[HOME-COLLECTION] Get requests error:', err);
        res.status(500).json({ error: 'Failed to get requests' });
    }
});

/**
 * @route   GET /api/home-collection/track/:requestId
 * @desc    Track collection request status
 * @access  Private (Patient)
 */
router.get('/track/:requestId', authenticatePatient, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                hcr.*, 
                u.username as staff_name, u.phone as staff_phone,
                ST_X(u.location::geometry) as staff_lng,
                ST_Y(u.location::geometry) as staff_lat
            FROM home_collection_requests hcr
            LEFT JOIN users u ON hcr.assigned_to = u.id
            WHERE hcr.id = $1 AND hcr.patient_id = $2
        `, [req.params.requestId, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        const request = result.rows[0];
        
        res.json({
            success: true,
            request: {
                id: request.id,
                status: request.status,
                address: request.address,
                preferredDate: request.preferred_date,
                preferredTime: request.preferred_time,
                staff: {
                    name: request.staff_name,
                    phone: request.staff_phone,
                    location: (request.staff_lat && request.staff_lng) ? {
                        latitude: request.staff_lat,
                        longitude: request.staff_lng
                    } : null
                }
            }
        });
    } catch (err) {
        console.error('[HOME-COLLECTION] Track error:', err);
        res.status(500).json({ error: 'Failed to track request' });
    }
});

// ==================== STAFF ENDPOINTS ====================

/**
 * Middleware to verify staff token
 */
const authenticateStaff = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    // Use regular JWT verify for staff (from authMiddleware)
    try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'wolf-jwt-secret');
        
        if (decoded.role !== 'phlebotomist' && decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Staff access required' });
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

/**
 * @route   GET /api/home-collection/staff/jobs
 * @desc    Get assigned collection jobs for staff
 * @access  Private (Phlebotomist)
 */
router.get('/staff/jobs', authenticateStaff, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                hcr.id, hcr.address, hcr.latitude, hcr.longitude,
                hcr.preferred_date, hcr.preferred_time, hcr.status,
                hcr.test_ids, hcr.notes, hcr.created_at,
                p.name as patient_name, p.phone as patient_phone
            FROM home_collection_requests hcr
            JOIN patients p ON hcr.patient_id = p.id
            WHERE hcr.assigned_to = $1
              AND hcr.status IN ('Pending', 'Accepted', 'En Route', 'Arrived')
            ORDER BY 
                CASE hcr.status 
                    WHEN 'En Route' THEN 1
                    WHEN 'Arrived' THEN 2
                    WHEN 'Accepted' THEN 3
                    ELSE 4
                END,
                hcr.preferred_date, hcr.preferred_time
        `, [req.user.id]);
        
        res.json({
            success: true,
            jobs: result.rows
        });
    } catch (err) {
        console.error('[HOME-COLLECTION] Get jobs error:', err);
        res.status(500).json({ error: 'Failed to get jobs' });
    }
});

/**
 * @route   PUT /api/home-collection/staff/update-status/:requestId
 * @desc    Update job status
 * @access  Private (Phlebotomist)
 */
router.put('/staff/update-status/:requestId', authenticateStaff, async (req, res) => {
    const { status, notes } = req.body;
    const validStatuses = ['Accepted', 'En Route', 'Arrived', 'Collected', 'Cancelled'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
        const result = await pool.query(`
            UPDATE home_collection_requests
            SET status = $1, 
                notes = COALESCE($2, notes),
                updated_at = NOW()
            WHERE id = $3 AND assigned_to = $4
            RETURNING id, status, patient_id
        `, [status, notes, req.params.requestId, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        // Notify patient via Socket.IO
        if (global.io) {
            global.io.to(`patient:${result.rows[0].patient_id}`).emit('collection_update', {
                requestId: result.rows[0].id,
                status
            });
        }
        
        res.json({
            success: true,
            message: `Status updated to ${status}`,
            request: result.rows[0]
        });
    } catch (err) {
        console.error('[HOME-COLLECTION] Update status error:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

/**
 * @route   PUT /api/home-collection/staff/update-location
 * @desc    Update staff location (for tracking)
 * @access  Private (Phlebotomist)
 */
router.put('/staff/update-location', authenticateStaff, async (req, res) => {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Location required' });
    }
    
    try {
        await pool.query(`
            UPDATE users 
            SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
                last_location_update = NOW()
            WHERE id = $3
        `, [longitude, latitude, req.user.id]);
        
        res.json({ success: true, message: 'Location updated' });
    } catch (err) {
        // PostGIS might not be enabled
        if (err.code === '42883' || err.message.includes('ST_')) {
            return res.status(500).json({ 
                error: 'Spatial features not enabled'
            });
        }
        
        console.error('[HOME-COLLECTION] Update location error:', err);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

module.exports = router;
