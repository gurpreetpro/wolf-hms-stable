const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const { addToInvoice } = require('../services/billingService');
const { createChargeHelper } = require('./chargesController'); // Centralized Billing
const SmartInventory = require('../services/SmartInventory');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get Inventory - Multi-Tenant
const getInventory = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query('SELECT * FROM inventory_items WHERE (hospital_id = $1 OR hospital_id IS NULL) ORDER BY name', [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Search Inventory - Multi-Tenant
const searchInventory = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { query } = req.query;
    if (!query) return ResponseHandler.success(res, []);
    
    const result = await pool.query(`
        SELECT * FROM inventory_items 
        WHERE (hospital_id = $1 OR hospital_id IS NULL) 
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

    const itemRes = await pool.query('SELECT * FROM inventory_items WHERE name = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [item, hospitalId]); 
    if (itemRes.rows.length === 0) return ResponseHandler.error(res, 'Item not found', 404);
    const inventoryItem = itemRes.rows[0];

    if (patient_id && !force) { 
        const patientRes = await pool.query('SELECT history_json FROM patients WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [patient_id, hospitalId]); 
        if (patientRes.rows.length > 0) { 
            const history = patientRes.rows[0].history_json || {}; 
            const allergies = history.allergies || []; 
            const risk = allergies.find(a => inventoryItem.category.toLowerCase().includes(a.toLowerCase()) || inventoryItem.name.toLowerCase().includes(a.toLowerCase())); 
            if (risk) return ResponseHandler.error(res, `CLINICAL ALERT: Patient is allergic to ${risk}.`, 409, { type: 'ALLERGY_WARNING', risk });
        } 
    }
    const updateRes = await pool.query('UPDATE inventory_items SET stock_quantity = stock_quantity - $1 WHERE name = $2 AND stock_quantity >= $1 AND (hospital_id = $3 OR hospital_id IS NULL) RETURNING stock_quantity, price_per_unit, id', [quantity, item, hospitalId]); 
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
    const itemName = task.description.split(' - ')[0].trim();

    if (!force) { 
        const patient_id = task.patient_id; 
        const itemRes = await pool.query('SELECT * FROM inventory_items WHERE name = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [itemName, hospitalId]); 
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
        const recentMedsRes = await pool.query(`SELECT DISTINCT split_part(description, ' - ', 1) as drug_name FROM care_tasks WHERE patient_id = $1 AND type = 'Medication' AND status = 'Completed' AND completed_at > NOW() - INTERVAL '7 days' AND (hospital_id = $2 OR hospital_id IS NULL)`, [patient_id, hospitalId]); 
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

    const qtyToDispense = 1; 
    const updateRes = await pool.query('UPDATE inventory_items SET stock_quantity = stock_quantity - $1 WHERE name = $2 AND stock_quantity >= $1 AND (hospital_id = $3 OR hospital_id IS NULL) RETURNING stock_quantity, price_per_unit, id', [qtyToDispense, itemName, hospitalId]); 
    if (updateRes.rows.length === 0) return ResponseHandler.error(res, `Insufficient stock or item not found: ${itemName}`, 400); 
    const { price_per_unit, id: itemId } = updateRes.rows[0];

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

    // Simplified for Schema Compatibility (removed is_controlled check)
    /* 
    const controlledCheck = await pool.query('SELECT id, is_controlled, schedule_type, batch_number FROM inventory_items WHERE name = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [itemName, hospitalId]); 
    if (controlledCheck.rows.length > 0 && controlledCheck.rows[0].is_controlled) { 
        const item = controlledCheck.rows[0]; 
        const patientRes = await pool.query('SELECT name FROM patients WHERE id = $1', [task.patient_id]); 
        const pharmacistRes = await pool.query('SELECT username FROM users WHERE id = $1', [pharmacist_id]); 
        await pool.query(`INSERT INTO controlled_substance_log (inventory_item_id, drug_name, schedule_type, patient_id, patient_name, quantity, prescription_id, dispensed_by, dispensed_by_name, admission_id, batch_number, balance_before, balance_after, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [item.id, itemName, item.schedule_type, task.patient_id, patientRes.rows[0]?.name || 'Unknown', qtyToDispense, task.id, pharmacist_id, pharmacistRes.rows[0]?.username || 'Unknown', task.admission_id, item.batch_number, updateRes.rows[0].stock_quantity + qtyToDispense, updateRes.rows[0].stock_quantity, hospitalId]); 
        console.log(`⚠️ CONTROLLED SUBSTANCE DISPENSED: ${itemName} [${item.schedule_type}] to ${patientRes.rows[0]?.name}`); 
    }
    */

    // [CLMA] Phase 2: Pharmacy Verification Step
    // Instead of completing the task, we mark it as 'Verified' so the Nurse can administer it.
    // We only complete it if it's NOT a medication task (which it is, by definition of this API), 
    // or if we want to bypass CLMA (optional flag?). For now, STRICT CLMA.
    
    // Check if task exists (already fetched above)
    // Update the task to 'Verified' by pharmacy
    await pool.query(
        `UPDATE care_tasks 
         SET pharmacy_status = 'Verified', 
             updated_at = CURRENT_TIMESTAMP, 
             updated_by = $1 
         WHERE id = $2`, 
        [pharmacist_id, task_id]
    );
    
    ResponseHandler.success(res, { pharmacy_status: 'Verified' }, 'Prescription Verified. Ready for Nurse Administration.');
});

// Get Prescription Queue - Multi-Tenant
const getPrescriptionQueue = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`SELECT ct.id, ct.patient_id, ct.admission_id, p.name as patient_name, u.username as doctor_name, ct.description, ct.status, ct.created_at FROM care_tasks ct JOIN patients p ON ct.patient_id = p.id LEFT JOIN users u ON ct.doctor_id = u.id WHERE ct.type = 'Medication' AND ct.status = 'Pending' AND (ct.hospital_id = $1 OR ct.hospital_id IS NULL) ORDER BY ct.created_at ASC`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Request Price Change - Multi-Tenant
const requestPriceChange = asyncHandler(async (req, res) => { 
    const { inventory_id, new_price, notes } = req.body; 
    const requested_by = req.user.id; 
    const hospitalId = getHospitalId(req); 

    const itemRes = await pool.query('SELECT price_per_unit FROM inventory_items WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [inventory_id, hospitalId]); 
    if (itemRes.rows.length === 0) return ResponseHandler.error(res, 'Item not found', 404); 
    const old_price = itemRes.rows[0].price_per_unit; 

    await pool.query('INSERT INTO price_change_requests (inventory_id, old_price, new_price, requested_by, notes, hospital_id) VALUES ($1, $2, $3, $4, $5, $6)', [inventory_id, old_price, new_price, requested_by, notes, hospitalId]); 
    ResponseHandler.success(res, null, 'Price change request submitted');
});

// Get Price Requests - Multi-Tenant
const getPriceRequests = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`SELECT pcr.*, i.name as item_name, u.username as requested_by_name FROM price_change_requests pcr JOIN inventory_items i ON pcr.inventory_id = i.id JOIN users u ON pcr.requested_by = u.id WHERE pcr.status = 'Pending' AND (pcr.hospital_id = $1 OR pcr.hospital_id IS NULL) ORDER BY pcr.created_at DESC`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Approve Price Change - Multi-Tenant
const approvePriceChange = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const hospitalId = getHospitalId(req); 

    try {
        await pool.query('BEGIN'); 
        const reqRes = await pool.query('SELECT * FROM price_change_requests WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [id, hospitalId]); 
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
    await pool.query("UPDATE price_change_requests SET status = 'Denied' WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)", [id, hospitalId]); 
    ResponseHandler.success(res, null, 'Price change denied');
});

// Expiry Heatmap - Multi-Tenant
const getExpiryHeatmap = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`SELECT TO_CHAR(expiry_date, 'YYYY-MM') as month, COUNT(*) as count, json_agg(json_build_object('id', id, 'name', name, 'expiry_date', expiry_date, 'stock', stock_quantity)) as items FROM inventory_items WHERE expiry_date IS NOT NULL AND (hospital_id = $1 OR hospital_id IS NULL) GROUP BY month ORDER BY month ASC`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Demand Forecast - Multi-Tenant
const getDemandForecast = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const usageRes = await pool.query(`SELECT split_part(description, ' - ', 1) as item_name, COUNT(*) as total_units_sold FROM care_tasks WHERE type = 'Medication' AND status = 'Completed' AND created_at >= NOW() - INTERVAL '30 days' AND (hospital_id = $1 OR hospital_id IS NULL) GROUP BY item_name`, [hospitalId]); 
    const usageMap = {}; 
    usageRes.rows.forEach(r => { usageMap[r.item_name.trim()] = parseInt(r.total_units_sold); });

    const inventoryRes = await pool.query('SELECT id, name, stock_quantity, reorder_level FROM inventory_items WHERE (hospital_id = $1 OR hospital_id IS NULL)', [hospitalId]);
    const forecast = inventoryRes.rows.map(item => { const soldLast30Days = usageMap[item.name.trim()] || 0; const burnRate = soldLast30Days / 30; const daysOfSupply = burnRate > 0 ? (item.stock_quantity / burnRate) : 999; let status = 'Good'; if (daysOfSupply < 7) status = 'Critical'; else if (daysOfSupply < 14) status = 'Low'; const suggestedReorder = (daysOfSupply < 30 || item.stock_quantity < item.reorder_level) ? (Math.ceil(burnRate * 30) - item.stock_quantity + 50) : 0; return { id: item.id, name: item.name, current_stock: item.stock_quantity, sold_last_30d: soldLast30Days, burn_rate: burnRate.toFixed(2), days_of_supply: burnRate > 0 ? daysOfSupply.toFixed(1) : '∞', status, suggested_reorder: suggestedReorder > 0 ? suggestedReorder : 0 }; });
    forecast.sort((a, b) => { const risk = { 'Critical': 3, 'Low': 2, 'Good': 1 }; return risk[b.status] - risk[a.status]; }); 
    ResponseHandler.success(res, forecast);
});

// Add Inventory Item - Multi-Tenant
const addInventoryItem = asyncHandler(async (req, res) => { 
    const { name, generic_name, category, manufacturer, rack_location, price_per_unit, stock_quantity, reorder_level, hsn_code } = req.body; 
    const hospitalId = getHospitalId(req); 
    try {
        const result = await pool.query(`INSERT INTO inventory_items (name, generic_name, category, manufacturer, rack_location, price_per_unit, stock_quantity, reorder_level, hsn_code, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [name, generic_name, category, manufacturer, rack_location, price_per_unit, stock_quantity || 0, reorder_level || 100, hsn_code, hospitalId]); 
        ResponseHandler.success(res, result.rows[0], 'Item added successfully', 201);
    } catch (error) {
         if (error.code === '23505') return ResponseHandler.error(res, 'Drug with this name already exists', 409, error);
         throw error;
    }
});

// Delete Inventory Item - Multi-Tenant
const deleteInventoryItem = asyncHandler(async (req, res) => { 
    const { id } = req.params; 
    const hospitalId = getHospitalId(req); 
    await pool.query('DELETE FROM inventory_items WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [id, hospitalId]); 
    ResponseHandler.success(res, null, 'Item deleted successfully');
});

// Get Suppliers - Multi-Tenant
const getSuppliers = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query('SELECT * FROM suppliers WHERE (hospital_id = $1 OR hospital_id IS NULL) ORDER BY name', [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Create Purchase Order - Multi-Tenant
const createPurchaseOrder = asyncHandler(async (req, res) => { 
    const { supplier_id, items, expected_delivery_date, notes } = req.body; 
    const user_id = req.user.id; 
    const hospitalId = getHospitalId(req); 

    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0); 
    const poRes = await pool.query(`INSERT INTO purchase_orders (supplier_id, status, total_amount, created_by, expected_delivery_date, notes, hospital_id) VALUES ($1, 'Pending', $2, $3, $4, $5, $6) RETURNING *`, [supplier_id, total_amount, user_id, expected_delivery_date, notes, hospitalId]); 
    const po = poRes.rows[0]; 
    for (const item of items) { 
        await pool.query(`INSERT INTO po_items (po_id, inventory_item_id, item_name, quantity, unit_price, hospital_id) VALUES ($1, $2, $3, $4, $5, $6)`, [po.id, item.inventory_item_id, item.item_name, item.quantity, item.unit_price, hospitalId]); 
    } 
    ResponseHandler.success(res, { po }, 'Purchase Order created', 201);
});

// Receive Stock - Multi-Tenant
const receiveStock = asyncHandler(async (req, res) => { 
    const { po_id } = req.body; 
    const hospitalId = getHospitalId(req); 
    
    const itemsRes = await pool.query('SELECT * FROM po_items WHERE po_id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [po_id, hospitalId]); 
    for (const item of itemsRes.rows) { 
        if (item.inventory_item_id) { 
            await pool.query('UPDATE inventory_items SET stock_quantity = stock_quantity + $1 WHERE id = $2', [item.quantity, item.inventory_item_id]); 
        } 
    } 
    await pool.query("UPDATE purchase_orders SET status = 'Received' WHERE id = $1", [po_id]); 
    ResponseHandler.success(res, null, 'Stock received successfully (GRN Processed)');
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
    const result = await pool.query(`SELECT id, name, stock_quantity, price_per_unit, (stock_quantity * price_per_unit) as total_value FROM inventory_items WHERE stock_quantity > 0 AND (hospital_id = $1 OR hospital_id IS NULL) ORDER BY total_value DESC`, [hospitalId]); 
    const items = result.rows; 
    const totalInventoryValue = items.reduce((sum, item) => sum + Number(item.total_value), 0); 
    let cumulativeValue = 0; 
    let a_items = 0, b_items = 0, c_items = 0; 
    let a_value = 0, b_value = 0, c_value = 0; 
    items.forEach(item => { 
        cumulativeValue += Number(item.total_value); 
        const percentage = (cumulativeValue / totalInventoryValue) * 100; 
        if (percentage <= 70) { a_items++; a_value += Number(item.total_value); } 
        else if (percentage <= 90) { b_items++; b_value += Number(item.total_value); } 
        else { c_items++; c_value += Number(item.total_value); } 
    }); 
    ResponseHandler.success(res, { stats: { A: { count: a_items, value: a_value, label: 'Class A (High Value 70%)' }, B: { count: b_items, value: b_value, label: 'Class B (Moderate 20%)' }, C: { count: c_items, value: c_value, label: 'Class C (Low Value 10%)' } }, items: result.rows });
});

// Expiry Report - Multi-Tenant
const getExpiryReport = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const result = await pool.query(`SELECT * FROM inventory_items WHERE expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND (hospital_id = $1 OR hospital_id IS NULL) ORDER BY expiry_date ASC`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Smart Alerts - Multi-Tenant
const getSmartAlerts = asyncHandler(async (req, res) => { 
    const alerts = await SmartInventory.getInventoryAlerts(); 
    ResponseHandler.success(res, alerts);
});

// Recent Dispenses - Multi-Tenant
const getRecentDispenses = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const { days = 30, limit = 100 } = req.query; 
    const result = await pool.query(`SELECT ct.id, ct.patient_id, ct.admission_id, ct.description as medication, ct.completed_at as dispense_date, ct.completed_by, p.name as patient_name, p.phone as patient_phone, u.username as dispensed_by_name, ii.price_per_unit, ii.name as item_name, inv.id as invoice_id, inv.status as invoice_status, inv.total_amount as invoice_total FROM care_tasks ct LEFT JOIN patients p ON ct.patient_id = p.id LEFT JOIN users u ON ct.completed_by = u.id LEFT JOIN inventory_items ii ON LOWER(split_part(ct.description, ' - ', 1)) = LOWER(ii.name) LEFT JOIN invoices inv ON ct.patient_id = inv.patient_id AND inv.generated_at >= ct.completed_at - INTERVAL '1 day' AND inv.generated_at <= ct.completed_at + INTERVAL '1 day' WHERE ct.type = 'Medication' AND ct.status = 'Completed' AND ct.completed_at > NOW() - INTERVAL '${parseInt(days)} days' AND (ct.hospital_id = $1 OR ct.hospital_id IS NULL) ORDER BY ct.completed_at DESC LIMIT ${parseInt(limit)}`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Process Refund - Multi-Tenant
const processRefund = asyncHandler(async (req, res) => {
    const { task_id, item_name, quantity = 1, reason, reason_notes, patient_id, restore_stock = true } = req.body;
    const pharmacist_id = req.user.id;
    const hospitalId = getHospitalId(req);
    
    if (!item_name || !reason) return ResponseHandler.error(res, 'Item name and reason are required', 400); 
    const validReasons = ['wrong_medication', 'adverse_reaction', 'patient_refused', 'duplicate_dispense', 'doctor_cancelled', 'other']; 
    if (!validReasons.includes(reason)) return ResponseHandler.error(res, 'Invalid refund reason', 400);

    const itemRes = await pool.query('SELECT id, price_per_unit, stock_quantity FROM inventory_items WHERE name = $1 AND (hospital_id = $2 OR hospital_id IS NULL)', [item_name, hospitalId]); 
    if (itemRes.rows.length === 0) return ResponseHandler.error(res, 'Item not found in inventory', 404); 
    const item = itemRes.rows[0]; 
    const refund_amount = parseFloat(item.price_per_unit) * quantity;

    let patient_name = 'Unknown'; 
    if (patient_id) { 
        const patientRes = await pool.query('SELECT name FROM patients WHERE id = $1', [patient_id]); 
        if (patientRes.rows.length > 0) patient_name = patientRes.rows[0].name; 
    }
    const pharmacistRes = await pool.query('SELECT username FROM users WHERE id = $1', [pharmacist_id]); 
    const pharmacist_name = pharmacistRes.rows[0]?.username || 'Unknown';

    try {
        await pool.query('BEGIN');
        if (restore_stock) await pool.query('UPDATE inventory_items SET stock_quantity = stock_quantity + $1 WHERE id = $2', [quantity, item.id]);
        if (patient_id) { 
            const invoiceRes = await pool.query('SELECT id FROM invoices WHERE patient_id = $1 AND status = $2 ORDER BY generated_at DESC LIMIT 1', [patient_id, 'Pending']); 
            if (invoiceRes.rows.length > 0) { 
                const invoice_id = invoiceRes.rows[0].id; 
                await pool.query(`INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, hospital_id) VALUES ($1, $2, $3, $4, $5, $6)`, [invoice_id, `REFUND: ${item_name}`, quantity, -parseFloat(item.price_per_unit), -refund_amount, hospitalId]); 
                await pool.query('UPDATE invoices SET total_amount = total_amount - $1 WHERE id = $2', [refund_amount, invoice_id]); 
            } 
        }
        await pool.query(`INSERT INTO pharmacy_refunds (original_task_id, patient_id, patient_name, item_name, quantity, refund_amount, reason, reason_notes, stock_restored, invoice_reversed, processed_by, processed_by_name, status, completed_at, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Completed', NOW(), $13)`, [task_id || null, patient_id || null, patient_name, item_name, quantity, refund_amount, reason, reason_notes || null, restore_stock, patient_id ? true : false, pharmacist_id, pharmacist_name, hospitalId]);
        await pool.query('COMMIT'); 
        console.log(`💰 REFUND PROCESSED: ${item_name} x${quantity} = ₹${refund_amount} [${reason}] by ${pharmacist_name}`); 
        ResponseHandler.success(res, { refund_amount, stock_restored: restore_stock, new_stock: restore_stock ? item.stock_quantity + quantity : item.stock_quantity }, 'Refund processed successfully');
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
    const result = await pool.query(`SELECT csl.*, ii.name as current_stock_name FROM controlled_substance_log csl LEFT JOIN inventory_items ii ON csl.inventory_item_id = ii.id WHERE csl.dispensed_at > NOW() - INTERVAL '${parseInt(days)} days' AND (csl.hospital_id = $1 OR csl.hospital_id IS NULL) ORDER BY csl.dispensed_at DESC LIMIT 500`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

// Refund History - Multi-Tenant
const getRefundHistory = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const { days = 30 } = req.query; 
    const result = await pool.query(`SELECT * FROM pharmacy_refunds WHERE created_at > NOW() - INTERVAL '${parseInt(days)} days' AND (hospital_id = $1 OR hospital_id IS NULL) ORDER BY created_at DESC LIMIT 100`, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});

module.exports = { getInventory, searchInventory, dispense, getPrescriptionQueue, processPrescription, requestPriceChange, getPriceRequests, approvePriceChange, denyPriceChange, getExpiryHeatmap, getDemandForecast, addInventoryItem, deleteInventoryItem, getSuppliers, createPurchaseOrder, receiveStock, getPurchaseOrders, getABCAnalysis, getExpiryReport, getRecentDispenses, processRefund, getRefundHistory, getControlledSubstanceLog, getSmartAlerts };
