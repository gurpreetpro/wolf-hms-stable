/**
 * Wolf HMS - Billing Service
 * 
 * Dedicated microservice for billing operations:
 * - Charge processing
 * - Invoice generation
 * - Payment processing
 * - Insurance claims
 * 
 * Run standalone: node services/billing-service/index.js
 * Port: 5002 (configurable via BILLING_PORT)
 */

const express = require('express');
const cors = require('cors');

// Shared utilities
const shared = require('../shared');
const { db, queue, TOPICS, logger, cache, TTL } = shared;

const app = express();
const PORT = process.env.BILLING_PORT || 5002;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        service: 'wolf-billing',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// CHARGE ROUTES
// ============================================

// Get pending charges for admission
app.get('/api/billing/charges/:admissionId', async (req, res) => {
    try {
        const { admissionId } = req.params;
        const result = await db.replicaPool.query(`
            SELECT * FROM pending_charges 
            WHERE admission_id = $1 AND status = 'Pending'
            ORDER BY created_at DESC
        `, [admissionId]);
        res.json(result.rows);
    } catch (err) {
        logger.error('BILLING', 'Failed to fetch charges', err);
        res.status(500).json({ error: 'Failed to fetch charges' });
    }
});

// Add charge (async via queue)
app.post('/api/billing/charges', async (req, res) => {
    try {
        const messageId = await queue.publish(TOPICS.BILLING, {
            action: 'process_charge',
            ...req.body
        });
        
        res.json({ 
            success: true, 
            message: 'Charge queued for processing',
            messageId 
        });
    } catch (err) {
        logger.error('BILLING', 'Failed to queue charge', err);
        res.status(500).json({ error: 'Failed to queue charge' });
    }
});

// ============================================
// INVOICE ROUTES
// ============================================

// Get invoice
app.get('/api/billing/invoice/:invoiceId', async (req, res) => {
    try {
        const { invoiceId } = req.params;
        
        // Try cache first
        const cacheKey = `invoice:${invoiceId}`;
        let invoice = await cache.get(cacheKey);
        
        if (!invoice) {
            const result = await db.replicaPool.query(`
                SELECT i.*, 
                       a.patient_id, p.name as patient_name,
                       json_agg(pc.*) as items
                FROM invoices i
                JOIN admissions a ON i.admission_id = a.id
                JOIN patients p ON a.patient_id = p.id
                LEFT JOIN pending_charges pc ON pc.invoice_id = i.id
                WHERE i.id = $1
                GROUP BY i.id, a.patient_id, p.name
            `, [invoiceId]);
            
            invoice = result.rows[0];
            if (invoice) {
                await cache.set(cacheKey, invoice, TTL.USER_PROFILE);
            }
        }
        
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        res.json(invoice);
    } catch (err) {
        logger.error('BILLING', 'Failed to fetch invoice', err);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

// Generate invoice (async)
app.post('/api/billing/invoice/generate', async (req, res) => {
    try {
        const messageId = await queue.publish(TOPICS.BILLING, {
            action: 'generate_invoice',
            ...req.body
        });
        
        res.json({ 
            success: true, 
            message: 'Invoice generation queued',
            messageId 
        });
    } catch (err) {
        logger.error('BILLING', 'Failed to queue invoice', err);
        res.status(500).json({ error: 'Failed to queue invoice' });
    }
});

// Record payment
app.post('/api/billing/payment', async (req, res) => {
    const { invoice_id, amount, payment_method, transaction_id, hospital_id } = req.body;
    
    try {
        // Update invoice
        await db.primaryPool.query(`
            UPDATE invoices 
            SET amount_paid = amount_paid + $1,
                status = CASE WHEN amount_paid + $1 >= total_amount THEN 'Paid' ELSE 'Partial' END
            WHERE id = $2
        `, [amount, invoice_id]);
        
        // Log payment
        await db.primaryPool.query(`
            INSERT INTO payment_logs (invoice_id, amount, payment_method, transaction_id, hospital_id, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
        `, [invoice_id, amount, payment_method, transaction_id, hospital_id]).catch(() => {
            // Table might not exist
        });
        
        // Invalidate cache
        await cache.del(`invoice:${invoice_id}`);
        
        logger.info('BILLING', `Payment recorded: ${amount} for invoice ${invoice_id}`);
        
        res.json({ success: true, invoice_id, amount });
    } catch (err) {
        logger.error('BILLING', 'Payment processing failed', err);
        res.status(500).json({ error: 'Payment processing failed' });
    }
});

// ============================================
// BILLING STATS
// ============================================

app.get('/api/billing/stats/:hospitalId', async (req, res) => {
    try {
        const { hospitalId } = req.params;
        
        const cacheKey = `billing-stats:${hospitalId}`;
        let stats = await cache.get(cacheKey);
        
        if (!stats) {
            const result = await db.replicaPool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'Pending') as pending_invoices,
                    COUNT(*) FILTER (WHERE status = 'Paid') as paid_invoices,
                    COALESCE(SUM(total_amount) FILTER (WHERE status = 'Pending'), 0) as pending_amount,
                    COALESCE(SUM(amount_paid), 0) as collected_amount
                FROM invoices 
                WHERE hospital_id = $1 
                AND generated_at >= NOW() - INTERVAL '30 days'
            `, [hospitalId]);
            
            stats = result.rows[0];
            await cache.set(cacheKey, stats, TTL.DASHBOARD);
        }
        
        res.json(stats);
    } catch (err) {
        logger.error('BILLING', 'Failed to fetch stats', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ============================================
// START SERVER
// ============================================

if (require.main === module) {
    // Register billing worker
    const { registerWorkers } = require('../../server/workers/backgroundWorkers');
    registerWorkers();
    
    app.listen(PORT, () => {
        logger.info('BILLING', `Service running on port ${PORT}`);
    });
}

module.exports = { app };
