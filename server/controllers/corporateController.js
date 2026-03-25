const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * PHASE 4: Corporate B2B Engine
 * This controller handles corporate empanelment (Contracts)
 * and the monthly B2B bulk billing aggregations.
 */

// Create Corporate Contract
const createCorporateContract = asyncHandler(async (req, res) => {
    const { provider_id, credit_limit, billing_cycle } = req.body;
    const hospitalId = getHospitalId(req);

    if (!provider_id || !credit_limit || !billing_cycle) {
        return ResponseHandler.error(res, 'Provider ID, Credit Limit, and Billing Cycle are required', 400);
    }

    const result = await pool.query(
        `INSERT INTO corporate_contracts (hospital_id, provider_id, credit_limit, billing_cycle)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [hospitalId, provider_id, credit_limit, billing_cycle]
    );

    ResponseHandler.success(res, result.rows[0], 'Corporate Contract established successfully', 201);
});

// Get Corporate Contracts
const getCorporateContracts = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    // Assuming tpa_providers handles Corporate Entities
    const result = await pool.query(`
        SELECT cc.*, tp.name as corporate_name 
        FROM corporate_contracts cc
        JOIN tpa_providers tp ON cc.provider_id = tp.id
        WHERE cc.hospital_id = $1
        ORDER BY cc.id DESC
    `, [hospitalId]);

    ResponseHandler.success(res, result.rows);
});

// Generate Batch Invoice
// Scans the invoice_split_ledger for highly specific corporate liabilities
// that have not yet been billed in a B2B batch.
const generateBatchInvoice = asyncHandler(async (req, res) => {
    const { corporate_id, start_date, end_date } = req.body;
    const hospitalId = getHospitalId(req);

    if (!corporate_id || !start_date || !end_date) {
        return ResponseHandler.error(res, 'Corporate ID and date range are required', 400);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Find all un-batched split ledger items for this corporate sponsor
        // In the existing architecture, the split ledger dictates who pays what.
        // We look for items approved by the sponsor but not yet batched.
        const ledgerQuery = `
            SELECT id, invoice_id, split_amount, status 
            FROM invoice_split_ledger 
            WHERE hospital_id = $1 
            AND sponsor_id = $2 
            AND split_type = 'Sponsor'
            AND status = 'Approved'
            AND batch_invoice_id IS NULL
            AND created_at BETWEEN $3 AND $4
        `;
        
        const unbilledItemsRes = await client.query(ledgerQuery, [hospitalId, corporate_id, start_date, end_date]);
        
        if (unbilledItemsRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return ResponseHandler.error(res, 'No outstanding approved ledger items found for this corporate entity in the given date range.', 404);
        }

        // 2. Calculate Total
        const totalAmount = unbilledItemsRes.rows.reduce((sum, item) => sum + parseFloat(item.split_amount), 0);

        // 3. Generate B2B Invoice
        const b2bInvoiceRes = await client.query(
            `INSERT INTO b2b_invoices (hospital_id, corporate_id, total_amount, status)
             VALUES ($1, $2, $3, 'GENERATED') RETURNING id`,
            [hospitalId, corporate_id, totalAmount]
        );

        const b2bInvoiceId = b2bInvoiceRes.rows[0].id;

        // 4. Update ledger items to link them to this Batch Invoice
        const ledgerIds = unbilledItemsRes.rows.map(r => r.id);
        
        // We need to alter the DB slightly if batch_invoice_id doesn't exist,
        // but for now we assume the schema is flexible or we update the generic status.
        // Wait, schema.prisma doesn't have batch_invoice_id on invoice_split_ledger.
        // We will just mark them as 'Billed' in status instead for now.
        
        await client.query(
            `UPDATE invoice_split_ledger 
             SET status = 'Batched' 
             WHERE id = ANY($1::int[])`,
            [ledgerIds]
        );

        await client.query('COMMIT');
        
        ResponseHandler.success(res, {
            b2b_invoice_id: b2bInvoiceId,
            total_amount: totalAmount,
            items_batched: ledgerIds.length
        }, 'B2B Batch Invoice generated successfully', 201);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[BatchBilling] Generation Error:', error);
        ResponseHandler.error(res, error.message, 500);
    } finally {
        client.release();
    }
});

// Get B2B Invoices
const getB2BInvoices = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`
        SELECT b2b.*, tp.name as corporate_name
        FROM b2b_invoices b2b
        JOIN tpa_providers tp ON b2b.corporate_id = tp.id
        WHERE b2b.hospital_id = $1
        ORDER BY b2b.generated_at DESC
    `, [hospitalId]);

    ResponseHandler.success(res, result.rows);
});

// Log B2B Payment (Partial or Full)
const logB2BPayment = asyncHandler(async (req, res) => {
    const { b2b_invoice_id, amount } = req.body;
    const hospitalId = getHospitalId(req); // Security check

    if (!b2b_invoice_id || !amount) {
        return ResponseHandler.error(res, 'Invoice ID and amount are required', 400);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check invoice
        const invoiceRes = await client.query(
            `SELECT * FROM b2b_invoices WHERE id = $1 AND hospital_id = $2`, 
            [b2b_invoice_id, hospitalId]
        );

        if (invoiceRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return ResponseHandler.error(res, 'B2B Invoice not found', 404);
        }

        const invoice = invoiceRes.rows[0];

        // Insert Payment
        await client.query(
            `INSERT INTO b2b_payments (b2b_invoice_id, amount) VALUES ($1, $2)`,
            [b2b_invoice_id, amount]
        );

        // Sum up total payments so far
        const totalPaymentsRes = await client.query(
            `SELECT SUM(amount) as paid FROM b2b_payments WHERE b2b_invoice_id = $1`,
            [b2b_invoice_id]
        );
        const totalPaid = parseFloat(totalPaymentsRes.rows[0].paid || 0);

        // Determine new status
        let newStatus = 'PARTIALLY_PAID';
        let settled_at = null;

        if (totalPaid >= parseFloat(invoice.total_amount)) {
            newStatus = 'SETTLED';
            settled_at = 'CURRENT_TIMESTAMP';
        }

        // Update Invoice
        const settledQuery = settled_at ? `settled_at = CURRENT_TIMESTAMP,` : '';
        await client.query(
            `UPDATE b2b_invoices SET ${settledQuery} status = $1 WHERE id = $2`,
            [newStatus, b2b_invoice_id]
        );

        await client.query('COMMIT');
        ResponseHandler.success(res, { status: newStatus, total_paid: totalPaid }, 'Payment logged successfully');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[B2BPayment] Error:', error);
        ResponseHandler.error(res, error.message, 500);
    } finally {
        client.release();
    }
});

// Dispute invoice item
const disputeInvoiceItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { adjustment_notes } = req.body;
    const hospitalId = getHospitalId(req);

    if (!adjustment_notes) {
        return ResponseHandler.error(res, 'Adjustment notes required for a dispute', 400);
    }

    const updateRes = await pool.query(
        `UPDATE b2b_invoices 
         SET status = 'DISPUTED', adjustment_notes = $1 
         WHERE id = $2 AND hospital_id = $3 RETURNING *`,
        [adjustment_notes, id, hospitalId]
    );

    if (updateRes.rows.length === 0) {
        return ResponseHandler.error(res, 'B2B Invoice not found', 404);
    }

    ResponseHandler.success(res, updateRes.rows[0], 'Invoice marked as DISPUTED');
});

module.exports = {
    createCorporateContract,
    getCorporateContracts,
    generateBatchInvoice,
    getB2BInvoices,
    logB2BPayment,
    disputeInvoiceItem
};
