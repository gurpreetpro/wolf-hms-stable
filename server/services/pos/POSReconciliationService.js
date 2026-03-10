/**
 * POS Reconciliation Service - Multi-Tenant Version
 * Daily reconciliation of POS transactions with provider reports
 * WOLF HMS - Multi-Provider POS Integration
 */

const { pool } = require('../../db');

class POSReconciliationService {
    constructor(posServiceManager) { this.posServiceManager = posServiceManager; }

    // Run full reconciliation for a date - Multi-Tenant
    async runReconciliation(hospitalId, date = null, initiatedBy = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        console.log(`[Reconciliation] Starting for date: ${targetDate}, hospital: ${hospitalId}`);
        const results = { date: targetDate, settlements: [], totalDiscrepancies: 0, totalReconciled: 0 };
        
        const settlements = await pool.query(`SELECT s.*, p.code as provider_code, p.name as provider_name, d.device_name, d.terminal_id FROM pos_settlements s JOIN pos_providers p ON s.provider_id = p.id JOIN pos_devices d ON s.device_id = d.id WHERE s.settlement_date = $1 AND (s.hospital_id = $2 OR s.hospital_id IS NULL)`, [targetDate, hospitalId]);
        
        for (const settlement of settlements.rows) { try { const result = await this.reconcileSettlement(settlement, hospitalId, initiatedBy); results.settlements.push(result); results.totalDiscrepancies += result.discrepancies.length; results.totalReconciled++; } catch (error) { console.error(`[Reconciliation] Error for settlement ${settlement.id}:`, error.message); results.settlements.push({ settlementId: settlement.settlement_id, error: error.message }); } }
        await this.checkUnsettledTransactions(targetDate, hospitalId, results);
        console.log(`[Reconciliation] Complete: ${results.totalReconciled} settlements, ${results.totalDiscrepancies} discrepancies`);
        return results;
    }

    // Reconcile a single settlement - Multi-Tenant
    async reconcileSettlement(settlement, hospitalId, initiatedBy = null) {
        const discrepancies = [];
        const localTxns = await pool.query(`SELECT * FROM pos_transactions WHERE device_id = $1 AND DATE(initiated_at) = $2 AND status IN ('success', 'failed') AND (hospital_id = $3 OR hospital_id IS NULL)`, [settlement.device_id, settlement.settlement_date, hospitalId]);
        
        const localTxnMap = new Map(); localTxns.rows.forEach(txn => { localTxnMap.set(txn.provider_txn_id, txn); });
        
        let providerTxns = []; try { const adapter = this.posServiceManager.getAdapter(settlement.provider_code); if (typeof adapter.getSettlementDetails === 'function') providerTxns = await adapter.getSettlementDetails(settlement.batch_id); } catch (error) { console.warn(`[Reconciliation] Could not fetch provider details:`, error.message); }
        
        const localTotal = localTxns.rows.filter(t => t.status === 'success').reduce((sum, t) => sum + parseFloat(t.total_amount), 0);
        const settlementTotal = parseFloat(settlement.total_sale_amount) || 0;
        
        if (Math.abs(localTotal - settlementTotal) > 1) { discrepancies.push({ type: 'amount_mismatch', localAmount: localTotal, providerAmount: settlementTotal, difference: localTotal - settlementTotal, transactionId: null, description: `Local total ₹${localTotal} vs Settlement ₹${settlementTotal}` }); }
        
        const localSuccessCount = localTxns.rows.filter(t => t.status === 'success').length;
        if (localSuccessCount !== settlement.total_sale_count) { discrepancies.push({ type: 'count_mismatch', localCount: localSuccessCount, providerCount: settlement.total_sale_count, transactionId: null, description: `Local count ${localSuccessCount} vs Settlement count ${settlement.total_sale_count}` }); }
        
        if (providerTxns.length > 0) { const providerTxnMap = new Map(); providerTxns.forEach(txn => providerTxnMap.set(txn.transactionId, txn)); for (const [txnId, localTxn] of localTxnMap) { if (!providerTxnMap.has(txnId)) { discrepancies.push({ type: 'missing_provider', transactionId: localTxn.transaction_id, providerTxnId: txnId, localAmount: parseFloat(localTxn.total_amount), description: `Transaction ${txnId} found locally but not in provider records` }); } } for (const [txnId, providerTxn] of providerTxnMap) { if (!localTxnMap.has(txnId)) { discrepancies.push({ type: 'missing_local', providerTxnId: txnId, providerAmount: providerTxn.amount, description: `Transaction ${txnId} found in provider but not locally` }); } } }
        
        for (const disc of discrepancies) { await pool.query(`INSERT INTO pos_reconciliation_discrepancies (settlement_id, transaction_id, provider_txn_id, discrepancy_type, local_amount, provider_amount, local_status, provider_status, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [settlement.id, disc.transactionId, disc.providerTxnId, disc.type, disc.localAmount, disc.providerAmount, disc.localStatus, disc.providerStatus, hospitalId]); }
        
        await pool.query(`UPDATE pos_settlements SET reconciliation_status = $1, discrepancy_count = $2, reconciled_at = NOW(), reconciled_by = $3 WHERE id = $4`, [discrepancies.length > 0 ? 'discrepancies' : 'matched', discrepancies.length, initiatedBy, settlement.id]);
        
        return { settlementId: settlement.settlement_id, deviceName: settlement.device_name, provider: settlement.provider_name, localTotal, settlementTotal, localCount: localSuccessCount, settlementCount: settlement.total_sale_count, discrepancies, status: discrepancies.length > 0 ? 'discrepancies' : 'matched' };
    }

    // Check for unsettled transactions - Multi-Tenant
    async checkUnsettledTransactions(date, hospitalId, results) {
        const unsettled = await pool.query(`SELECT t.*, d.device_name, p.name as provider_name FROM pos_transactions t JOIN pos_devices d ON t.device_id = d.id JOIN pos_providers p ON t.provider_id = p.id WHERE DATE(t.initiated_at) = $1 AND t.status = 'success' AND t.settlement_id IS NULL AND (t.hospital_id = $2 OR t.hospital_id IS NULL)`, [date, hospitalId]);
        if (unsettled.rows.length > 0) { results.unsettledTransactions = unsettled.rows.map(t => ({ transactionId: t.transaction_id, amount: parseFloat(t.total_amount), device: t.device_name, provider: t.provider_name })); results.totalDiscrepancies += unsettled.rows.length; }
    }

    // Get discrepancies - Multi-Tenant
    async getDiscrepancies(hospitalId, startDate, endDate = null, status = null) {
        let query = `SELECT d.*, s.settlement_date, s.settlement_id, dev.device_name, p.name as provider_name FROM pos_reconciliation_discrepancies d JOIN pos_settlements s ON d.settlement_id = s.id JOIN pos_devices dev ON s.device_id = dev.id JOIN pos_providers p ON s.provider_id = p.id WHERE s.settlement_date >= $1 AND (d.hospital_id = $2 OR d.hospital_id IS NULL)`;
        const params = [startDate, hospitalId];
        if (endDate) { params.push(endDate); query += ` AND s.settlement_date <= $${params.length}`; }
        if (status) { params.push(status); query += ` AND d.resolution_status = $${params.length}`; }
        query += ` ORDER BY s.settlement_date DESC, d.created_at DESC`;
        const result = await pool.query(query, params);
        return result.rows;
    }

    // Resolve discrepancy - Multi-Tenant
    async resolveDiscrepancy(discrepancyId, hospitalId, resolution, notes, resolvedBy) {
        const result = await pool.query(`UPDATE pos_reconciliation_discrepancies SET resolution_status = $1, resolution_notes = $2, resolved_by = $3, resolved_at = NOW() WHERE id = $4 AND (hospital_id = $5 OR hospital_id IS NULL) RETURNING *`, [resolution, notes, resolvedBy, discrepancyId, hospitalId]);
        if (result.rows[0]) { await pool.query(`UPDATE pos_settlements SET discrepancy_count = (SELECT COUNT(*) FROM pos_reconciliation_discrepancies WHERE settlement_id = $1 AND resolution_status = 'open') WHERE id = $1`, [result.rows[0].settlement_id]); }
        return result.rows[0];
    }

    // Reconciliation summary - Multi-Tenant
    async getReconciliationSummary(hospitalId, days = 7) {
        const result = await pool.query(`SELECT s.settlement_date, COUNT(*) as total_settlements, COUNT(CASE WHEN s.reconciliation_status = 'matched' THEN 1 END) as matched, COUNT(CASE WHEN s.reconciliation_status = 'discrepancies' THEN 1 END) as with_discrepancies, COUNT(CASE WHEN s.reconciliation_status = 'pending' THEN 1 END) as pending, SUM(s.discrepancy_count) as total_discrepancies, SUM(s.total_sale_amount) as total_amount FROM pos_settlements s WHERE s.settlement_date >= CURRENT_DATE - $1 AND (s.hospital_id = $2 OR s.hospital_id IS NULL) GROUP BY s.settlement_date ORDER BY s.settlement_date DESC`, [days, hospitalId]);
        return result.rows;
    }

    // Scheduled reconciliation (runs for all hospitals - use in cron)
    async scheduledReconciliation() { const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); const dateStr = yesterday.toISOString().split('T')[0]; console.log(`[Reconciliation] Running scheduled reconciliation for ${dateStr}`); const hospitals = await pool.query('SELECT id FROM hospitals WHERE is_active = true'); const results = []; for (const h of hospitals.rows) { results.push(await this.runReconciliation(h.id, dateStr)); } return results; }
}

module.exports = POSReconciliationService;
