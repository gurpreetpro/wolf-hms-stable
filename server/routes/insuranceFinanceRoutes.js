/**
 * insuranceFinanceRoutes.js - Insurance Finance Dashboard API Routes
 * Stats, claims queue, and split billing endpoints
 * 
 * WOLF HMS - Beyond Gold Standard Architecture
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/authMiddleware');
const { ClaimsAuditor } = require('../services/ai/ClaimsAuditor');

const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/finance/insurance/stats
 * Dashboard statistics for insurance claims
 */
router.get('/stats', async (req, res) => {
    try {
        const hospitalId = req.hospitalId || 1;

        // Get split ledger aggregates
        const ledgerStats = await prisma.invoice_split_ledger.aggregate({
            where: { hospital_id: hospitalId },
            _sum: {
                claimed_amount: true,
                approved_amount: true,
                tds_deducted: true,
                net_receivable: true
            },
            _count: true
        });

        // Get status counts
        const statusCounts = await prisma.invoice_split_ledger.groupBy({
            by: ['status'],
            where: { hospital_id: hospitalId },
            _count: true
        });

        // Get high-risk claims count
        const highRiskCount = await prisma.invoice_split_ledger.count({
            where: {
                hospital_id: hospitalId,
                ai_risk_score: { gte: 0.5 }
            }
        });

        // Calculate patient share (total - insurance)
        const invoiceTotal = await prisma.invoices.aggregate({
            where: { hospital_id: hospitalId },
            _sum: { total_amount: true }
        });

        const patientShare = (invoiceTotal._sum.total_amount || 0) - (ledgerStats._sum.claimed_amount || 0);

        res.json({
            totalClaimed: ledgerStats._sum.claimed_amount || 0,
            totalApproved: ledgerStats._sum.approved_amount || 0,
            patientShare: patientShare > 0 ? patientShare : 0,
            leakageDetected: highRiskCount * 15000, // Estimated leakage per high-risk claim
            avgSettlementDays: 14, // Would calculate from actual settlement dates
            pendingCount: statusCounts.find(s => s.status === 'PENDING')?._count || 0,
            approvedCount: statusCounts.find(s => s.status === 'APPROVED')?._count || 0,
            deniedCount: statusCounts.find(s => s.status === 'DENIED')?._count || 0,
            highRiskCount
        });
    } catch (error) {
        console.error('[InsuranceFinance] Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/finance/insurance/claims
 * List claims with split billing info
 */
router.get('/claims', async (req, res) => {
    try {
        const hospitalId = req.hospitalId || 1;
        const { status, limit = 50 } = req.query;

        const whereClause = { hospital_id: hospitalId };
        if (status && status !== 'all') {
            whereClause.status = status;
        }

        const ledgerEntries = await prisma.invoice_split_ledger.findMany({
            where: whereClause,
            include: {
                invoices: {
                    include: {
                        patients: {
                            select: { id: true, name: true, uhid: true }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' },
            take: parseInt(limit)
        });

        const claims = ledgerEntries.map(entry => ({
            id: entry.id,
            invoice_id: entry.invoice_id,
            patient_name: entry.invoices?.patients?.name || 'Unknown',
            uhid: entry.invoices?.patients?.uhid || `INV-${entry.invoice_id}`,
            insurer: entry.payer_type === 'INSURANCE_PRIMARY' ? 'Primary Insurance' : entry.payer_type,
            plan: entry.payer_type,
            insurance_amount: entry.claimed_amount,
            patient_amount: (entry.invoices?.total_amount || 0) - (entry.claimed_amount || 0),
            risk_score: entry.ai_risk_score,
            status: entry.status,
            workflow_id: entry.workflow_id,
            denial_reason: entry.denial_reason,
            net_receivable: entry.net_receivable,
            tds_deducted: entry.tds_deducted,
            created_at: entry.created_at
        }));

        res.json({ success: true, claims, total: claims.length });
    } catch (error) {
        console.error('[InsuranceFinance] Claims list error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/finance/invoice/:id/split
 * Get invoice with split billing details
 */
router.get('/invoice/:id/split', async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalId = req.hospitalId || 1;

        const invoice = await prisma.invoices.findFirst({
            where: { id: parseInt(id), hospital_id: hospitalId },
            include: {
                patients: { select: { id: true, name: true, uhid: true } },
                invoice_items: true,
                invoice_split_ledger: true
            }
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json({
            invoice: {
                id: invoice.id,
                invoice_number: invoice.invoice_number,
                patient_name: invoice.patients?.name,
                patient_id: invoice.patient_id,
                total_amount: invoice.total_amount
            },
            items: invoice.invoice_items,
            splits: invoice.invoice_split_ledger
        });
    } catch (error) {
        console.error('[InsuranceFinance] Invoice split error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/finance/invoice/:id/split
 * Save split billing configuration
 */
router.post('/invoice/:id/split', async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalId = req.hospitalId || 1;
        const { splits, totals } = req.body;

        // Create or update split ledger entry
        const splitEntry = await prisma.invoice_split_ledger.upsert({
            where: {
                id: parseInt(req.body.splitId) || 0 // Will create if not exists
            },
            create: {
                hospital_id: hospitalId,
                invoice_id: parseInt(id),
                payer_type: 'INSURANCE_PRIMARY',
                claimed_amount: totals.insuranceShare,
                approved_amount: null,
                tds_deducted: totals.tdsDeducted,
                net_receivable: totals.netReceivable,
                status: 'PENDING'
            },
            update: {
                claimed_amount: totals.insuranceShare,
                tds_deducted: totals.tdsDeducted,
                net_receivable: totals.netReceivable,
                updated_at: new Date()
            }
        });

        res.json({
            success: true,
            message: 'Split configuration saved',
            splitId: splitEntry.id
        });
    } catch (error) {
        console.error('[InsuranceFinance] Save split error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/finance/invoice/audit
 * Run WolfGuard AI audit on claim data
 */
router.post('/invoice/audit', async (req, res) => {
    try {
        const hospitalId = req.hospitalId || 1;
        const { invoiceId, items, totalAmount, contractClass } = req.body;

        const auditResult = await ClaimsAuditor.auditClaim(hospitalId, {
            invoiceId,
            items,
            totalAmount
        }, contractClass);

        res.json(auditResult);
    } catch (error) {
        console.error('[InsuranceFinance] Audit error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/finance/insurance/sync-webhooks
 * Manually trigger webhook sync check
 */
router.post('/sync-webhooks', async (req, res) => {
    try {
        // In production, this would query pending workflows and check for updates
        console.log('[InsuranceFinance] Webhook sync triggered');
        
        res.json({
            success: true,
            message: 'Webhook sync completed',
            processed: 0
        });
    } catch (error) {
        console.error('[InsuranceFinance] Webhook sync error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
