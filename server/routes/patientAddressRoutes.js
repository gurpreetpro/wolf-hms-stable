/**
 * Wolf Care - Patient Address Routes
 * 
 * Manages patient delivery addresses for medicine orders and home lab collection
 * 
 * Endpoints:
 * - GET /api/addresses - List saved addresses
 * - POST /api/addresses - Add new address
 * - PUT /api/addresses/:id - Update address
 * - DELETE /api/addresses/:id - Delete address
 * - PUT /api/addresses/:id/default - Set as default
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken } = require('../services/otpAuthService');

// Middleware to verify patient token
const authenticatePatient = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    req.user = decoded;
    next();
};

// ====================
// GET /api/addresses - List saved addresses
// ====================
router.get('/', authenticatePatient, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, label, address_line, landmark, city, state, pincode,
                   latitude, longitude, is_default, contact_name, contact_phone,
                   created_at
            FROM patient_addresses
            WHERE patient_id = $1
            ORDER BY is_default DESC, created_at DESC
        `, [req.user.id]);
        
        res.json({
            success: true,
            addresses: result.rows
        });
    } catch (err) {
        console.error('[ADDRESSES] List error:', err);
        res.status(500).json({ error: 'Failed to fetch addresses' });
    }
});

// ====================
// POST /api/addresses - Add new address
// ====================
router.post('/', authenticatePatient, async (req, res) => {
    const { 
        label, address_line, landmark, city, state, pincode,
        latitude, longitude, is_default, contact_name, contact_phone 
    } = req.body;
    
    if (!address_line || !city || !pincode) {
        return res.status(400).json({ 
            error: 'Address line, city, and pincode are required' 
        });
    }
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // If setting as default, unset other defaults first
        if (is_default) {
            await client.query(`
                UPDATE patient_addresses 
                SET is_default = false 
                WHERE patient_id = $1
            `, [req.user.id]);
        }
        
        const result = await client.query(`
            INSERT INTO patient_addresses (
                patient_id, hospital_id, label, address_line, landmark, 
                city, state, pincode, latitude, longitude, 
                is_default, contact_name, contact_phone
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            req.user.id,
            req.user.hospital_id || null,
            label || 'Home',
            address_line,
            landmark,
            city,
            state,
            pincode,
            latitude,
            longitude,
            is_default || false,
            contact_name,
            contact_phone
        ]);
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Address added successfully',
            address: result.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[ADDRESSES] Add error:', err);
        res.status(500).json({ error: 'Failed to add address' });
    } finally {
        client.release();
    }
});

// ====================
// PUT /api/addresses/:id - Update address
// ====================
router.put('/:id', authenticatePatient, async (req, res) => {
    const addressId = req.params.id;
    const { 
        label, address_line, landmark, city, state, pincode,
        latitude, longitude, contact_name, contact_phone 
    } = req.body;
    
    try {
        // Verify ownership
        const check = await pool.query(
            'SELECT id FROM patient_addresses WHERE id = $1 AND patient_id = $2',
            [addressId, req.user.id]
        );
        
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Address not found' });
        }
        
        const result = await pool.query(`
            UPDATE patient_addresses SET
                label = COALESCE($1, label),
                address_line = COALESCE($2, address_line),
                landmark = COALESCE($3, landmark),
                city = COALESCE($4, city),
                state = COALESCE($5, state),
                pincode = COALESCE($6, pincode),
                latitude = COALESCE($7, latitude),
                longitude = COALESCE($8, longitude),
                contact_name = COALESCE($9, contact_name),
                contact_phone = COALESCE($10, contact_phone),
                updated_at = NOW()
            WHERE id = $11 AND patient_id = $12
            RETURNING *
        `, [
            label, address_line, landmark, city, state, pincode,
            latitude, longitude, contact_name, contact_phone,
            addressId, req.user.id
        ]);
        
        res.json({
            success: true,
            message: 'Address updated',
            address: result.rows[0]
        });
    } catch (err) {
        console.error('[ADDRESSES] Update error:', err);
        res.status(500).json({ error: 'Failed to update address' });
    }
});

// ====================
// DELETE /api/addresses/:id - Delete address
// ====================
router.delete('/:id', authenticatePatient, async (req, res) => {
    const addressId = req.params.id;
    
    try {
        const result = await pool.query(`
            DELETE FROM patient_addresses 
            WHERE id = $1 AND patient_id = $2
            RETURNING id
        `, [addressId, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Address not found' });
        }
        
        res.json({
            success: true,
            message: 'Address deleted'
        });
    } catch (err) {
        console.error('[ADDRESSES] Delete error:', err);
        res.status(500).json({ error: 'Failed to delete address' });
    }
});

// ====================
// PUT /api/addresses/:id/default - Set as default
// ====================
router.put('/:id/default', authenticatePatient, async (req, res) => {
    const addressId = req.params.id;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Verify ownership
        const check = await client.query(
            'SELECT id FROM patient_addresses WHERE id = $1 AND patient_id = $2',
            [addressId, req.user.id]
        );
        
        if (check.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Address not found' });
        }
        
        // Unset all defaults
        await client.query(`
            UPDATE patient_addresses 
            SET is_default = false 
            WHERE patient_id = $1
        `, [req.user.id]);
        
        // Set this one as default
        await client.query(`
            UPDATE patient_addresses 
            SET is_default = true, updated_at = NOW()
            WHERE id = $1
        `, [addressId]);
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Default address updated'
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[ADDRESSES] Set default error:', err);
        res.status(500).json({ error: 'Failed to set default address' });
    } finally {
        client.release();
    }
});

module.exports = router;
