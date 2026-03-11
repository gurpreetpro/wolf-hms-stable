const { pool } = require('../db');

/**
 * Add an item to the patient's pending invoice.
 * Automatically creates a new invoice if one doesn't exist.
 * 
 * @param {string|number} patient_id - UUID or ID of the patient
 * @param {number|null} admission_id - ID of the admission (optional)
 * @param {string} description - Item description (e.g. "CBC Test", "Paracetamol")
 * @param {number} quantity - Quantity of items
 * @param {number} unit_price - Price per unit
 * @param {number} userId - ID of the user creating the charge (doctor/pharmacist)
 * @param {number} hospitalId - ID of the hospital (Tenant)
 */
const addToInvoice = async (patient_id, admission_id, description, quantity, unit_price, userId, hospitalId, client = pool) => {
    try {
        const db = client; // Use provided client (transaction) or pool
        // [PMJAY] Check if admission has active PMJAY package (Zero Billing Mode)
        if (admission_id) {
            const pmjayCheck = await db.query(
                `SELECT a.id, a.pmjay_package_code, a.pmjay_package_rate, a.pmjay_verified, a.pmjay_preauth_id,
                        pp.code, pp.name as package_name
                 FROM admissions a
                 LEFT JOIN pmjay_packages pp ON a.pmjay_package_code = pp.code
                 WHERE a.id = $1 AND a.pmjay_verified = true AND a.pmjay_package_code IS NOT NULL`,
                [admission_id]
            );

            if (pmjayCheck.rows.length > 0) {
                const pmjay = pmjayCheck.rows[0];
                console.log(`[PMJAY Billing] 🏥 Item '${description}' covered by PMJAY Package ${pmjay.code} (${pmjay.package_name})`);
                
                // Log usage to PMJAY package tracking
                await db.query(
                    `INSERT INTO pmjay_package_usage 
                     (admission_id, hospital_id, package_code, item_description, quantity, unit_price, tracked_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                    [admission_id, hospitalId, pmjay.code, description, quantity, unit_price]
                );
                
                return { 
                    covered: true, 
                    pmjay: true, 
                    package_code: pmjay.code,
                    package_name: pmjay.package_name,
                    message: 'Item covered under PMJAY - Zero Billing Mode'
                };
            }
        }

        // [PHASE 9] Package Logic: Check if patient has active treatment package
        const activePkg = await db.query(
            `SELECT pp.id, pp.package_id, tp.inclusions 
             FROM patient_packages pp 
             JOIN treatment_packages tp ON pp.package_id = tp.id 
             WHERE pp.patient_id = $1 AND pp.status = 'active' AND pp.admission_id = $2
             LIMIT 1`,
            [patient_id, admission_id]
        );

        if (activePkg.rows.length > 0) {
            const pkg = activePkg.rows[0];
            const inclusions = pkg.inclusions || []; // Array of strings e.g., ["CBC", "Consultation"]
            
            // Check if Item is covered
            // Logic: Simple string match or category match. 
            // For MVP: Check if description contains any inclusion keyword
            const isCovered = inclusions.some(inc => description.toLowerCase().includes(inc.toLowerCase()));

            if (isCovered) {
                console.log(`[Billing] 📦 Item '${description}' covered by Package #${pkg.id}`);
                // Verify limits? (e.g. 10 Dialysis sessions). 
                // For now, we assume if it's in inclusion, it's covered (Unlimited or tracked elsewhere)
                // We DO NOT add to invoice. We log usage.
                
                await db.query(
                    `INSERT INTO package_usage_log (patient_package_id, item_description, quantity, unit_price, used_at)
                     VALUES ($1, $2, $3, $4, NOW())`,
                    [pkg.id, description, quantity, unit_price]
                );
                return { covered: true, package_id: pkg.id };
            }
        }

        const total_item_price = quantity * unit_price;
        let invoice_id = null;

        // 1. Find existing pending invoice (Scoped to Hospital)
        let query = '';
        let params = [];

        if (admission_id) {
            query = `SELECT id FROM invoices WHERE admission_id = $1 AND status = 'Pending' AND hospital_id = $2 LIMIT 1`;
            params = [admission_id, hospitalId];
        } else {
            query = `SELECT id FROM invoices WHERE patient_id = $1 AND admission_id IS NULL AND status = 'Pending' AND hospital_id = $2 LIMIT 1`;
            params = [patient_id, hospitalId];
        }

        const invoiceRes = await db.query(query, params);

        if (invoiceRes.rows.length > 0) {
            invoice_id = invoiceRes.rows[0].id;
        } else {
            // 2. Create new invoice if not found
            const insertQuery = `
                INSERT INTO invoices (patient_id, admission_id, total_amount, status, generated_by, hospital_id)
                VALUES ($1, $2, 0, 'Pending', $3, $4)
                RETURNING id
            `;
            const newInvoice = await db.query(insertQuery, [patient_id, admission_id, userId, hospitalId]);
            invoice_id = newInvoice.rows[0].id;
        }

        // 3. Add Line Item
        await db.query(
            `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
             VALUES ($1, $2, $3, $4, $5)`,
            [invoice_id, description, quantity, unit_price, total_item_price]
        );

        // 4. Update Invoice Total
        await db.query(
            `UPDATE invoices SET total_amount = total_amount + $1 WHERE id = $2`,
            [total_item_price, invoice_id]
        );

        console.log(`[Billing] Added ${description} (${total_item_price}) to Invoice #${invoice_id} [Hospital: ${hospitalId}]`);
        return invoice_id;

    } catch (error) {
        console.error('[BillingService] Error adding to invoice:', error);
        // We don't throw here to avoid failing the clinical transaction, 
        // but in a strict financial system, we might want to.
        return null;
    }
};

/**
 * Record a payment and automatically update invoice status.
 * Handles partial, full, and excess payments.
 * 
 * @param {Object} paymentData - { invoice_id, patient_id, amount, payment_mode, transaction_id, created_by, hospital_id, notes, visit_id }
 * @returns {Object} Created payment record
 */
const recordPayment = async (paymentData, client = pool) => {
    const { invoice_id, patient_id, amount, payment_mode, transaction_id, created_by, hospital_id, notes, visit_id } = paymentData;
    const db = client;
    
    // 1. Record the Payment
    const paymentRes = await db.query(
        `INSERT INTO payments 
         (invoice_id, patient_id, amount, payment_mode, transaction_id, created_by, hospital_id, notes, visit_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Completed')
         RETURNING *`,
        [invoice_id, patient_id, amount, payment_mode, transaction_id, created_by, hospital_id, notes, visit_id]
    );
    const payment = paymentRes.rows[0];

    // 2. Update Invoice Status
    if (invoice_id) {
        // Fetch current invoice state
        const invRes = await db.query('SELECT total_amount, amount_paid FROM invoices WHERE id = $1', [invoice_id]);
        
        if (invRes.rows.length > 0) {
            const invoice = invRes.rows[0];
            
            // Calculate new paid amount
            const currentPaid = parseFloat(invoice.amount_paid || 0);
            const newPaid = currentPaid + parseFloat(amount);
            
            // Determine Status
            const total = parseFloat(invoice.total_amount);
            let newStatus = 'Pending';
            if (newPaid >= total) newStatus = 'Paid';
            else if (newPaid > 0) newStatus = 'Partially Paid';
            
            // Update Invoice (Strict Multi-Tenant Check)
            if (hospital_id) {
                await db.query(
                    `UPDATE invoices SET amount_paid = $1, status = $2 WHERE id = $3 AND (hospital_id = $4)`,
                    [newPaid, newStatus, invoice_id, hospital_id]
                );
            } else {
                 await db.query(
                    `UPDATE invoices SET amount_paid = $1, status = $2 WHERE id = $3`,
                    [newPaid, newStatus, invoice_id]
                );
            }
            
            console.log(`[Billing] Payment recorded. Invoice #${invoice_id} status: ${newStatus} (Paid: ${newPaid}/${total})`);
        }
    }
    
    return payment;
};

module.exports = { addToInvoice, recordPayment };
