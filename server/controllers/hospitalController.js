/**
 * Hospital Controller
 * CRUD operations for hospital/tenant management
 * Phase 0: Multi-Tenancy Foundation
 */

const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get all hospitals (super admin only)
const getAllHospitals = asyncHandler(async (req, res) => {
    const result = await pool.query(`
        SELECT 
            id, code, name, subdomain, custom_domain,
            logo_url, primary_color, secondary_color,
            city, state, phone, email,
            subscription_tier, is_active, created_at
        FROM hospitals
        ORDER BY created_at DESC
    `);
    ResponseHandler.success(res, result.rows);
});

// Get single hospital by ID or code
const getHospital = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isCode = isNaN(parseInt(id));
    
    const query = isCode
        ? 'SELECT * FROM hospitals WHERE code = $1'
        : 'SELECT * FROM hospitals WHERE id = $1';
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Hospital not found', 404);
    }
    
    ResponseHandler.success(res, result.rows[0]);
});

// Get hospital by subdomain (for tenant resolution)
const getHospitalBySubdomain = asyncHandler(async (req, res) => {
    const { subdomain } = req.params;
    
    const result = await pool.query(`
        SELECT 
            id, code, name, subdomain, custom_domain,
            logo_url, primary_color, secondary_color,
            settings, is_active
        FROM hospitals 
        WHERE subdomain = $1 OR custom_domain = $1
    `, [subdomain]);
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Hospital not found', 404);
    }
    
    if (!result.rows[0].is_active) {
        return ResponseHandler.error(res, 'Hospital is inactive', 403);
    }
    
    ResponseHandler.success(res, result.rows[0]);
});

// Create new hospital
const createHospital = asyncHandler(async (req, res) => {
    const {
        code, name, subdomain, custom_domain,
        logo_url, primary_color, secondary_color,
        address, city, state, country, phone, email,
        settings, subscription_tier
    } = req.body;
    
    // Validate required fields
    if (!code || !name) {
        return ResponseHandler.error(res, 'Code and name are required', 400);
    }
    
    // Check for duplicates
    const existing = await pool.query(
        'SELECT id FROM hospitals WHERE code = $1 OR subdomain = $2',
        [code, subdomain]
    );
    
    if (existing.rows.length > 0) {
        return ResponseHandler.error(res, 'Hospital code or subdomain already exists', 409);
    }
    
    const result = await pool.query(`
        INSERT INTO hospitals (
            code, name, subdomain, custom_domain,
            logo_url, primary_color, secondary_color,
            address, city, state, country, phone, email,
            settings, subscription_tier
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
    `, [
        code, name, subdomain || code.replace(/_/g, '-'), custom_domain,
        logo_url, primary_color || '#0d6efd', secondary_color || '#6c757d',
        address, city, state, country || 'India', phone, email,
        settings ? JSON.stringify(settings) : null, 
        subscription_tier || 'professional'
    ]);
    
    // Log the action
    await pool.query(`
        INSERT INTO hospital_audit_log (hospital_id, action, changed_by, new_values)
        VALUES ($1, 'CREATE', $2, $3)
    `, [result.rows[0].id, req.user?.id || null, JSON.stringify(result.rows[0])]);
    
    ResponseHandler.success(res, result.rows[0], 'Hospital created successfully', 201);
});

// Update hospital
const updateHospital = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        name, subdomain, custom_domain, tagline,
        logo_url, primary_color, secondary_color,
        address, city, state, country, phone, email, registration_no,
        settings, subscription_tier, is_active
    } = req.body;
    
    // Get old values for audit (optional - don't fail if not found)
    let oldResult;
    try {
        oldResult = await pool.query('SELECT * FROM hospitals WHERE id = $1', [id]);
        if (oldResult.rows.length === 0) {
            return ResponseHandler.error(res, 'Hospital not found', 404);
        }
    } catch (err) {
        console.error('[Hospital] Error fetching old values:', err.message);
        return ResponseHandler.error(res, 'Database error', 500);
    }
    
    try {
        // Build dynamic update query - only update provided fields
        let updateFields = [];
        let values = [id];
        let paramIndex = 2;
        
        const fieldsToUpdate = {
            name, subdomain, custom_domain, tagline,
            logo_url, primary_color, secondary_color,
            address, city, state, country, phone, email, registration_no,
            subscription_tier, is_active
        };
        
        for (const [field, value] of Object.entries(fieldsToUpdate)) {
            if (value !== undefined && value !== null) {
                updateFields.push(`${field} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }
        
        // Handle settings separately (needs JSON stringify)
        if (settings !== undefined) {
            updateFields.push(`settings = $${paramIndex}`);
            values.push(JSON.stringify(settings));
            paramIndex++;
        }
        
        // If no fields to update, just return current data
        if (updateFields.length === 0) {
            return ResponseHandler.success(res, oldResult.rows[0], 'No changes to save');
        }
        
        const result = await pool.query(`
            UPDATE hospitals SET
                ${updateFields.join(', ')},
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, values);
        
        // Try to log the action (don't fail if audit log doesn't work)
        try {
            await pool.query(`
                INSERT INTO hospital_audit_log (hospital_id, action, changed_by, old_values, new_values)
                VALUES ($1, 'UPDATE', $2, $3, $4)
            `, [id, req.user?.id || null, JSON.stringify(oldResult.rows[0]), JSON.stringify(result.rows[0])]);
        } catch (auditErr) {
            console.warn('[Hospital] Audit log insert failed (non-critical):', auditErr.message);
        }
        
        ResponseHandler.success(res, result.rows[0], 'Hospital updated successfully');
    } catch (err) {
        console.error('[Hospital] Update error:', err.message);
        ResponseHandler.error(res, `Failed to update hospital: ${err.message}`, 500);
    }
});

// Get hospital branding (public endpoint for apps)
const getHospitalBranding = asyncHandler(async (req, res) => {
    const { subdomain } = req.params;
    
    const result = await pool.query(`
        SELECT 
            h.id, h.code, h.name, h.subdomain, h.logo_url, 
            h.primary_color, h.secondary_color,
            h.settings
        FROM hospitals h
        WHERE (h.subdomain = $1 OR h.custom_domain = $1 OR h.code = $1) AND h.is_active = true
    `, [subdomain]);
    
    if (result.rows.length === 0) {
        // Return default branding with default fees
        return ResponseHandler.success(res, {
            name: 'Wolf HMS',
            subdomain: 'app',
            logo_url: null,
            primary_color: '#0d6efd',
            secondary_color: '#6c757d',
            settings: {
                in_person_fee: 200,
                video_call_fee: 300
            }
        });
    }
    
    const hospital = result.rows[0];
    
    // Fetch consultation fees from hospital_settings
    let inPersonFee = 200; // Default
    let videoCallFee = 300; // Default
    
    try {
        const feeResult = await pool.query(`
            SELECT key, value FROM hospital_settings 
            WHERE hospital_id = $1 AND key IN ('default_in_person_fee', 'default_video_call_fee')
        `, [hospital.id]);
        
        feeResult.rows.forEach(row => {
            if (row.key === 'default_in_person_fee') {
                inPersonFee = parseFloat(row.value) || 200;
            } else if (row.key === 'default_video_call_fee') {
                videoCallFee = parseFloat(row.value) || 300;
            }
        });
    } catch (feeErr) {
        console.warn('[Hospital] Failed to fetch fees, using defaults:', feeErr.message);
    }
    
    // Merge fees into settings
    const settings = hospital.settings || {};
    settings.in_person_fee = inPersonFee;
    settings.video_call_fee = videoCallFee;
    hospital.settings = settings;
    
    ResponseHandler.success(res, hospital);
});

// Get hospital stats (for admin dashboard)
const getHospitalStats = asyncHandler(async (req, res) => {
    const result = await pool.query(`
        SELECT 
            COUNT(*) as total_hospitals,
            COUNT(*) FILTER (WHERE is_active = true) as active_hospitals,
            COUNT(*) FILTER (WHERE subscription_tier = 'enterprise') as enterprise,
            COUNT(*) FILTER (WHERE subscription_tier = 'professional') as professional,
            COUNT(*) FILTER (WHERE subscription_tier = 'essential') as essential
        FROM hospitals
    `);
    
    ResponseHandler.success(res, result.rows[0]);
});

// Get current hospital context (for authenticated requests)
const getCurrentHospital = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;
    
    const result = await pool.query(`
        SELECT 
            id, code, name, subdomain, custom_domain,
            logo_url, primary_color, secondary_color,
            settings, is_active
        FROM hospitals 
        WHERE id = $1
    `, [hospitalId]);
    
    if (result.rows.length === 0) {
        // Return default if not found
        return ResponseHandler.success(res, {
            id: 1,
            code: 'default',
            name: 'Wolf HMS',
            primary_color: '#0d6efd',
            secondary_color: '#6c757d',
            settings: {}
        });
    }
    
    ResponseHandler.success(res, result.rows[0]);
});

module.exports = {
    getAllHospitals,
    getHospital,
    getHospitalBySubdomain,
    createHospital,
    updateHospital,
    getHospitalBranding,
    getHospitalStats,
    getCurrentHospital
};
