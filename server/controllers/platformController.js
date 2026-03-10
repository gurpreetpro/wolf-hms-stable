const pool = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const ResponseHandler = require('../utils/responseHandler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Role Constant
const PLATFORM_ADMIN_ROLE = 'platform_admin';
const PLATFORM_HOSPITAL_ID = '00000000-0000-0000-0000-000000000000'; // Logical ID for Platform

// 1. Get All Tenants (Fleet View)
const getAllTenants = asyncHandler(async (req, res) => {
    const query = `
        SELECT h.id, h.name, h.code, h.subdomain, h.custom_domain, h.created_at, h.is_active, h.subscription_tier,
        (SELECT COUNT(*) FROM users u WHERE u.hospital_id = h.id) as user_count,
        (SELECT COUNT(*) FROM patients p WHERE p.hospital_id = h.id) as patient_count
        FROM hospitals h
        ORDER BY h.created_at DESC
    `;
    
    const result = await pool.query(query);
    ResponseHandler.success(res, result.rows);
});

// 2. Deploy New Tenant (Enhanced with Full Seeding)
const deployTenant = asyncHandler(async (req, res) => {
    const { name, code, subdomain, custom_domain, address, city, state, phone, email, admin_email, admin_password, admin_username, subscription_tier, settings } = req.body;

    if (!name || !subdomain || !admin_email || !admin_password) {
        return ResponseHandler.error(res, 'Missing required fields', 400);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if subdomain exists
        const check = await client.query('SELECT * FROM hospitals WHERE subdomain = $1', [subdomain]);
        if (check.rows.length > 0) {
            throw new Error('Subdomain already registered');
        }

        // 1. Create Hospital Record (matching schema)
        const hospitalRes = await client.query(
            `INSERT INTO hospitals (name, code, subdomain, custom_domain, address, city, state, phone, email, subscription_tier, is_active, settings, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, NOW()) RETURNING id`,
            [name, code, subdomain, custom_domain, address, city, state, phone, email, subscription_tier || 'essential', settings || {}]
        );
        const hospitalId = hospitalRes.rows[0].id;
        console.log(`[Platform] Created Hospital: ${name} (ID: ${hospitalId})`);

        // 2. Create Super Admin for this hospital
        const hashedPassword = await bcrypt.hash(admin_password, 10);
        const finalUsername = admin_username || 'admin';
        await client.query(
            `INSERT INTO users (username, email, password, role, hospital_id, is_active, created_at)
             VALUES ($1, $2, $3, 'admin', $4, true, NOW())`,
            [finalUsername, admin_email, hashedPassword, hospitalId]
        );
        console.log(`[Platform] Created Admin User for Hospital ${hospitalId}`);

        // 3. Seed Default Ward
        await client.query(
            `INSERT INTO wards (name, type, hospital_id, total_beds, occupied_beds, created_at) 
             VALUES ('General Ward', 'GENERAL', $1, 20, 0, NOW())`,
            [hospitalId]
        );

        // 4. Seed Default Roles/Permissions (if roles table exists)
        try {
            const defaultRoles = ['admin', 'doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist'];
            for (const role of defaultRoles) {
                await client.query(
                    `INSERT INTO roles (name, hospital_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
                    [role, hospitalId]
                );
            }
        } catch (roleErr) {
            console.log('[Platform] Roles table may not exist, skipping role seeding');
        }

        // 5. Seed Default Settings
        try {
            const defaultSettings = [
                { key: 'hospital_name', value: name },
                { key: 'currency', value: 'INR' },
                { key: 'timezone', value: 'Asia/Kolkata' },
                { key: 'appointment_slot_duration', value: '15' },
                { key: 'opd_queue_display_count', value: '5' }
            ];
            for (const setting of defaultSettings) {
                await client.query(
                    `INSERT INTO settings (key, value, hospital_id, created_at) 
                     VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
                    [setting.key, setting.value, hospitalId]
                );
            }
        } catch (settingsErr) {
            console.log('[Platform] Settings table may not exist, skipping settings seeding');
        }

        await client.query('COMMIT');
        
        ResponseHandler.success(res, { 
            hospital_id: hospitalId, 
            subdomain: subdomain,
            admin_email: admin_email,
            message: `Deployed ${name} successfully.` 
        }, 'Tenant Deployed', 201);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Deployment Failed:', e);
        ResponseHandler.error(res, e.message || 'Deployment Failed', 400);
    } finally {
        client.release();
    }
});

// 3. Teleport (Login As Tenant Admin)
const teleportToTenant = asyncHandler(async (req, res) => {
    const { target_hospital_id } = req.body;

    const adminRes = await pool.query(
        "SELECT u.*, h.subdomain, h.name as hospital_name FROM users u JOIN hospitals h ON u.hospital_id = h.id WHERE u.hospital_id = $1 AND u.role = 'admin' LIMIT 1",
        [target_hospital_id]
    );

    if (adminRes.rows.length === 0) {
        return ResponseHandler.error(res, 'No Admin user found for this tenant', 404);
    }

    const user = adminRes.rows[0];

    const token = jwt.sign(
        { 
            id: user.id, 
            role: user.role, 
            username: user.username,
            hospital_id: user.hospital_id,
            is_teleport: true // Audit flag
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    console.log(`[Platform Audit] Teleport to ${user.subdomain} (ID: ${target_hospital_id}) by platform admin`);

    ResponseHandler.success(res, { 
        token, 
        redirect_domain: user.subdomain,
        hospital_name: user.hospital_name || 'Unknown'
    }, 'Teleport Token Generated');
});

// 4. Platform Health (Aggregated Stats)
const getPlatformHealth = asyncHandler(async (req, res) => {
    const stats = {
        total_hospitals: 0,
        total_users: 0,
        total_patients: 0,
        active_requests_rpm: Math.floor(Math.random() * 1000) + 500, // Mock for now
        system_load_avg: require('os').loadavg(), // Real OS load
        db_connections: pool.totalCount || 0,
        server_uptime: process.uptime(),
        memory_usage: process.memoryUsage()
    };

    try {
        const countRes = await pool.query('SELECT count(*) as c FROM hospitals');
        stats.total_hospitals = parseInt(countRes.rows[0].c);

        const userRes = await pool.query('SELECT count(*) as c FROM users');
        stats.total_users = parseInt(userRes.rows[0].c);

        const patientRes = await pool.query('SELECT count(*) as c FROM patients');
        stats.total_patients = parseInt(patientRes.rows[0].c);
    } catch (e) {
        console.error('[Platform] Error fetching stats:', e.message);
    }

    ResponseHandler.success(res, stats);
});

// 5. Deactivate/Suspend Tenant
const updateTenantStatus = asyncHandler(async (req, res) => {
    const { hospital_id, is_active } = req.body; 
    
    await pool.query(
        'UPDATE hospitals SET is_active = $1, updated_at = NOW() WHERE id = $2',
        [is_active, hospital_id]
    );

    console.log(`[Platform Audit] Tenant ${hospital_id} active status changed to ${is_active}`);
    ResponseHandler.success(res, { is_active }, 'Tenant Status Updated');
});

// 6. Get Tenant Logs (Access logs for a specific hospital)
const getTenantLogs = asyncHandler(async (req, res) => {
    const { hospital_id } = req.params;
    const { limit = 100 } = req.query;

    const logsRes = await pool.query(
        `SELECT * FROM audit_logs 
         WHERE hospital_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [hospital_id, parseInt(limit)]
    );

    ResponseHandler.success(res, logsRes.rows, 'Tenant Logs Retrieved');
});

// 7. Get Tenant Details (Single tenant full info)
const getTenantDetails = asyncHandler(async (req, res) => {
    const { hospital_id } = req.params;

    const hospitalRes = await pool.query(
        `SELECT h.*, 
            (SELECT COUNT(*) FROM users WHERE hospital_id = h.id) as user_count,
            (SELECT COUNT(*) FROM patients WHERE hospital_id = h.id) as patient_count,
            (SELECT COUNT(*) FROM admissions WHERE hospital_id = h.id AND status = 'admitted') as active_admissions
         FROM hospitals h WHERE h.id = $1`,
        [hospital_id]
    );

    if (hospitalRes.rows.length === 0) {
        return ResponseHandler.error(res, 'Tenant not found', 404);
    }

    ResponseHandler.success(res, hospitalRes.rows[0], 'Tenant Details Retrieved');
});

// 8. Check Domain Availability
const checkDomainAvailability = asyncHandler(async (req, res) => {
    const { subdomain } = req.params;
    
    if (!subdomain) {
        return ResponseHandler.error(res, 'Subdomain is required', 400);
    }
    
    const check = await pool.query('SELECT id FROM hospitals WHERE subdomain = $1', [subdomain]);
    
    ResponseHandler.success(res, { available: check.rows.length === 0 });
});

// 9. Update Tenant Domain
const updateTenantDomain = asyncHandler(async (req, res) => {
    const { hospital_id } = req.params;
    const { subdomain, custom_domain } = req.body;
    
    // If changing subdomain, verify availability
    if (subdomain) {
        const check = await pool.query('SELECT id FROM hospitals WHERE subdomain = $1 AND id != $2', [subdomain, hospital_id]);
        if (check.rows.length > 0) {
            return ResponseHandler.error(res, 'Subdomain is already taken', 400);
        }
    }
    
    const updates = [];
    const values = [];
    let queryIndex = 1;
    
    if (subdomain !== undefined) {
        updates.push(`subdomain = $${queryIndex++}`);
        values.push(subdomain);
    }
    
    if (custom_domain !== undefined) {
        updates.push(`custom_domain = $${queryIndex++}`);
        values.push(custom_domain);
    }
    
    if (updates.length === 0) {
        return ResponseHandler.error(res, 'No domain updates provided', 400);
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(hospital_id);
    
    await pool.query(
        `UPDATE hospitals SET ${updates.join(', ')} WHERE id = $${queryIndex}`,
        values
    );
    
    ResponseHandler.success(res, { subdomain, custom_domain }, 'Domain configuration updated');
});

// 10. Usage Analytics across all tenants
const getUsageAnalytics = asyncHandler(async (req, res) => {
    const query = `
        SELECT 
            h.id, 
            h.name, 
            h.subdomain,
            h.created_at,
            (SELECT COUNT(*) FROM users u WHERE u.hospital_id = h.id) as user_count,
            (SELECT COUNT(*) FROM patients p WHERE p.hospital_id = h.id) as patient_count,
            (SELECT COUNT(*) FROM appointments a WHERE a.hospital_id = h.id AND a.created_at >= NOW() - INTERVAL '30 days') as appointments_30d,
            (SELECT COUNT(*) FROM invoices i WHERE i.hospital_id = h.id AND i.generated_at >= NOW() - INTERVAL '30 days') as invoices_30d
        FROM hospitals h
        WHERE h.is_active = true
        ORDER BY h.created_at DESC
    `;
    
    const result = await pool.query(query);
    ResponseHandler.success(res, result.rows, 'Usage analytics retrieved');
});

module.exports = {
    getAllTenants,
    deployTenant,
    teleportToTenant,
    getPlatformHealth,
    updateTenantStatus,
    getTenantLogs,
    getTenantDetails,
    checkDomainAvailability,
    updateTenantDomain,
    getUsageAnalytics
};
