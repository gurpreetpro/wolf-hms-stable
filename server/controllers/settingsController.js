const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { clearRazorpayCache } = require('./paymentController');

// Get All Settings - Multi-Tenant
exports.getSettings = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    console.log(`[Settings] getSettings for hospital_id: ${hospitalId}, user: ${req.user?.username}`);
    
    const result = await pool.query(
        'SELECT * FROM hospital_settings WHERE hospital_id = $1 ORDER BY hospital_id ASC NULLS FIRST', 
        [hospitalId]
    );
    
    console.log(`[Settings] Found ${result.rows.length} settings rows for hospital_id=${hospitalId}`);
    
    // If no data exists for this hospital, return empty object (frontend handles this gracefully)
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    
    ResponseHandler.success(res, settings);
});

// Update Settings - Multi-Tenant
exports.updateSettings = asyncHandler(async (req, res) => {
    const updates = req.body;
    const hospitalId = getHospitalId(req);
    console.log(`[Settings] updateSettings for hospital_id: ${hospitalId}, keys: ${Object.keys(updates).join(', ')}`);
    
    const keys = Object.keys(updates);
    let successCount = 0;
    let errorCount = 0;
    
    for (const key of keys) {
        try {
            const val = typeof updates[key] === 'object' ? JSON.stringify(updates[key]) : updates[key];
            
            // Upsert based on key AND hospital_id
            await pool.query(
                `INSERT INTO hospital_settings (key, value, hospital_id) VALUES ($1, $2, $3)
                    ON CONFLICT (key, hospital_id) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
                [key, val, hospitalId]
            );
            successCount++;
        } catch (err) {
            console.error(`[Settings] Error processing setting key '${key}' for hospital_id=${hospitalId}:`, err.message);
            errorCount++;
            // Continue with other keys
        }
    }
    
    console.log(`[Settings] Updated ${successCount} settings, ${errorCount} errors for hospital_id=${hospitalId}`);
    ResponseHandler.success(res, { message: 'Settings Updated Successfully', updated: successCount, errors: errorCount });
});

// Get Services - Multi-Tenant
exports.getServices = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query('SELECT * FROM services WHERE (hospital_id = $1) ORDER BY name', [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Update Service Price - Multi-Tenant
exports.updateServicePrice = asyncHandler(async (req, res) => {
    const { id, base_price } = req.body;
    const hospitalId = getHospitalId(req);
    await pool.query('UPDATE services SET base_price = $1 WHERE id = $2 AND (hospital_id = $3)', [base_price, id, hospitalId]);
    ResponseHandler.success(res, { message: 'Price Updated' });
});

// ===========================================
// PAYMENT SETTINGS - Multi-Tenant
// ===========================================

// Get Payment Settings (Razorpay, UPI, etc.)
exports.getPaymentSettings = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`
        SELECT provider, key_id, upi_id, merchant_name, is_enabled, is_production, config
        FROM payment_settings 
        WHERE hospital_id = $1
    `, [hospitalId]);
    
    // Transform to frontend-friendly format
    const settings = {
        razorpay_enabled: false,
        razorpay_key_id: '',
        razorpay_key_secret: '', // Never return secret to frontend
        razorpay_webhook_secret: '',
        upi_enabled: false,
        upi_id: '',
        upi_merchant_name: ''
    };
    
    result.rows.forEach(row => {
        if (row.provider === 'razorpay') {
            settings.razorpay_enabled = row.is_enabled;
            settings.razorpay_key_id = row.key_id || '';
            settings.razorpay_has_secret = !!row.key_id; // Indicate if secret exists
        } else if (row.provider === 'upi') {
            settings.upi_enabled = row.is_enabled;
            settings.upi_id = row.upi_id || '';
            settings.upi_merchant_name = row.merchant_name || '';
        }
    });
    
    ResponseHandler.success(res, settings);
});

// Update Payment Settings
exports.updatePaymentSettings = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const {
        razorpay_enabled, razorpay_key_id, razorpay_key_secret, razorpay_webhook_secret,
        upi_enabled, upi_id, upi_merchant_name
    } = req.body;
    
    // Upsert Razorpay settings
    if (razorpay_key_id !== undefined) {
        await pool.query(`
            INSERT INTO payment_settings (hospital_id, provider, key_id, key_secret, webhook_secret, is_enabled, updated_at)
            VALUES ($1, 'razorpay', $2, $3, $4, $5, NOW())
            ON CONFLICT (hospital_id, provider) 
            DO UPDATE SET 
                key_id = COALESCE(NULLIF($2, ''), payment_settings.key_id),
                key_secret = CASE WHEN $3 = '' THEN payment_settings.key_secret ELSE $3 END,
                webhook_secret = CASE WHEN $4 = '' THEN payment_settings.webhook_secret ELSE $4 END,
                is_enabled = $5,
                updated_at = NOW()
        `, [hospitalId, razorpay_key_id, razorpay_key_secret || '', razorpay_webhook_secret || '', razorpay_enabled || false]);
    }
    
    // Upsert UPI settings
    if (upi_id !== undefined) {
        await pool.query(`
            INSERT INTO payment_settings (hospital_id, provider, upi_id, merchant_name, is_enabled, updated_at)
            VALUES ($1, 'upi', $2, $3, $4, NOW())
            ON CONFLICT (hospital_id, provider) 
            DO UPDATE SET 
                upi_id = $2,
                merchant_name = $3,
                is_enabled = $4,
                updated_at = NOW()
        `, [hospitalId, upi_id, upi_merchant_name || '', upi_enabled || false]);
    }
    
    // Clear cached Razorpay instance so new credentials take effect immediately
    clearRazorpayCache(hospitalId);
    
    ResponseHandler.success(res, { message: 'Payment settings saved successfully' });
});

// Get SMS Settings
exports.getSmsSettings = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`
        SELECT provider, sender_id, dlt_entity_id, is_enabled, templates
        FROM sms_settings 
        WHERE hospital_id = $1
    `, [hospitalId]);
    
    if (result.rows.length === 0) {
        // Return defaults
        return ResponseHandler.success(res, {
            provider: 'fast2sms',
            api_key: '',
            sender_id: '',
            dlt_entity_id: '',
            is_enabled: false,
            templates: {
                payment_confirmation: 'Dear {name}, payment of Rs.{amount} for Invoice #{invoice} received. Thank you. -{hospital}',
                payment_reminder: 'Dear {name}, reminder for pending payment Rs.{amount} for Invoice #{invoice}. -{hospital}',
                receipt_sent: 'Dear {name}, receipt for Rs.{amount} ready. Download: {link} -{hospital}'
            }
        });
    }
    
    const row = result.rows[0];
    ResponseHandler.success(res, {
        provider: row.provider,
        api_key: '', // Never return API key to frontend
        api_key_set: true, // Just indicate if it's configured
        sender_id: row.sender_id || '',
        dlt_entity_id: row.dlt_entity_id || '',
        is_enabled: row.is_enabled,
        templates: row.templates || {}
    });
});

// Update SMS Settings
exports.updateSmsSettings = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { provider, api_key, sender_id, dlt_entity_id, is_enabled, templates } = req.body;
    
    await pool.query(`
        INSERT INTO sms_settings (hospital_id, provider, api_key, sender_id, dlt_entity_id, is_enabled, templates, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (hospital_id) 
        DO UPDATE SET 
            provider = $2,
            api_key = CASE WHEN $3 = '' THEN sms_settings.api_key ELSE $3 END,
            sender_id = $4,
            dlt_entity_id = $5,
            is_enabled = $6,
            templates = $7,
            updated_at = NOW()
    `, [hospitalId, provider || 'fast2sms', api_key || '', sender_id || '', dlt_entity_id || '', is_enabled || false, JSON.stringify(templates || {})]);
    
    ResponseHandler.success(res, { message: 'SMS settings saved successfully' });
});

// Get Confirmation Settings
exports.getConfirmationSettings = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(`
        SELECT auto_sms_on_payment, auto_print_receipt, auto_email_receipt, require_payment_reference
        FROM payment_confirmation_settings 
        WHERE hospital_id = $1
    `, [hospitalId]);
    
    if (result.rows.length === 0) {
        return ResponseHandler.success(res, {
            auto_sms_on_payment: true,
            auto_print_receipt: false,
            auto_email_receipt: false,
            require_payment_reference: true
        });
    }
    
    ResponseHandler.success(res, result.rows[0]);
});

// Update Confirmation Settings
exports.updateConfirmationSettings = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { auto_sms_on_payment, auto_print_receipt, auto_email_receipt, require_payment_reference } = req.body;
    
    await pool.query(`
        INSERT INTO payment_confirmation_settings (hospital_id, auto_sms_on_payment, auto_print_receipt, auto_email_receipt, require_payment_reference, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (hospital_id) 
        DO UPDATE SET 
            auto_sms_on_payment = $2,
            auto_print_receipt = $3,
            auto_email_receipt = $4,
            require_payment_reference = $5,
            updated_at = NOW()
    `, [hospitalId, auto_sms_on_payment, auto_print_receipt, auto_email_receipt, require_payment_reference]);
    
    ResponseHandler.success(res, { message: 'Confirmation settings saved successfully' });
});

// ===========================================
// ID SERIES SETTINGS - UHID & IPD Number Format
// ===========================================

// Get ID Settings (reads from hospitals.settings JSONB)
exports.getIdSettings = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(
        'SELECT code, settings FROM hospitals WHERE id = $1',
        [hospitalId]
    );
    
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Hospital not found', 404);
    }
    
    const hospital = result.rows[0];
    const settings = hospital.settings || {};
    
    // Return ID format settings with defaults
    ResponseHandler.success(res, {
        hospital_code: hospital.code?.toUpperCase() || 'HMS',
        uhid_format: {
            prefix: settings.uhid_format?.prefix || hospital.code?.toUpperCase() || 'HMS',
            separator: settings.uhid_format?.separator || '-',
            suffix: settings.uhid_format?.suffix || 'YEAR',
            length: parseInt(settings.uhid_format?.length) || 4,
            start_sequence: parseInt(settings.uhid_format?.start_sequence) || 1
        },
        ipd_format: {
            prefix: settings.ipd_format?.prefix || 'IP',
            length: parseInt(settings.ipd_format?.length) || 5,
            start_sequence: parseInt(settings.ipd_format?.start_sequence) || 1
        }
    });
});

// Update ID Settings (updates hospitals.settings JSONB)
exports.updateIdSettings = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { uhid_format, ipd_format } = req.body;
    
    // Build the settings update
    const settingsUpdate = {};
    
    if (uhid_format) {
        settingsUpdate.uhid_format = {
            prefix: uhid_format.prefix || 'HMS',
            separator: uhid_format.separator || '-',
            suffix: uhid_format.suffix || 'YEAR',
            length: parseInt(uhid_format.length) || 4,
            start_sequence: parseInt(uhid_format.start_sequence) || 1
        };
    }
    
    if (ipd_format) {
        settingsUpdate.ipd_format = {
            prefix: ipd_format.prefix || 'IP',
            length: parseInt(ipd_format.length) || 5,
            start_sequence: parseInt(ipd_format.start_sequence) || 1
        };
    }
    
    // Update hospitals.settings using JSONB merge
    await pool.query(`
        UPDATE hospitals 
        SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb,
            updated_at = NOW()
        WHERE id = $2
    `, [JSON.stringify(settingsUpdate), hospitalId]);
    
    console.log(`[ID Settings] Updated for hospital ${hospitalId}:`, settingsUpdate);
    
    ResponseHandler.success(res, { 
        message: 'ID series settings saved successfully',
        settings: settingsUpdate
    });
});
