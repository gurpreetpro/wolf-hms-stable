/**
 * auditExportRoutes.js — Super-Admin HIPAA Audit Export Endpoint
 * 
 * Part of Wolf HMS Phase 5 Hardening (W2).
 * Exposes GET /api/admin/audit/export with streaming CSV export and cryptographic hash verification.
 * Strictly restricted to role === 'super_admin'.
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');
const { verifyChain } = require('../utils/auditChain');

/**
 * Escapes values for standard RFC 4180 CSV
 */
function escapeCsvValue(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * GET /api/admin/audit/export
 * Query params: from (ISO date or YYYY-MM-DD), to (ISO date or YYYY-MM-DD), format (csv|json), verify (true|false)
 * Restricted to super_admin only.
 */
router.get('/export', protect, authorize('super_admin'), async (req, res) => {
    try {
        const fromDate = req.query.from || req.query.from_date;
        const toDate = req.query.to || req.query.to_date;
        const format = (req.query.format || 'csv').toLowerCase();
        const shouldVerify = req.query.verify === 'true';

        let query = `
            SELECT 
                id, 
                created_at, 
                user_id, 
                action, 
                COALESCE(resource_type, entity_type, 'unknown') AS resource_type, 
                COALESCE(resource_id, entity_id, '') AS resource_id, 
                prev_hash, 
                record_hash
            FROM audit_logs
            WHERE 1=1
        `;
        const params = [];
        let pIdx = 1;

        if (fromDate) {
            query += ` AND created_at >= $${pIdx++}`;
            params.push(new Date(fromDate).toISOString());
        }

        if (toDate) {
            query += ` AND created_at <= $${pIdx++}`;
            params.push(new Date(toDate).toISOString());
        }

        query += ` ORDER BY created_at ASC, id ASC LIMIT 50000`;

        const result = await pool.query(query, params);
        const rows = result.rows;

        let verificationResult = null;
        if (shouldVerify) {
            verificationResult = verifyChain(rows);
        }

        if (format === 'json') {
            return res.json({
                success: true,
                count: rows.length,
                verification: verificationResult,
                data: rows
            });
        }

        // CSV Export format
        const headers = [
            'id',
            'timestamp',
            'user_id',
            'action',
            'resource_type',
            'resource_id',
            'prev_hash',
            'record_hash'
        ];

        const csvRows = [headers.join(',')];

        for (const r of rows) {
            const rowFields = [
                escapeCsvValue(r.id),
                escapeCsvValue(r.created_at ? new Date(r.created_at).toISOString() : ''),
                escapeCsvValue(r.user_id),
                escapeCsvValue(r.action),
                escapeCsvValue(r.resource_type),
                escapeCsvValue(r.resource_id),
                escapeCsvValue(r.prev_hash || 'GENESIS'),
                escapeCsvValue(r.record_hash || '')
            ];
            csvRows.push(rowFields.join(','));
        }

        const csvContent = csvRows.join('\r\n');
        const filenameDate = new Date().toISOString().split('T')[0];

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="hipaa_audit_export_${filenameDate}.csv"`);
        if (verificationResult) {
            res.setHeader('X-Audit-Chain-Valid', String(verificationResult.valid));
        }

        return res.status(200).send(csvContent);
    } catch (err) {
        console.error('[AuditExport] Export failed:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to export audit logs: ' + err.message
        });
    }
});

module.exports = router;
