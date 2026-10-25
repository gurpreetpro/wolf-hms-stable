const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const { addToInvoice } = require('../services/billingService');
const { createChargeHelper } = require('./chargesController'); // Centralized Billing
const SmartInventory = require('../services/SmartInventory');
const ApprovalWorkflow = require('../services/procurement/ApprovalWorkflow'); // [ENTERPRISE]
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get Inventory - Multi-Tenant
const getInventory = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query('SELECT * FROM inventory_items WHERE (hospital_id = $1) ORDER BY name', [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Search Inventory - Multi-Tenant
const searchInventory = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { query } = req.query;
    if (!query) return ResponseHandler.success(res, []);
    
    const result = await pool.query(`
        SELECT * FROM inventory_items 
        WHERE (hospital_id = $1) 
        AND (name ILIKE $2 OR generic_name ILIKE $2) 
        ORDER BY name 
        LIMIT 20
    `, [hospitalId, `%${query}%`]);
    ResponseHandler.success(res, result.rows);
});

// Dispense Medication - Multi-Tenant
const dispense = asyncHandler(async (req, res) => {
    const { patient_id, item, quantity, force } = req.body;
    const info = req.user;
    const hospitalId = getHospitalId(req);

    const itemRes = await pool.query('SELECT * FROM inventory_items WHERE name = $1 AND (hospital_id = $2)', [item, hospitalId]); 
    if (itemRes.rows.length === 0) return ResponseHandler.error(res, 'Item not found', 404);
    const inventoryItem = itemRes.rows[0];

    if (patient_id && !force) { 
        const patientRes = await pool.query('SELECT history_json FROM patients WHERE id = $1 AND (hospital_id = $2)', [patient_id, hospitalId]); 
        if (patientRes.rows.length > 0) { 
            const history = patientRes.rows[0].history_json || {}; 
            const allergies = history.allergies || []; 
            const risk = allergies.find(a => inventoryItem.category.toLowerCase().includes(a.toLowerCase()) || inventoryItem.name.toLowerCase().includes(a.toLowerCase())); 
            if (risk) return ResponseHandler.error(res, `CLINICAL ALERT: Patient is allergic to ${risk}.`, 409, { type: 'ALLERGY_WARNING', risk });
        } 
    }
    const updateRes = await pool.query('UPDATE inventory_items SET stock_quantity = stock_quantity - $1 WHERE name = $2 AND stock_quantity >= $1 AND (hospital_id = $3) RETURNING stock_quantity, price_per_unit, id', [quantity, item, hospitalId]); 
    if (updateRes.rows.length === 0) return ResponseHandler.error(res, 'Insufficient stock', 400); 
    const { stock_quantity, price_per_unit, id: itemId } = updateRes.rows[0];

    // Create pending charge for billing queue (Gold Standard Pattern)
    if (patient_id) {
        try {
            await createChargeHelper({
                hospital_id: hospitalId,
                patient_id,
                admission_id: null,
                charge_type: 'pharmacy',
                description: `Pharmacy: ${item}`,
                quantity,
                unit_price: parseFloat(price_per_unit),
                source_table: 'inventory_items',
                source_id: itemId,
                created_by: info.id
            });
            console.log(`📋 [Pharmacy] Charge created for ${item} x${quantity} - ₹${quantity * parseFloat(price_per_unit)}`);
        } catch (chargeError) {
            console.warn('[Pharmacy] Failed to create charge (non-blocking):', chargeError.message);
            // Fallback to old invoice method
            await addToInvoice(patient_id, null, `Pharmacy: ${item}`, quantity, parseFloat(price_per_unit), info.id, hospitalId);
        }
    }
    ResponseHandler.success(res, { remaining_stock: stock_quantity }, 'Dispensed successfully');
});

// Process Prescription - Multi-Tenant
const processPrescription = asyncHandler(async (req, res) => {
    const { task_id, force } = req.body;
    const pharmacist_id = req.user.id;
    const hospitalId = getHospitalId(req);

    const taskRes = await pool.query('SELECT * FROM care_tasks WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [task_id, hospitalId]); 
    if (taskRes.rows.length === 0) return ResponseHandler.error(res, 'Prescription task not found', 404); 
    const task = taskRes.rows[0]; 

    if (task.status === 'Completed' || task.pharmacy_status === 'Dispensed') {
        return ResponseHandler.error(res, 'Prescription has already been dispensed', 400);
    }
    const itemName = task.description.split(' - ')[0].trim();

    if (!force) { 
        const patient_id = task.patient_id; 
        const itemRes = await pool.query('SELECT * FROM inventory_items WHERE name = $1 AND (hospital_id = $2)', [itemName, hospitalId]); 
        if (itemRes.rows.length > 0) { 
            const inventoryItem = itemRes.rows[0]; 
            const patientRes = await pool.query('SELECT history_json FROM patients WHERE id = $1', [patient_id]); 
            if (patientRes.rows.length > 0) { 
                const history = patientRes.rows[0].history_json || {}; 
                const allergies = history.allergies || []; 
                const risk = allergies.find(a => inventoryItem.category.toLowerCase().includes(a.toLowerCase()) || inventoryItem.name.toLowerCase().includes(a.toLowerCase())); 
                if (risk) return ResponseHandler.error(res, `CLINICAL ALERT: Patient is allergic to ${risk}.`, 409, { type: 'ALLERGY_WARNING', risk }); 
            } 
        } 
    }

    if (!force) { 
        const patient_id = task.patient_id; 
        const recentMedsRes = await pool.query(`SELECT DISTINCT split_part(description, ' - ', 1) as drug_name FROM care_tasks WHERE patient_id = $1 AND type = 'Medication' AND status = 'Completed' AND completed_at > NOW() - INTERVAL '7 days' AND (hospital_id = $2)`, [patient_id, hospitalId]); 
        const recentDrugs = recentMedsRes.rows.map(r => r.drug_name.trim().toLowerCase()); 
        if (recentDrugs.length > 0) { 
            const currentDrug = itemName.toLowerCase(); 
            const interactionCheck = await pool.query(`SELECT * FROM drug_interactions WHERE (LOWER(drug1_name) = $1 AND LOWER(drug2_name) = ANY($2)) OR (LOWER(drug2_name) = $1 AND LOWER(drug1_name) = ANY($2)) ORDER BY CASE severity WHEN 'major' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END LIMIT 1`, [currentDrug, recentDrugs]); 
            if (interactionCheck.rows.length > 0) { 
                const interaction = interactionCheck.rows[0]; 
                const interactingDrug = interaction.drug1_name.toLowerCase() === currentDrug ? interaction.drug2_name : interaction.drug1_name; 
                return ResponseHandler.error(res, `DRUG INTERACTION ALERT: ${itemName} may interact with ${interactingDrug} (recently dispensed).`, 409, { type: 'DRUG_INTERACTION', severity: interaction.severity.toUpperCase(), effect: interaction.effect, recommendation: interaction.recommendation, drug1: itemName, drug2: interactingDrug }); 
            } 
        } 
    }

    let qtyToDispense = 1;
    try {
        const desc = task.description || '';
        let dailyDoses = 1;
        if (/TDS|TID/i.test(desc)) dailyDoses = 3;
        else if (/BD|BID/i.test(desc)) dailyDoses = 2;
        else if (/QID/i.test(desc)) dailyDoses = 4;
        else if (/OD/i.test(desc)) dailyDoses = 1;

        const durationMatch = desc.match(/(\d+)\s*(?:days|day|d)\b/i);
        let days = 1;
        if (durationMatch) {
            days = parseInt(durationMatch[1], 10) || 1;
        } else {
            const rxRes = await pool.query(
                `SELECT medications FROM prescriptions WHERE patient_id = $1 ORDER BY id DESC LIMIT 1`,
                [task.patient_id]
            );
            if (rxRes.rows.length > 0 && rxRes.rows[0].medications) {
                const meds = typeof rxRes.rows[0].medications === 'string'
                    ? JSON.parse(rxRes.rows[0].medications)
                    : rxRes.rows[0].medications;
                if (Array.isArray(meds)) {
                    const matchMed = meds.find(m => m.name && m.name.toLowerCase() === itemName.toLowerCase());
                    if (matchMed && matchMed.duration) {
                        days = parseInt(matchMed.duration, 10) || 1;
                    }
                    if (matchMed && matchMed.freq) {
                        if (/TDS|TID/i.test(matchMed.freq)) dailyDoses = 3;
                        else if (/BD|BID/i.test(matchMed.freq)) dailyDoses = 2;
                        else if (/QID/i.test(matchMed.freq)) dailyDoses = 4;
                        else if (/OD/i.test(matchMed.freq)) dailyDoses = 1;
                    }
                }
            }
        }
        qtyToDispense = Math.max(1, dailyDoses * days);
    } catch (parseErr) {
        console.warn('[Pharmacy] Could not calculate prescribed quantity, defaulting to 1:', parseErr.message);
        qtyToDispense = 1;
    } 
    // FEFO (First-Expired, First-Out) batch selection
    let updateRes;
    let selectedBatch = null;
    const batchRes = await pool.query(
        `SELECT id, batch_number, expiry_date, stock_quantity, price_per_unit 
         FROM inventory_items 
         WHERE LOWER(name) = LOWER($1) AND stock_quantity >= $2 AND (hospital_id = $3 OR hospital_id IS NULL)
         ORDER BY expiry_date ASC NULLS LAST, id ASC LIMIT 1`,
        [itemName, qtyToDispense, hospitalId]
    );

    if (batchRes.rows.length > 0) {
        selectedBatch = batchRes.rows[0];
        updateRes = await pool.query(
            'UPDATE inventory_items SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1 RETURNING stock_quantity, price_per_unit, id, batch_number',
            [qtyToDispense, selectedBatch.id]
        );
    } else {
        updateRes = await pool.query(
            'UPDATE inventory_items SET stock_quantity = stock_quantity - $1 WHERE name = $2 AND stock_quantity >= $1 AND (hospital_id = $3) RETURNING stock_quantity, price_per_unit, id, batch_number',
            [qtyToDispense, itemName, hospitalId]
        );
    }

    if (!updateRes || updateRes.rows.length === 0) return ResponseHandler.error(res, `Insufficient stock or item not found: ${itemName}`, 400); 
    const { price_per_unit, id: itemId, batch_number: batchNum } = updateRes.rows[0];
    const finalBatch = batchNum || (selectedBatch ? selectedBatch.batch_number : null) || 'BATCH-DEFAULT';
    const lineTotal = (parseFloat(price_per_unit) || 0) * qtyToDispense;

    // Prevent double-billing: check if prescription was already billed or paid
    const alreadyBilled = !!(
        task.invoice_id || 
        (task.payment_status && String(task.payment_status).trim().toLowerCase() === 'paid')
    );

    let existingItem = null;
    if (!alreadyBilled) {
        const itemCheck = await pool.query(
            `SELECT ii.id FROM invoice_items ii 
             JOIN invoices inv ON ii.invoice_id = inv.id 
             WHERE inv.patient_id = $1 
               AND (
                   ii.description ILIKE '%' || $2 || '%' 
                   OR $2 ILIKE '%' || REPLACE(REPLACE(ii.description, 'Rx: ', ''), 'Medication: ', '') || '%'
               )
             LIMIT 1`,
            [task.patient_id, itemName]
        );
        if (itemCheck.rows.length > 0) existingItem = itemCheck.rows[0];
    }

    if (!alreadyBilled && !existingItem) {
        // Create pending charge for billing queue (Gold Standard Pattern)
        try {
            await createChargeHelper({
                hospital_id: hospitalId,
                patient_id: task.patient_id,
                admission_id: task.admission_id || null,
                charge_type: 'pharmacy',
                description: `Rx: ${itemName}`,
                quantity: qtyToDispense,
                unit_price: parseFloat(price_per_unit),
                source_table: 'care_tasks',
                source_id: task_id,
                created_by: pharmacist_id
            });
            console.log(`📋 [Pharmacy] Rx charge created for ${itemName} - ₹${parseFloat(price_per_unit)}`);
        } catch (chargeError) {
            console.warn('[Pharmacy] Failed to create Rx charge (non-blocking):', chargeError.message);
            // Fallback to old invoice method
            await addToInvoice(task.patient_id, task.admission_id, `Rx: ${itemName}`, qtyToDispense, parseFloat(price_per_unit), pharmacist_id, hospitalId);
        }
    } else {
        console.log(`📋 [Pharmacy] Prescription ${itemName} already invoiced/paid. Skipping duplicate charge.`);
    }

    // For OPD (no admission_id): Complete the task upon dispensing so it leaves the pending queue
    // For IPD (admission_id exists): Mark Verified so the nurse can administer on the ward
    const isIPD = !!task.admission_id;
    if (isIPD) {
        await pool.query(
            `UPDATE care_tasks 
             SET pharmacy_status = 'Verified', 
                 dispensed_quantity = $3,
                 unit_price = $4,
                 total_amount = $5,
                 batch_number = $6,
                 updated_at = CURRENT_TIMESTAMP, 
                 updated_by = $1 
             WHERE id = $2`, 
            [pharmacist_id, task_id, qtyToDispense, parseFloat(price_per_unit), lineTotal, finalBatch]
        );
        return ResponseHandler.success(res, { pharmacy_status: 'Verified', dispensed_quantity: qtyToDispense, total_amount: lineTotal }, 'Prescription Verified. Ready for Nurse Administration.');
    } else {
        await pool.query(
            `UPDATE care_tasks 
             SET status = 'Completed',
                 pharmacy_status = 'Dispensed', 
                 completed_at = CURRENT_TIMESTAMP, 
                 completed_by = $1,
                 dispensed_quantity = $3,
                 unit_price = $4,
                 total_amount = $5,
                 batch_number = $6,
                 updated_at = CURRENT_TIMESTAMP, 
                 updated_by = $1 
             WHERE id = $2`, 
            [pharmacist_id, task_id, qtyToDispense, parseFloat(price_per_unit), lineTotal, finalBatch]
        );
        return ResponseHandler.success(res, { pharmacy_status: 'Dispensed', status: 'Completed', dispensed_quantity: qtyToDispense, total_amount: lineTotal }, 'Prescription Dispensed successfully.');
    }
});

// Get Prescription Queue - Multi-Tenant
const getPrescriptionQueue = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(
        `SELECT ct.id, ct.patient_id, ct.admission_id, p.name as patient_name, 
                u.username as doctor_name, ct.description, ct.status, ct.pharmacy_status,
                ct.payment_status, ct.invoice_id, ct.created_at 
         FROM care_tasks ct 
         JOIN patients p ON ct.patient_id = p.id 
         LEFT JOIN users u ON ct.doctor_id = u.id 
         WHERE ct.type = 'Medication' AND ct.status = 'Pending' 
           AND (ct.hospital_id = $1 OR ct.hospital_id IS NULL) 
         ORDER BY ct.created_at ASC`, 
        [hospitalId]
    ); 

    const mapped = result.rows.map(row => {
        let normalizedPaymentStatus = row.payment_status;
        if (normalizedPaymentStatus && String(normalizedPaymentStatus).trim().toLowerCase() === 'paid') {
            normalizedPaymentStatus = 'Paid';
        } else {
            normalizedPaymentStatus = 'Pending';
        }
        const doctorName = row.doctor_name || 'doctor_user';
        return {
            ...row,
            doctor_name: doctorName,
            created_by: doctorName,
            payment_status: normalizedPaymentStatus
        };
    });

    ResponseHandler.success(res, mapped);
});

// Request Price Change - Multi-Tenant
const requestPriceChange = asyncHandler(async (req, res) => { 
    const inventory_id = req.body.inventory_id || req.body.item_id; 
    const { new_price, notes } = req.body; 
    const requested_by = req.user.id; 
    const hospitalId = getHospitalId(req); 

    const itemRes = await pool.query('SELECT price_per_unit FROM inventory_items WHERE id = $1 AND (hospital_id = $2)', [inventory_id, hospitalId]); 
    if (itemRes.rows.length === 0) return ResponseHandler.error(res, 'Item not found', 404); 
    const old_price = itemRes.rows[0].price_per_unit; 

    await pool.query('INSERT INTO price_change_requests (inventory_id, old_price, new_price, requested_by, notes, hospital_id) VALUES ($1, $2, $3, $4, $5, $6)', [inventory_id, old_price, new_price, requested_by, notes, hospitalId]); 
    ResponseHandler.success(res, null, 'Price change request submitted');
});

// Get Price Requests - Multi-Tenant
const getPriceRequests = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`SELECT pcr.*, i.name as item_name, u.username as requested_by_name FROM price_change_requests pcr JOIN inventory_items i ON (pcr.inventory_id = i.id OR pcr.item_id = i.id) JOIN users u ON pcr.requested_by = u.id WHERE pcr.status = 'Pending' AND (pcr.hospital_id = $1 OR pcr.hospital_id IS NULL) ORDER BY pcr.created_at DESC`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Approve Price Change - Multi-Tenant
const approvePriceChange = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const hospitalId = getHospitalId(req); 

    try {
        await pool.query('BEGIN'); 
        const reqRes = await pool.query('SELECT * FROM price_change_requests WHERE id = $1 AND (hospital_id = $2)', [id, hospitalId]); 
        if (reqRes.rows.length === 0) { 
            await pool.query('ROLLBACK'); 
            return ResponseHandler.error(res, 'Request not found', 404); 
        } 
        const request = reqRes.rows[0]; 
        if (request.status !== 'Pending') { 
            await pool.query('ROLLBACK'); 
            return ResponseHandler.error(res, 'Request already processed', 400); 
        } 
        await pool.query('UPDATE inventory_items SET price_per_unit = $1 WHERE id = $2', [request.new_price, request.inventory_id]); 
        await pool.query("UPDATE price_change_requests SET status = 'Approved' WHERE id = $1", [id]); 
        await pool.query('COMMIT'); 
        ResponseHandler.success(res, null, 'Price change approved');
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error(error);
        throw error;
    }
});

const denyPriceChange = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const hospitalId = getHospitalId(req); 
    await pool.query("UPDATE price_change_requests SET status = 'Denied' WHERE id = $1 AND (hospital_id = $2)", [id, hospitalId]); 
    ResponseHandler.success(res, null, 'Price change denied');
});

// Expiry Heatmap - Multi-Tenant
const getExpiryHeatmap = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`SELECT TO_CHAR(expiry_date, 'YYYY-MM') as month, COUNT(*) as count, json_agg(json_build_object('id', id, 'name', name, 'expiry_date', expiry_date, 'stock', stock_quantity)) as items FROM inventory_items WHERE expiry_date IS NOT NULL AND (hospital_id = $1) GROUP BY month ORDER BY month ASC`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Demand Forecast - Multi-Tenant
const getDemandForecast = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const usageRes = await pool.query(`SELECT split_part(description, ' - ', 1) as item_name, COUNT(*) as total_units_sold FROM care_tasks WHERE type = 'Medication' AND status = 'Completed' AND created_at >= NOW() - INTERVAL '30 days' AND (hospital_id = $1) GROUP BY item_name`, [hospitalId]); 
    const usageMap = {}; 
    usageRes.rows.forEach(r => { usageMap[r.item_name.trim()] = parseInt(r.total_units_sold); });

    const inventoryRes = await pool.query('SELECT id, name, stock_quantity, reorder_level FROM inventory_items WHERE (hospital_id = $1)', [hospitalId]);
    const forecast = inventoryRes.rows.map(item => { const soldLast30Days = usageMap[item.name.trim()] || 0; const burnRate = soldLast30Days / 30; const daysOfSupply = burnRate > 0 ? (item.stock_quantity / burnRate) : 999; let status = 'Good'; if (daysOfSupply < 7) status = 'Critical'; else if (daysOfSupply < 14) status = 'Low'; const suggestedReorder = (daysOfSupply < 30 || item.stock_quantity < item.reorder_level) ? (Math.ceil(burnRate * 30) - item.stock_quantity + 50) : 0; return { id: item.id, name: item.name, current_stock: item.stock_quantity, sold_last_30d: soldLast30Days, burn_rate: burnRate.toFixed(2), days_of_supply: burnRate > 0 ? daysOfSupply.toFixed(1) : '∞', status, suggested_reorder: suggestedReorder > 0 ? suggestedReorder : 0 }; });
    forecast.sort((a, b) => { const risk = { 'Critical': 3, 'Low': 2, 'Good': 1 }; return risk[b.status] - risk[a.status]; }); 
    ResponseHandler.success(res, forecast);
});

// Add Inventory Item - Enterprise Multi-Tenant
const addInventoryItem = asyncHandler(async (req, res) => { 
    const { 
        name, generic_name, category, dosage_form, strength, pack_size,
        batch_number, mfg_date, expiry_date, manufacturer, rack_location,
        price_per_unit, cost_price, mrp, gst_percent, stock_quantity,
        reorder_level, hsn_code, schedule_type, is_controlled, barcode
    } = req.body; 
    const hospitalId = getHospitalId(req); 
    try {
        const result = await pool.query(`
            INSERT INTO inventory_items (
                name, generic_name, category, dosage_form, strength, pack_size,
                batch_number, mfg_date, expiry_date, manufacturer, rack_location,
                price_per_unit, cost_price, mrp, gst_percent, stock_quantity,
                reorder_level, hsn_code, schedule_type, is_controlled, barcode, hospital_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING *
        `, [
            name, 
            generic_name || null, 
            category || 'General', 
            dosage_form || 'Tablet', 
            strength || null, 
            pack_size || '10s Strip',
            batch_number || null, 
            mfg_date || null, 
            expiry_date || null, 
            manufacturer || null, 
            rack_location || null, 
            price_per_unit || 0.00, 
            cost_price || null, 
            mrp || null, 
            gst_percent || 12.00, 
            stock_quantity || 0, 
            reorder_level || 100, 
            hsn_code || '30049099', 
            schedule_type || 'OTC', 
            Boolean(is_controlled), 
            barcode || null, 
            hospitalId
        ]); 
        ResponseHandler.success(res, result.rows[0], 'Item added successfully', 201);
    } catch (error) {
         if (error.code === '23505') return ResponseHandler.error(res, 'Drug with this name and batch already exists', 409, error);
         throw error;
    }
});

// Update Inventory Item / Add Batch - Multi-Tenant
const updateInventoryItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    const { 
        name, generic_name, category, dosage_form, strength, pack_size,
        batch_number, mfg_date, expiry_date, manufacturer, rack_location,
        price_per_unit, cost_price, mrp, gst_percent, stock_quantity,
        reorder_level, hsn_code, schedule_type, is_controlled, barcode
    } = req.body;

    const result = await pool.query(`
        UPDATE inventory_items SET
            name = COALESCE($1, name),
            generic_name = COALESCE($2, generic_name),
            category = COALESCE($3, category),
            dosage_form = COALESCE($4, dosage_form),
            strength = COALESCE($5, strength),
            pack_size = COALESCE($6, pack_size),
            batch_number = COALESCE($7, batch_number),
            mfg_date = COALESCE($8, mfg_date),
            expiry_date = COALESCE($9, expiry_date),
            manufacturer = COALESCE($10, manufacturer),
            rack_location = COALESCE($11, rack_location),
            price_per_unit = COALESCE($12, price_per_unit),
            cost_price = COALESCE($13, cost_price),
            mrp = COALESCE($14, mrp),
            gst_percent = COALESCE($15, gst_percent),
            stock_quantity = COALESCE($16, stock_quantity),
            reorder_level = COALESCE($17, reorder_level),
            hsn_code = COALESCE($18, hsn_code),
            schedule_type = COALESCE($19, schedule_type),
            is_controlled = COALESCE($20, is_controlled),
            barcode = COALESCE($21, barcode)
        WHERE id = $22 AND (hospital_id = $23 OR hospital_id IS NULL)
        RETURNING *
    `, [
        name, generic_name, category, dosage_form, strength, pack_size,
        batch_number, mfg_date, expiry_date, manufacturer, rack_location,
        price_per_unit, cost_price, mrp, gst_percent, stock_quantity,
        reorder_level, hsn_code, schedule_type, is_controlled, barcode,
        id, hospitalId
    ]);

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Inventory item not found', 404);
    }
    ResponseHandler.success(res, result.rows[0], 'Item updated successfully');
});

// Delete Inventory Item - Multi-Tenant
const deleteInventoryItem = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const hospitalId = getHospitalId(req); 
    await pool.query('DELETE FROM inventory_items WHERE id = $1 AND (hospital_id = $2)', [id, hospitalId]); 
    ResponseHandler.success(res, null, 'Item deleted successfully');
});

// Get Suppliers - Multi-Tenant
const getSuppliers = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query('SELECT * FROM suppliers WHERE (hospital_id = $1) ORDER BY name', [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Create Supplier - Multi-Tenant
const createSupplier = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { name, contact_person, phone, email, address, gstin, drug_license_no, payment_terms } = req.body;
    if (!name) return ResponseHandler.error(res, 'Supplier name is required', 400);

    const result = await pool.query(`
        INSERT INTO suppliers (name, contact_person, phone, email, address, gstin, drug_license_no, payment_terms, hospital_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    `, [name, contact_person || null, phone || null, email || null, address || null, gstin || null, drug_license_no || null, payment_terms || 'Net 30', hospitalId]);
    ResponseHandler.success(res, result.rows[0], 'Supplier created successfully', 201);
});

// Create Purchase Order - Multi-Tenant
const createPurchaseOrder = asyncHandler(async (req, res) => { 
    const { supplier_id, items, expected_delivery_date, notes, department_id } = req.body; 
    const user_id = req.user.id; 
    const hospitalId = getHospitalId(req); 

    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0); 
    const poRes = await pool.query(`INSERT INTO purchase_orders (supplier_id, status, total_amount, created_by, expected_delivery_date, notes, hospital_id) VALUES ($1, 'Pending', $2, $3, $4, $5, $6) RETURNING *`, [supplier_id, total_amount, user_id, expected_delivery_date, notes, hospitalId]); 
    const po = poRes.rows[0]; 
    for (const item of items) { 
        await pool.query(`INSERT INTO po_items (po_id, inventory_item_id, item_name, quantity, unit_price, hospital_id) VALUES ($1, $2, $3, $4, $5, $6)`, [po.id, item.inventory_item_id, item.item_name, item.quantity, item.unit_price, hospitalId]); 
    } 

    // [ENTERPRISE] Trigger Approval Matrix Workflow
    const reqDeptId = department_id || 1; // Fallback to 1 if not provided
    try {
        const workflowResult = await ApprovalWorkflow.initiateApproval(po.id, hospitalId, total_amount, reqDeptId);
        po.status = workflowResult.status;
    } catch (workflowErr) {
        console.error('[ApprovalWorkflow] Failed to init matrix, defaulting to PENDING level:', workflowErr);
    }
    
    ResponseHandler.success(res, { po }, 'Purchase Order created and submitted for approval', 201);
});

// [ENTERPRISE] Approve Purchase Order
const approvePurchaseOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    const userId = req.user.id;

    try {
        const result = await ApprovalWorkflow.processAction(id, hospitalId, userId, 'APPROVE');
        ResponseHandler.success(res, result, `Purchase Order successfully advanced to: ${result.status}`);
    } catch (e) {
        ResponseHandler.error(res, e.message, 400);
    }
});

// [ENTERPRISE] Reject Purchase Order
const rejectPurchaseOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const hospitalId = getHospitalId(req);
    const userId = req.user.id;

    if (!reason) return ResponseHandler.error(res, 'Rejection reason is required', 400);

    try {
        const result = await ApprovalWorkflow.processAction(id, hospitalId, userId, 'REJECT', reason);
        ResponseHandler.success(res, result, 'Purchase Order has been rejected.');
    } catch (e) {
        ResponseHandler.error(res, e.message, 400);
    }
});

// Receive Stock (Enterprise Goods Received Note / GRN Processing) - Multi-Tenant Transaction
const receiveStock = asyncHandler(async (req, res) => { 
    const { po_id, invoice_number, invoice_date, items, notes } = req.body; 
    const hospitalId = getHospitalId(req); 
    const userId = req.user?.id || null;

    if (!po_id) return ResponseHandler.error(res, 'PO ID is required', 400);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Fetch PO header with row lock
        const poRes = await client.query('SELECT * FROM purchase_orders WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL) FOR UPDATE', [po_id, hospitalId]); 
        if (poRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return ResponseHandler.error(res, 'Purchase order not found', 404);
        }
        const po = poRes.rows[0];

        // Fetch po_items
        const itemsRes = await client.query('SELECT * FROM po_items WHERE po_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [po_id, hospitalId]); 
        const dbItems = itemsRes.rows;

        let totalReceivedUnits = 0;
        let totalReceivedAmount = 0;

        const receiptItems = Array.isArray(items) && items.length > 0 
            ? items 
            : dbItems.map(it => ({
                po_item_id: it.id,
                inventory_item_id: it.inventory_item_id,
                item_name: it.item_name,
                quantity: it.quantity,
                unit_price: it.unit_price,
                batch_number: it.batch_number || `GRN-${Date.now().toString().slice(-6)}`,
                mfg_date: it.mfg_date || null,
                expiry_date: it.expiry_date || null
            }));

        for (const rItem of receiptItems) {
            const qty = parseInt(rItem.quantity || rItem.received_quantity || 0);
            if (qty <= 0) continue;

            const unitPrice = parseFloat(rItem.unit_price || 0);
            totalReceivedUnits += qty;
            totalReceivedAmount += (qty * unitPrice);

            let invItemId = rItem.inventory_item_id;
            const batchNo = rItem.batch_number || null;
            const expDate = rItem.expiry_date || null;
            const mfgDate = rItem.mfg_date || null;

            if (invItemId) {
                // Check if identical batch exists for this item
                const existingBatch = await client.query(
                    'SELECT * FROM inventory_items WHERE (id = $1 OR (LOWER(name) = (SELECT LOWER(name) FROM inventory_items WHERE id = $1) AND batch_number = $2)) AND (hospital_id = $3)',
                    [invItemId, batchNo, hospitalId]
                );

                if (existingBatch.rows.length > 0 && existingBatch.rows[0].batch_number === batchNo) {
                    await client.query(`
                        UPDATE inventory_items SET 
                            stock_quantity = stock_quantity + $1,
                            expiry_date = COALESCE($2, expiry_date),
                            mfg_date = COALESCE($3, mfg_date),
                            cost_price = COALESCE($4, cost_price)
                        WHERE id = $5
                    `, [qty, expDate, mfgDate, unitPrice > 0 ? unitPrice : null, existingBatch.rows[0].id]);
                } else if (batchNo && existingBatch.rows.length > 0) {
                    // Create new batch row for multi-batch FEFO
                    const master = existingBatch.rows[0];
                    await client.query(`
                        INSERT INTO inventory_items (
                            name, generic_name, category, dosage_form, strength, pack_size,
                            batch_number, mfg_date, expiry_date, manufacturer, rack_location,
                            price_per_unit, cost_price, mrp, gst_percent, stock_quantity,
                            reorder_level, hsn_code, schedule_type, is_controlled, hospital_id
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                        ON CONFLICT (LOWER(name), COALESCE(batch_number, 'DEFAULT'), COALESCE(hospital_id, 1))
                        DO UPDATE SET stock_quantity = inventory_items.stock_quantity + EXCLUDED.stock_quantity
                    `, [
                        master.name, master.generic_name, master.category, master.dosage_form || 'Tablet',
                        master.strength, master.pack_size, batchNo, mfgDate, expDate,
                        master.manufacturer, master.rack_location, master.price_per_unit,
                        unitPrice > 0 ? unitPrice : master.cost_price, master.mrp, master.gst_percent,
                        qty, master.reorder_level, master.hsn_code, master.schedule_type, master.is_controlled, hospitalId
                    ]);
                } else {
                    await client.query(
                        'UPDATE inventory_items SET stock_quantity = stock_quantity + $1 WHERE id = $2 AND (hospital_id = $3)',
                        [qty, invItemId, hospitalId]
                    );
                }
            }

            // Update po_items line
            if (rItem.po_item_id) {
                await client.query(`
                    UPDATE po_items SET 
                        received_quantity = COALESCE(received_quantity, 0) + $1,
                        batch_number = COALESCE($2, batch_number),
                        mfg_date = COALESCE($3, mfg_date),
                        expiry_date = COALESCE($4, expiry_date)
                    WHERE id = $5 AND (hospital_id = $6)
                `, [qty, batchNo, mfgDate, expDate, rItem.po_item_id, hospitalId]);
            }
        }

        // Generate Audit GRN Number
        const grnNumber = `GRN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${po_id}-${Math.floor(1000 + Math.random()*9000)}`;

        // Insert Goods Received Note
        await client.query(`
            INSERT INTO goods_received_notes (
                grn_number, po_id, supplier_id, invoice_number, invoice_date,
                received_by, received_date, total_items, total_amount, status, notes, hospital_id
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, 'Completed', $9, $10)
        `, [
            grnNumber, po_id, po.supplier_id, invoice_number || `INV-PO-${po_id}`,
            invoice_date || new Date().toISOString().slice(0,10), userId,
            totalReceivedUnits, totalReceivedAmount || po.total_amount, notes || 'Stock received via Enterprise GRN', hospitalId
        ]);

        // Update PO status, GRN number and timestamps
        await client.query(`
            UPDATE purchase_orders SET 
                status = 'Received',
                grn_number = $1,
                invoice_no = COALESCE($2, invoice_no),
                received_at = NOW(),
                received_by = $3
            WHERE id = $4 AND (hospital_id = $5 OR hospital_id IS NULL)
        `, [grnNumber, invoice_number || null, userId, po_id, hospitalId]);

        await client.query('COMMIT');
        ResponseHandler.success(res, { grn_number: grnNumber, total_received: totalReceivedUnits }, 'Stock received successfully (GRN Processed)', 200);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[receiveStock] Transaction failed:', err);
        return ResponseHandler.error(res, 'Failed to process GRN receipt: ' + err.message, 500, err);
    } finally {
        client.release();
    }
});

// Get Purchase Orders - Multi-Tenant
const getPurchaseOrders = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE (po.hospital_id = $1 OR po.hospital_id IS NULL) ORDER BY po.created_at DESC`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// ABC Analysis - Multi-Tenant
const getABCAnalysis = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`SELECT id, name, stock_quantity, price_per_unit, (stock_quantity * price_per_unit) as total_value FROM inventory_items WHERE stock_quantity > 0 AND (hospital_id = $1) ORDER BY total_value DESC`, [hospitalId]); 
    const items = result.rows; 
    const totalInventoryValue = items.reduce((sum, item) => sum + Number(item.total_value), 0); 
    let cumulativeValue = 0; 
    let a_items = 0, b_items = 0, c_items = 0; 
    let a_value = 0, b_value = 0, c_value = 0; 
    items.forEach(item => { 
        cumulativeValue += Number(item.total_value); 
        const percentage = totalInventoryValue > 0 ? (cumulativeValue / totalInventoryValue) * 100 : 0; 
        if (percentage <= 70) { a_items++; a_value += Number(item.total_value); } 
        else if (percentage <= 90) { b_items++; b_value += Number(item.total_value); } 
        else { c_items++; c_value += Number(item.total_value); } 
    }); 
    const statsData = { 
        A: { count: a_items, value: a_value, label: 'Class A (High Value 70%)' }, 
        B: { count: b_items, value: b_value, label: 'Class B (Moderate 20%)' }, 
        C: { count: c_items, value: c_value, label: 'Class C (Low Value 10%)' } 
    };
    return res.status(200).json({
        success: true,
        message: 'Success',
        stats: statsData,
        totalValue: totalInventoryValue,
        items: result.rows,
        data: {
            stats: statsData,
            totalValue: totalInventoryValue,
            items: result.rows
        }
    });
});

// Expiry Report - Multi-Tenant
const getExpiryReport = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`SELECT * FROM inventory_items WHERE expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND (hospital_id = $1) ORDER BY expiry_date ASC`, [hospitalId]); 
    const expiryRows = result.rows.map(row => ({
        ...row,
        days_remaining: Math.max(0, Math.ceil((new Date(row.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)))
    }));
    return res.status(200).json(expiryRows);
});

// Smart Alerts - Multi-Tenant
const getSmartAlerts = asyncHandler(async (req, res) => { 
    const alerts = await SmartInventory.getInventoryAlerts(); 
    ResponseHandler.success(res, alerts);
});

// Recent Dispenses - Multi-Tenant (With True Quantity, Total Amount & UHID)
const getRecentDispenses = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const { days = 30, limit = 100 } = req.query; 
    const result = await pool.query(`
        SELECT * FROM (
            SELECT DISTINCT ON (ct.id)
                ct.id,
                ct.id as task_id,
                ct.patient_id,
                ct.admission_id,
                ct.description as medication,
                ct.completed_at as dispense_date,
                ct.completed_by,
                p.name as patient_name,
                p.phone as patient_phone,
                p.uhid as patient_uhid,
                COALESCE(NULLIF(p.uhid, ''), p.phone) as patient_identifier,
                u.username as dispensed_by_name,
                COALESCE(ct.dispensed_quantity, 1) as quantity,
                COALESCE(ct.unit_price, ii.price_per_unit, 0.00) as unit_price,
                COALESCE(ct.unit_price, ii.price_per_unit, 0.00) as price_per_unit,
                COALESCE(ct.total_amount, (COALESCE(ct.dispensed_quantity, 1) * COALESCE(ct.unit_price, ii.price_per_unit, 0.00))) as amount,
                COALESCE(ct.total_amount, (COALESCE(ct.dispensed_quantity, 1) * COALESCE(ct.unit_price, ii.price_per_unit, 0.00))) as total_amount,
                COALESCE(ct.batch_number, ii.batch_number, '') as batch_number,
                ii.name as item_name,
                inv.id as invoice_id,
                inv.status as invoice_status,
                inv.total_amount as invoice_total
            FROM care_tasks ct
            LEFT JOIN patients p ON ct.patient_id = p.id
            LEFT JOIN users u ON ct.completed_by = u.id
            LEFT JOIN inventory_items ii ON LOWER(split_part(ct.description, ' - ', 1)) = LOWER(ii.name) AND (ii.hospital_id = ct.hospital_id OR ii.hospital_id IS NULL)
            LEFT JOIN invoices inv ON ct.invoice_id = inv.id
            WHERE ct.type = 'Medication' 
              AND ct.status = 'Completed' 
              AND ct.completed_at > NOW() - INTERVAL '${parseInt(days)} days' 
              AND (ct.hospital_id = $1 OR ct.hospital_id IS NULL)
            ORDER BY ct.id, ct.completed_at DESC
        ) sub
        ORDER BY dispense_date DESC
        LIMIT ${parseInt(limit)}
    `, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Process Refund - Multi-Tenant
const processRefund = asyncHandler(async (req, res) => {
    const taskId = req.body.task_id || req.body.invoice_item_id || null;
    let itemName = req.body.item_name;
    const quantity = parseInt(req.body.quantity || req.body.return_quantity || 1, 10);
    let patientId = req.body.patient_id;
    let reason = req.body.reason;
    const reason_notes = req.body.reason_notes || null;
    const restore_stock = req.body.restore_stock !== false;
    const pharmacist_id = req.user.id;
    const hospitalId = getHospitalId(req);
    
    if (!reason) return ResponseHandler.error(res, 'Refund reason is required', 400);

    // Auto-resolve item_name and patient_id from care_tasks if not supplied
    if (taskId && (!itemName || !patientId)) {
        const taskLookup = await pool.query(
            `SELECT description, patient_id FROM care_tasks WHERE id::text = $1`,
            [String(taskId)]
        );
        if (taskLookup.rows.length > 0) {
            if (!itemName) itemName = taskLookup.rows[0].description.split(' - ')[0].trim();
            if (!patientId) patientId = taskLookup.rows[0].patient_id;
        }
    }

    if (!itemName) return ResponseHandler.error(res, 'Item name and reason are required', 400);

    // Normalize reason to valid enum values
    const validReasons = ['wrong_medication', 'adverse_reaction', 'patient_refused', 'duplicate_dispense', 'doctor_cancelled', 'other'];
    const reasonMap = {
        'customer return (unopened)': 'patient_refused',
        'dispensing error': 'wrong_medication',
        'dispensing error / wrong item': 'wrong_medication',
        'defective / damaged': 'wrong_medication',
        'damaged / defective': 'wrong_medication',
        'wrong medication dispensed': 'wrong_medication',
        'expired product': 'other',
        'adverse reaction': 'adverse_reaction',
        'adverse reaction (clinical)': 'adverse_reaction',
        'doctor cancelled': 'doctor_cancelled',
        'duplicate dispense': 'duplicate_dispense'
    };
    const normalizedReason = reasonMap[String(reason).trim().toLowerCase()] || (validReasons.includes(reason) ? reason : 'other');

    const itemRes = await pool.query(
        'SELECT id, price_per_unit, stock_quantity FROM inventory_items WHERE LOWER(name) = LOWER($1) AND (hospital_id = $2 OR hospital_id IS NULL) LIMIT 1',
        [itemName, hospitalId]
    ); 
    if (itemRes.rows.length === 0) return ResponseHandler.error(res, 'Item not found in inventory', 404); 
    const item = itemRes.rows[0]; 
    const refund_amount = parseFloat(item.price_per_unit) * quantity;

    let patient_name = 'Unknown'; 
    if (patientId) { 
        const patientRes = await pool.query('SELECT name FROM patients WHERE id = $1', [patientId]); 
        if (patientRes.rows.length > 0) patient_name = patientRes.rows[0].name; 
    }
    const pharmacistRes = await pool.query('SELECT username FROM users WHERE id = $1', [pharmacist_id]); 
    const pharmacist_name = pharmacistRes.rows[0]?.username || 'Unknown';

    try {
        await pool.query('BEGIN');
        if (restore_stock) {
            await pool.query('UPDATE inventory_items SET stock_quantity = stock_quantity + $1 WHERE id = $2', [quantity, item.id]);
        }
        let invoiceReversed = false;
        if (patientId) { 
            const invoiceRes = await pool.query(
                'SELECT id, status FROM invoices WHERE patient_id = $1 ORDER BY generated_at DESC LIMIT 1',
                [patientId]
            ); 
            if (invoiceRes.rows.length > 0) { 
                const inv = invoiceRes.rows[0]; 
                await pool.query(
                    `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, hospital_id) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [inv.id, `REFUND: ${itemName}`, quantity, -parseFloat(item.price_per_unit), -refund_amount, hospitalId]
                ); 
                if (inv.status === 'Pending') {
                    await pool.query('UPDATE invoices SET total_amount = total_amount - $1 WHERE id = $2', [refund_amount, inv.id]); 
                }
                invoiceReversed = true;
            } 
        }
        await pool.query(
            `INSERT INTO pharmacy_refunds (
                original_task_id, patient_id, patient_name, item_name, quantity, 
                refund_amount, reason, reason_notes, stock_restored, invoice_reversed, 
                processed_by, processed_by_name, status, completed_at, hospital_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Completed', NOW(), $13)`,
            [
                taskId ? String(taskId) : null,
                patientId || null,
                patient_name,
                itemName,
                quantity,
                refund_amount,
                normalizedReason,
                reason_notes || String(reason),
                restore_stock,
                invoiceReversed,
                pharmacist_id,
                pharmacist_name,
                hospitalId
            ]
        );
        await pool.query('COMMIT'); 
        console.log(`💰 REFUND PROCESSED: ${itemName} x${quantity} = ₹${refund_amount} [${normalizedReason}] by ${pharmacist_name}`); 
        ResponseHandler.success(res, { 
            refund_amount, 
            stock_restored: restore_stock, 
            new_stock: restore_stock ? item.stock_quantity + quantity : item.stock_quantity 
        }, 'Refund processed successfully');
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Refund error:', error);
        throw error;
    }
});

// Controlled Substance Log - Multi-Tenant
const getControlledSubstanceLog = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const { days = 30 } = req.query; 
    const result = await pool.query(
        `SELECT csl.*, ii.name as current_stock_name 
         FROM controlled_substance_log csl 
         LEFT JOIN inventory_items ii ON csl.inventory_item_id = ii.id 
         WHERE COALESCE(csl.dispensed_at, csl.created_at) > NOW() - INTERVAL '${parseInt(days)} days' 
           AND (csl.hospital_id = $1 OR csl.hospital_id IS NULL) 
         ORDER BY COALESCE(csl.dispensed_at, csl.created_at) DESC 
         LIMIT 500`,
        [hospitalId]
    ); 
    ResponseHandler.success(res, result.rows);
});

// Refund History - Multi-Tenant
const getRefundHistory = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const { days = 30 } = req.query; 
    const result = await pool.query(`SELECT * FROM pharmacy_refunds WHERE created_at > NOW() - INTERVAL '${parseInt(days)} days' AND (hospital_id = $1) ORDER BY created_at DESC LIMIT 100`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Get Unbilled Dispenses - Multi-Tenant (Billing Leakage Tracker)
const getUnbilledDispenses = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    try {
        const result = await pool.query(`
            SELECT c.*, c.item_name as name, c.amount as price, p.name as patient_name, false as billed
            FROM charges c
            LEFT JOIN patients p ON c.patient_id = p.id
            WHERE (c.department = 'pharmacy' OR c.department = 'Pharmacy' OR c.item_name ILIKE 'Rx:%') 
              AND c.status = 'Pending' 
              AND (c.hospital_id = $1 OR c.hospital_id IS NULL)
            ORDER BY c.created_at DESC LIMIT 100
        `, [hospitalId]);
        ResponseHandler.success(res, result.rows);
    } catch (e) {
        ResponseHandler.success(res, []);
    }
});

module.exports = { getInventory, searchInventory, dispense, getPrescriptionQueue, processPrescription, requestPriceChange, getPriceRequests, approvePriceChange, denyPriceChange, getExpiryHeatmap, getDemandForecast, addInventoryItem, updateInventoryItem, deleteInventoryItem, getSuppliers, createSupplier, createPurchaseOrder, approvePurchaseOrder, rejectPurchaseOrder, receiveStock, getPurchaseOrders, getABCAnalysis, getExpiryReport, getRecentDispenses, processRefund, getRefundHistory, getControlledSubstanceLog, getSmartAlerts, getUnbilledDispenses };

