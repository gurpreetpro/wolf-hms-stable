/**
 * Treatment Package Controller
 * CRUD operations for hospital treatment packages
 * Wolf HMS - All-inclusive bundle management
 */

const pool = require('../config/db');
const asyncHandler = require('express-async-handler');

// ============================================
// PACKAGE MANAGEMENT
// ============================================

/**
 * Get all treatment packages
 * Optional filters: category, specialty, isActive
 */
const getPackages = asyncHandler(async (req, res) => {
    const { category, specialty, active } = req.query;
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    
    let query = `
        SELECT 
            id, code, name, category, specialty, description,
            base_price, gst_percent, stay_days, room_type, icu_days,
            inclusions, exclusions, tpa_eligible, pmjay_code,
            is_active, valid_from, valid_until
        FROM treatment_packages
        WHERE hospital_id = $1
    `;
    const params = [hospitalId];
    let paramIndex = 2;
    
    if (category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(category);
    }
    
    if (specialty) {
        query += ` AND specialty ILIKE $${paramIndex++}`;
        params.push(`%${specialty}%`);
    }
    
    if (active !== undefined) {
        query += ` AND is_active = $${paramIndex++}`;
        params.push(active === 'true');
    }
    
    query += ' ORDER BY category, name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
});

/**
 * Get package by ID with all items
 */
const getPackageById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Get package details
    const packageResult = await pool.query(
        'SELECT * FROM treatment_packages WHERE id = $1',
        [id]
    );
    
    if (packageResult.rows.length === 0) {
        return res.status(404).json({ message: 'Package not found' });
    }
    
    // Get package items
    const itemsResult = await pool.query(
        `SELECT * FROM package_items WHERE package_id = $1 ORDER BY item_type, item_name`,
        [id]
    );
    
    const pkg = packageResult.rows[0];
    pkg.items = itemsResult.rows;
    
    res.json(pkg);
});

/**
 * Get packages by category
 */
const getPackagesByCategory = asyncHandler(async (req, res) => {
    const { category } = req.params;
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    
    const result = await pool.query(
        `SELECT id, code, name, base_price, stay_days, room_type, 
                inclusions, exclusions, description
         FROM treatment_packages 
         WHERE category = $1 AND hospital_id = $2 AND is_active = true
         ORDER BY base_price`,
        [category, hospitalId]
    );
    
    res.json(result.rows);
});

/**
 * Create new treatment package (Admin)
 */
const createPackage = asyncHandler(async (req, res) => {
    const {
        code, name, category, specialty, description,
        base_price, gst_percent, stay_days, room_type, icu_days,
        inclusions, exclusions, terms_conditions,
        tpa_eligible, pmjay_code, rohini_code,
        valid_from, valid_until, items
    } = req.body;
    
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const userId = req.user?.id;
    
    // Start transaction
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Insert package
        const pkgResult = await client.query(`
            INSERT INTO treatment_packages 
                (code, name, category, specialty, description,
                 base_price, gst_percent, stay_days, room_type, icu_days,
                 inclusions, exclusions, terms_conditions,
                 tpa_eligible, pmjay_code, rohini_code,
                 valid_from, valid_until, hospital_id, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING id
        `, [
            code, name, category, specialty, description,
            base_price, gst_percent || 0, stay_days || 0, room_type || 'Ward', icu_days || 0,
            JSON.stringify(inclusions || []), JSON.stringify(exclusions || []), terms_conditions,
            tpa_eligible !== false, pmjay_code, rohini_code,
            valid_from || new Date(), valid_until, hospitalId, userId
        ]);
        
        const packageId = pkgResult.rows[0].id;
        
        // Insert items if provided
        if (items && items.length > 0) {
            for (const item of items) {
                await client.query(`
                    INSERT INTO package_items 
                        (package_id, item_type, item_category, item_name, item_code,
                         quantity, unit, unit_price, included_in_package, extra_charge, notes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    packageId, item.type, item.category, item.name, item.code,
                    item.quantity || 1, item.unit, item.unit_price || 0,
                    item.included !== false, item.extra_charge || 0, item.notes
                ]);
            }
        }
        
        await client.query('COMMIT');
        
        res.status(201).json({ 
            id: packageId, 
            message: 'Package created successfully' 
        });
        
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
});

/**
 * Update treatment package (Admin)
 */
const updatePackage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        name, category, specialty, description,
        base_price, gst_percent, stay_days, room_type, icu_days,
        inclusions, exclusions, terms_conditions,
        tpa_eligible, pmjay_code, rohini_code,
        valid_from, valid_until, is_active
    } = req.body;
    
    const result = await pool.query(`
        UPDATE treatment_packages SET
            name = COALESCE($1, name),
            category = COALESCE($2, category),
            specialty = COALESCE($3, specialty),
            description = COALESCE($4, description),
            base_price = COALESCE($5, base_price),
            gst_percent = COALESCE($6, gst_percent),
            stay_days = COALESCE($7, stay_days),
            room_type = COALESCE($8, room_type),
            icu_days = COALESCE($9, icu_days),
            inclusions = COALESCE($10, inclusions),
            exclusions = COALESCE($11, exclusions),
            terms_conditions = COALESCE($12, terms_conditions),
            tpa_eligible = COALESCE($13, tpa_eligible),
            pmjay_code = COALESCE($14, pmjay_code),
            rohini_code = COALESCE($15, rohini_code),
            valid_from = COALESCE($16, valid_from),
            valid_until = COALESCE($17, valid_until),
            is_active = COALESCE($18, is_active),
            updated_at = NOW()
        WHERE id = $19
        RETURNING *
    `, [
        name, category, specialty, description,
        base_price, gst_percent, stay_days, room_type, icu_days,
        inclusions ? JSON.stringify(inclusions) : null,
        exclusions ? JSON.stringify(exclusions) : null,
        terms_conditions, tpa_eligible, pmjay_code, rohini_code,
        valid_from, valid_until, is_active, id
    ]);
    
    if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Package not found' });
    }
    
    res.json(result.rows[0]);
});

/**
 * Delete (deactivate) package
 */
const deletePackage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    await pool.query(
        'UPDATE treatment_packages SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
    );
    
    res.json({ message: 'Package deactivated' });
});

// ============================================
// PATIENT PACKAGE ASSIGNMENT
// ============================================

/**
 * Assign package to patient
 */
const assignPackage = asyncHandler(async (req, res) => {
    const { patient_id, admission_id, package_id, discount_percent, notes, advance_paid } = req.body;
    const assignedBy = req.user?.id;
    
    // Get package details
    const pkgResult = await pool.query(
        'SELECT base_price, stay_days FROM treatment_packages WHERE id = $1',
        [package_id]
    );
    
    if (pkgResult.rows.length === 0) {
        return res.status(404).json({ message: 'Package not found' });
    }
    
    const pkg = pkgResult.rows[0];
    const discount = discount_percent || 0;
    const discountAmount = (pkg.base_price * discount) / 100;
    const finalPrice = pkg.base_price - discountAmount;
    
    // Calculate expected end date
    const startDate = new Date();
    const expectedEndDate = new Date();
    expectedEndDate.setDate(expectedEndDate.getDate() + (pkg.stay_days || 0));
    
    const result = await pool.query(`
        INSERT INTO patient_packages 
            (patient_id, admission_id, package_id, 
             package_price, discount_percent, discount_amount, final_price,
             advance_paid, status, start_date, expected_end_date, notes, assigned_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10, $11, $12)
        RETURNING id
    `, [
        patient_id, admission_id, package_id,
        pkg.base_price, discount, discountAmount, finalPrice,
        advance_paid || 0, startDate, expectedEndDate, notes, assignedBy
    ]);
    
    res.status(201).json({
        id: result.rows[0].id,
        package_price: pkg.base_price,
        discount_amount: discountAmount,
        final_price: finalPrice,
        message: 'Package assigned successfully'
    });
});

/**
 * Get patient's active package
 */
const getPatientPackage = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    
    const result = await pool.query(`
        SELECT 
            pp.*,
            tp.code as package_code,
            tp.name as package_name,
            tp.category,
            tp.inclusions,
            tp.exclusions,
            tp.stay_days,
            tp.room_type
        FROM patient_packages pp
        JOIN treatment_packages tp ON pp.package_id = tp.id
        WHERE pp.patient_id = $1 AND pp.status = 'active'
        ORDER BY pp.created_at DESC
        LIMIT 1
    `, [patient_id]);
    
    if (result.rows.length === 0) {
        return res.status(404).json({ message: 'No active package for patient' });
    }
    
    // Get extras
    const extrasResult = await pool.query(
        `SELECT * FROM package_extras WHERE patient_package_id = $1 ORDER BY logged_at DESC`,
        [result.rows[0].id]
    );
    
    const pkg = result.rows[0];
    pkg.extras = extrasResult.rows;
    
    res.json(pkg);
});

/**
 * Log extra charge beyond package
 */
const logExtra = asyncHandler(async (req, res) => {
    const { patient_package_id, item_type, item_name, item_id, quantity, unit_price, reason } = req.body;
    const loggedBy = req.user?.id;
    
    const totalPrice = (quantity || 1) * (unit_price || 0);
    
    // Insert extra
    await pool.query(`
        INSERT INTO package_extras 
            (patient_package_id, item_type, item_name, item_id, quantity, unit_price, total_price, reason, logged_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [patient_package_id, item_type, item_name, item_id, quantity || 1, unit_price || 0, totalPrice, reason, loggedBy]);
    
    // Update patient package totals
    await pool.query(`
        UPDATE patient_packages SET
            extras_count = extras_count + 1,
            extras_amount = extras_amount + $1,
            updated_at = NOW()
        WHERE id = $2
    `, [totalPrice, patient_package_id]);
    
    res.status(201).json({ message: 'Extra logged', amount: totalPrice });
});

/**
 * Complete patient package
 */
const completePackage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { total_paid, notes } = req.body;
    
    // Get current totals
    const pkgResult = await pool.query(
        'SELECT final_price, extras_amount, advance_paid FROM patient_packages WHERE id = $1',
        [id]
    );
    
    if (pkgResult.rows.length === 0) {
        return res.status(404).json({ message: 'Patient package not found' });
    }
    
    const pkg = pkgResult.rows[0];
    const totalBilled = parseFloat(pkg.final_price) + parseFloat(pkg.extras_amount);
    const totalPaid = total_paid || parseFloat(pkg.advance_paid);
    const balanceDue = totalBilled - totalPaid;
    
    await pool.query(`
        UPDATE patient_packages SET
            status = 'completed',
            actual_end_date = CURRENT_DATE,
            total_billed = $1,
            total_paid = $2,
            balance_due = $3,
            notes = COALESCE($4, notes),
            updated_at = NOW()
        WHERE id = $5
    `, [totalBilled, totalPaid, balanceDue, notes, id]);
    
    res.json({
        message: 'Package completed',
        total_billed: totalBilled,
        total_paid: totalPaid,
        balance_due: balanceDue
    });
});

/**
 * Get package categories
 */
const getCategories = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    
    const result = await pool.query(`
        SELECT 
            category,
            COUNT(*) as package_count,
            MIN(base_price) as min_price,
            MAX(base_price) as max_price
        FROM treatment_packages
        WHERE hospital_id = $1 AND is_active = true
        GROUP BY category
        ORDER BY category
    `, [hospitalId]);
    
    res.json(result.rows);
});

/**
 * Compare packages (for patient selection)
 */
const comparePackages = asyncHandler(async (req, res) => {
    const { ids } = req.query; // comma-separated package IDs
    
    if (!ids) {
        return res.status(400).json({ message: 'Package IDs required' });
    }
    
    const idList = ids.split(',').map(id => parseInt(id));
    
    const result = await pool.query(`
        SELECT 
            id, code, name, category, base_price, 
            stay_days, room_type, icu_days,
            inclusions, exclusions
        FROM treatment_packages
        WHERE id = ANY($1)
        ORDER BY base_price
    `, [idList]);
    
    res.json(result.rows);
});

module.exports = {
    getPackages,
    getPackageById,
    getPackagesByCategory,
    createPackage,
    updatePackage,
    deletePackage,
    assignPackage,
    getPatientPackage,
    logExtra,
    completePackage,
    getCategories,
    comparePackages
};
