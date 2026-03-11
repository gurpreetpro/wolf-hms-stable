/**
 * HCX Webhook Controller
 * Handles asynchronous callbacks from National Health Claims Exchange
 * Routes events based on 'x-hcx-correlation-id' to the correct Hospital Tenant
 */

const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const InsuranceFactory = require('../services/insurance/InsuranceFactory');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// 1. Webhook Entry Point
const handleWebhook = asyncHandler(async (req, res) => {
    const correlationId = req.headers['x-hcx-correlation-id'];
    const signature = req.headers['x-hcx-signature'];
    const payload = req.body;

    if (!correlationId) {
        return ResponseHandler.error(res, 'Missing Correlation ID', 400);
    }

    // 2. Reverse Lookup: Find which Invoice/Hospital owns this flow
    const ledgerEntry = await prisma.InvoiceSplitLedger.findFirst({
        where: { workflowId: correlationId }
    });

    if (!ledgerEntry) {
        console.warn(`[Webhook] ⚠️ Orphaned Event: ${correlationId} - No matching ledger entry.`);
        return ResponseHandler.error(res, 'Unknown Workflow Transaction', 404);
    }

    const { hospitalId, invoiceId } = ledgerEntry;

    // 3. Context Switch: Load the correct Adapter for this Tenant
    const provider = await InsuranceFactory.getProvider(hospitalId, 'HCX');

    // 4. Decrypt & Verify Signature via Adapter
    const validation = await provider.handleWebhook(payload, signature);

    if (!validation.valid) {
        console.error(`[Webhook] ⛔ Signature Mismatch: ${hospitalId}`);
        return ResponseHandler.error(res, 'Invalid Signature', 401);
    }

    // 5. Update Ledger State
    const { status, amount } = validation.data;

    let internalStatus = ledgerEntry.status;
    if (status === 'response.complete') internalStatus = 'APPROVED';
    if (status === 'error') internalStatus = 'DENIED';

    await prisma.InvoiceSplitLedger.update({
        where: { id: ledgerEntry.id },
        data: {
            status: internalStatus,
            approvedAmount: amount || ledgerEntry.approvedAmount,
            denialReason: validation.data.error_message || null
        }
    });

    // 6. Real-time Notification (Socket.IO)
    if (req.io) {
        req.io.to(`hosp_${hospitalId}_insurance`).emit('claim_update', {
            invoiceId,
            status: internalStatus,
            message: `Claim update received`
        });
    }

    // 7. Ack to HCX
    res.status(200).json({ timestamp: new Date(), status: 'ack' });
});

// Mount route
router.post('/', handleWebhook);

module.exports = router;
