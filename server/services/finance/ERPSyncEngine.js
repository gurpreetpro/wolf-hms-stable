const { pool } = require('../../config/db');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

/**
 * Enterprise ERP Sync Engine
 * Extracts daily financial ledgers (Invoices, Payments) and maps them 
 * using 'erp_ledger_mappings' to generate a Tally Prime compatible XML.
 */
class ERPSyncEngine {
    
    /**
     * Generate the Tally XML payload for a specific hospital and date
     */
    static async generateTallyXML(hospitalId, dateToSync) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const startOfDay = new Date(dateToSync); startOfDay.setHours(0,0,0,0);
            const endOfDay = new Date(dateToSync); endOfDay.setHours(23,59,59,999);

            // 1. Fetch Ledger Mappings
            const mappingRes = await client.query(
                `SELECT internal_charge, tally_ledger FROM erp_ledger_mappings WHERE hospital_id = $1`,
                [hospitalId]
            );
            const mappings = {};
            mappingRes.rows.forEach(m => {
                mappings[m.internal_charge.toLowerCase()] = m.tally_ledger;
            });

            // 2. Fetch Invoices generated today that haven't been synced
            // We only want 'Paid' or finalized invoices for accounting
            const invoiceRes = await client.query(
                `SELECT i.id as invoice_id, i.total_amount, i.generated_at, i.patient_id, p.name as patient_name
                 FROM invoices i
                 JOIN patients p ON i.patient_id = p.id
                 WHERE i.hospital_id = $1 
                 AND i.generated_at BETWEEN $2 AND $3
                 AND i.erp_synced_at IS NULL
                 AND i.status IN ('Paid', 'Settled')`,
                [hospitalId, startOfDay, endOfDay]
            );

            if (invoiceRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return { xml: null, count: 0, message: 'No new finalized invoices to sync.' };
            }

            // 3. Construct Tally XML Envelope
            let xmlContent = `<?xml version="1.0" ?>\n`;
            xmlContent += `<ENVELOPE>\n`;
            xmlContent += `  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n`;
            xmlContent += `  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>Vouchers</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;

            let syncedInvoiceIds = [];

            // 4. Generate Voucher for each Invoice
            for (const inv of invoiceRes.rows) {
                const voucherDate = format(new Date(inv.generated_at), 'yyyyMMdd');
                
                // Get line items to map to specific ledgers
                const itemsRes = await client.query(
                    `SELECT description, total_price FROM invoice_items WHERE invoice_id = $1`,
                    [inv.invoice_id]
                );

                xmlContent += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
                xmlContent += `          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Accounting Voucher View">\n`;
                xmlContent += `            <DATE>${voucherDate}</DATE>\n`;
                xmlContent += `            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>\n`;
                xmlContent += `            <VOUCHERNUMBER>INV-${inv.invoice_id}</VOUCHERNUMBER>\n`;
                xmlContent += `            <PARTYLEDGERNAME>Cash/Patient</PARTYLEDGERNAME>\n`;
                xmlContent += `            <NARRATION>Hospital Bill for ${inv.patient_name} (ID: ${inv.patient_id})</NARRATION>\n`;

                // Cash/Bank Ledger (Debit) - Total Amount
                xmlContent += `            <ALLLEDGERENTRIES.LIST>\n`;
                xmlContent += `              <LEDGERNAME>Cash Account</LEDGERNAME>\n`;
                xmlContent += `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`; // Debit
                xmlContent += `              <AMOUNT>-${parseFloat(inv.total_amount).toFixed(2)}</AMOUNT>\n`; // Tally requires negative for Debits
                xmlContent += `            </ALLLEDGERENTRIES.LIST>\n`;

                // Credit Ledgers (Revenue Split)
                for (const item of itemsRes.rows) {
                    // Try to find a specific mapped ledger, default to 'General Revenue'
                    // Simple categorization logic for demonstration
                    let category = 'general';
                    if (item.description.toLowerCase().includes('pharmacy') || item.description.toLowerCase().includes('rx')) category = 'pharmacy';
                    if (item.description.toLowerCase().includes('lab') || item.description.toLowerCase().includes('test')) category = 'laboratory';
                    if (item.description.toLowerCase().includes('bed') || item.description.toLowerCase().includes('ward')) category = 'ipd room rent';
                    if (item.description.toLowerCase().includes('consultation')) category = 'opd consultation';

                    const tallyLedger = mappings[category] || 'General Hospital Revenue';

                    xmlContent += `            <ALLLEDGERENTRIES.LIST>\n`;
                    xmlContent += `              <LEDGERNAME>${tallyLedger}</LEDGERNAME>\n`;
                    xmlContent += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`; // Credit
                    xmlContent += `              <AMOUNT>${parseFloat(item.total_price).toFixed(2)}</AMOUNT>\n`;
                    xmlContent += `            </ALLLEDGERENTRIES.LIST>\n`;
                }

                xmlContent += `          </VOUCHER>\n`;
                xmlContent += `        </TALLYMESSAGE>\n`;
                
                syncedInvoiceIds.push(inv.invoice_id);
            }

            xmlContent += `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;

            // 5. Update Invoices as Synced
            const syncTime = new Date();
            const batchId = `SYNC-${syncTime.getTime()}`;
            
            await client.query(
                `UPDATE invoices SET erp_synced_at = $1, erp_reference_id = $2 WHERE id = ANY($3::int[])`,
                [syncTime, batchId, syncedInvoiceIds]
            );

            // 6. Log the Sync
            await client.query(
                `INSERT INTO erp_sync_logs (hospital_id, status, delivery_method, payload_size)
                 VALUES ($1, 'SUCCESS', 'API', $2)`,
                [hospitalId, Buffer.byteLength(xmlContent, 'utf8')]
            );

            await client.query('COMMIT');
            
            return {
                xml: xmlContent,
                count: syncedInvoiceIds.length,
                batchId: batchId,
                message: `Successfully generated XML for ${syncedInvoiceIds.length} invoices.`
            };

        } catch (error) {
            await client.query('ROLLBACK');
            
            // Log failure
            try {
                await pool.query(
                    `INSERT INTO erp_sync_logs (hospital_id, status, delivery_method, failure_reason)
                     VALUES ($1, 'FAILED', 'API', $2)`,
                    [hospitalId, error.message]
                );
            } catch (err) {}

            console.error('[ERPSync] Generation Error:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = ERPSyncEngine;
