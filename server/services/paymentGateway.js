/**
 * Razorpay Payment Gateway Service
 * WOLF HMS - Multi-Tenant Payment Integration
 */

// Note: In production, install razorpay: npm install razorpay
// const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../config/db');

class PaymentGatewayService {
    constructor() {
        // Default/fallback credentials from environment
        this.defaultKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_demo';
        this.defaultKeySecret = process.env.RAZORPAY_KEY_SECRET || 'demo_secret';
        
        // Cache for hospital-specific credentials
        this.credentialsCache = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache
    }

    /**
     * Get credentials for a specific hospital (multi-tenant)
     * @param {number} hospitalId - Hospital ID
     * @returns {object} - { keyId, keySecret, webhookSecret }
     */
    async getCredentialsForHospital(hospitalId) {
        // Check cache first
        const cacheKey = `razorpay_${hospitalId}`;
        const cached = this.credentialsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.credentials;
        }
        
        try {
            const result = await pool.query(`
                SELECT key_id, key_secret, webhook_secret, is_enabled, is_production
                FROM payment_settings 
                WHERE hospital_id = $1 AND provider = 'razorpay'
            `, [hospitalId]);
            
            if (result.rows.length > 0 && result.rows[0].is_enabled) {
                const row = result.rows[0];
                const credentials = {
                    keyId: row.key_id || this.defaultKeyId,
                    keySecret: row.key_secret || this.defaultKeySecret,
                    webhookSecret: row.webhook_secret || process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret',
                    isProduction: row.is_production || false
                };
                
                // Cache the credentials
                this.credentialsCache.set(cacheKey, {
                    credentials,
                    timestamp: Date.now()
                });
                
                return credentials;
            }
        } catch (error) {
            console.warn('[PaymentGateway] Failed to load hospital credentials:', error.message);
        }
        
        // Fallback to environment/default credentials
        return {
            keyId: this.defaultKeyId,
            keySecret: this.defaultKeySecret,
            webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret',
            isProduction: false
        };
    }
    
    /**
     * Clear credentials cache for a hospital (call when settings change)
     */
    clearCredentialsCache(hospitalId) {
        this.credentialsCache.delete(`razorpay_${hospitalId}`);
    }

    /**
     * Create a Razorpay order for payment
     * @param {number} amount - Amount in rupees
     * @param {number} invoiceId - Invoice ID
     * @param {string} patientId - Patient UUID
     * @param {object} notes - Additional notes
     * @param {number} hospitalId - Hospital ID for multi-tenant (optional)
     */
    async createOrder(amount, invoiceId, patientId, notes = {}, hospitalId = null) {
        try {
            // Get hospital-specific credentials
            const credentials = hospitalId 
                ? await this.getCredentialsForHospital(hospitalId)
                : { keyId: this.defaultKeyId, keySecret: this.defaultKeySecret };
            
            // Convert to paise (Razorpay uses smallest currency unit)
            const amountInPaise = Math.round(amount * 100);

            // Generate receipt ID
            const receipt = `WOLF_${invoiceId}_${Date.now()}`;

            // Create order options
            const orderOptions = {
                amount: amountInPaise,
                currency: 'INR',
                receipt: receipt,
                notes: {
                    invoice_id: invoiceId,
                    patient_id: patientId,
                    hospital_id: hospitalId,
                    ...notes
                }
            };

            // In production, use actual Razorpay API with hospital credentials
            // const razorpay = new Razorpay({ key_id: credentials.keyId, key_secret: credentials.keySecret });
            // const order = await razorpay.orders.create(orderOptions);

            // Demo mode: Generate mock order
            const mockOrderId = `order_${this._generateId()}`;
            const order = {
                id: mockOrderId,
                entity: 'order',
                amount: amountInPaise,
                amount_paid: 0,
                amount_due: amountInPaise,
                currency: 'INR',
                receipt: receipt,
                status: 'created',
                notes: orderOptions.notes,
                created_at: Math.floor(Date.now() / 1000)
            };

            // Store transaction in database with hospital_id for multi-tenant isolation
            const result = await pool.query(`
                INSERT INTO payment_transactions 
                (invoice_id, patient_id, gateway, gateway_order_id, amount, currency, status, metadata, hospital_id)
                VALUES ($1, $2, 'razorpay', $3, $4, 'INR', 'created', $5, $6)
                RETURNING *
            `, [invoiceId, patientId, order.id, amount, JSON.stringify(orderOptions.notes), hospitalId]);

            return {
                success: true,
                order: order,
                transaction: result.rows[0],
                keyId: credentials.keyId,
                // Checkout options for frontend
                options: {
                    key: credentials.keyId,
                    amount: amountInPaise,
                    currency: 'INR',
                    order_id: order.id,
                    name: 'WOLF HMS',
                    description: `Payment for Invoice #${invoiceId}`,
                    prefill: notes.prefill || {},
                    theme: { color: '#0ea5e9' }
                }
            };

        } catch (error) {
            console.error('[PaymentGateway] Create order error:', error);
            throw error;
        }
    }

    /**
     * Verify Razorpay payment signature
     * @param {string} orderId - Razorpay order ID
     * @param {string} paymentId - Razorpay payment ID
     * @param {string} signature - Razorpay signature
     */
    async verifyPayment(orderId, paymentId, signature) {
        try {
            // First, get the transaction to find hospital_id
            const txnLookup = await pool.query(
                'SELECT hospital_id FROM payment_transactions WHERE gateway_order_id = $1',
                [orderId]
            );
            
            // Get hospital-specific credentials
            const hospitalId = txnLookup.rows[0]?.hospital_id;
            const credentials = hospitalId 
                ? await this.getCredentialsForHospital(hospitalId)
                : { keySecret: this.defaultKeySecret };
            
            // Generate expected signature using hospital-specific secret
            const body = orderId + '|' + paymentId;
            const expectedSignature = crypto
                .createHmac('sha256', credentials.keySecret)
                .update(body)
                .digest('hex');

            const isValid = expectedSignature === signature;

            if (isValid) {
                // Update transaction status
                await pool.query(`
                    UPDATE payment_transactions 
                    SET gateway_payment_id = $1, 
                        gateway_signature = $2,
                        status = 'success',
                        updated_at = NOW()
                    WHERE gateway_order_id = $3
                `, [paymentId, signature, orderId]);

                // Get transaction details
                const txn = await pool.query(
                    'SELECT * FROM payment_transactions WHERE gateway_order_id = $1',
                    [orderId]
                );

                if (txn.rows.length > 0) {
                    // Update invoice - add payment record
                    await this._recordPaymentToInvoice(txn.rows[0]);
                }

                return { success: true, verified: true, transaction: txn.rows[0] };
            }

            // Mark as failed
            await pool.query(`
                UPDATE payment_transactions 
                SET status = 'failed',
                error_description = 'Signature verification failed',
                updated_at = NOW()
            WHERE gateway_order_id = $1
            `, [orderId]);

            return { success: false, verified: false, error: 'Signature verification failed' };

        } catch (error) {
            console.error('[PaymentGateway] Verify payment error:', error);
            throw error;
        }
    }

    /**
     * Handle Razorpay webhook events
     * @param {object} payload - Webhook payload
     * @param {string} signature - Webhook signature
     */
    async handleWebhook(payload, signature) {
        try {
            // Get order_id from payload to determine hospital
            const orderId = payload.payload?.payment?.entity?.order_id ||
                           payload.payload?.order?.entity?.id;
            
            let webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret';
            
            // Try to get hospital-specific webhook secret
            if (orderId) {
                const txnLookup = await pool.query(
                    'SELECT hospital_id FROM payment_transactions WHERE gateway_order_id = $1',
                    [orderId]
                );
                
                if (txnLookup.rows.length > 0 && txnLookup.rows[0].hospital_id) {
                    const credentials = await this.getCredentialsForHospital(txnLookup.rows[0].hospital_id);
                    webhookSecret = credentials.webhookSecret || webhookSecret;
                }
            }
            
            // Verify webhook signature with hospital-specific secret
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(payload))
                .digest('hex');

            if (signature !== expectedSignature) {
                console.warn('[PaymentGateway] Invalid webhook signature');
                return { success: false, error: 'Invalid signature' };
            }

            const event = payload.event;
            const paymentEntity = payload.payload?.payment?.entity;

            console.log(`[PaymentGateway] Webhook received: ${event}`);

            switch (event) {
                case 'payment.captured':
                    await this._handlePaymentCaptured(paymentEntity);
                    break;
                case 'payment.failed':
                    await this._handlePaymentFailed(paymentEntity);
                    break;
                case 'refund.created':
                    await this._handleRefundCreated(payload.payload?.refund?.entity);
                    break;
                default:
                    console.log(`[PaymentGateway] Unhandled event: ${event}`);
            }

            return { success: true, event };

        } catch (error) {
            console.error('[PaymentGateway] Webhook error:', error);
            throw error;
        }
    }

    /**
     * Generate UPI payment link/QR
     * @param {number} amount - Amount in rupees
     * @param {number} invoiceId - Invoice ID  
     * @param {string} patientName - Patient name for reference
     */
    async generateUPILink(amount, invoiceId, patientName) {
        try {
            // Generate UPI deep link
            const upiId = process.env.UPI_MERCHANT_ID || 'wolfhms@icici';
            const merchantName = 'WOLF HMS';
            const transactionNote = `Payment for Invoice ${invoiceId}`;
            const transactionRef = `WOLF${invoiceId}${Date.now()}`;

            // UPI Intent URL format
            const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}&tr=${transactionRef}`;

            // Generate QR code data (base64 or URL)
            const qrData = upiLink;

            // Store QR code
            const result = await pool.query(`
                INSERT INTO payment_qr_codes (invoice_id, qr_data, amount, upi_link, expires_at)
                VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 minutes')
                RETURNING *
            `, [invoiceId, qrData, amount, upiLink]);

            return {
                success: true,
                qrCode: result.rows[0],
                upiLink,
                expiresIn: 1800 // 30 minutes in seconds
            };

        } catch (error) {
            console.error('[PaymentGateway] Generate UPI link error:', error);
            throw error;
        }
    }

    /**
     * Create payment link for sharing via SMS/WhatsApp
     * @param {number} invoiceId - Invoice ID
     * @param {number} amount - Amount
     * @param {object} customer - Customer details
     */
    async createPaymentLink(invoiceId, amount, customer) {
        try {
            // In production, use Razorpay Payment Links API
            // const paymentLink = await this.razorpay.paymentLink.create({...});

            // Demo mode: Generate mock payment link
            const linkId = `plink_${this._generateId()}`;
            const shortUrl = `https://rzp.io/i/${linkId.substring(6)}`;

            const result = await pool.query(`
                INSERT INTO payment_links 
                (invoice_id, link_id, short_url, amount, description, customer_name, customer_phone, customer_email, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '7 days')
                RETURNING *
            `, [invoiceId, linkId, shortUrl, amount,
                `Payment for Invoice #${invoiceId}`,
                customer.name, customer.phone, customer.email]);

            return {
                success: true,
                paymentLink: result.rows[0],
                shareMessage: `Please pay ₹${amount} for your hospital bill. Payment link: ${shortUrl}`
            };

        } catch (error) {
            console.error('[PaymentGateway] Create payment link error:', error);
            throw error;
        }
    }

    /**
     * Initiate refund for a payment
     * @param {string} paymentId - Razorpay payment ID
     * @param {number} amount - Refund amount (optional, full refund if not specified)
     * @param {string} reason - Refund reason
     */
    async initiateRefund(paymentId, amount = null, reason = 'Customer request') {
        try {
            // In production, use Razorpay Refunds API
            // const refund = await this.razorpay.payments.refund(paymentId, { amount, notes: { reason } });

            // Demo mode: Generate mock refund
            const refundId = `rfnd_${this._generateId()}`;

            // Update transaction
            await pool.query(`
                UPDATE payment_transactions 
                SET refund_id = $1,
                refund_amount = $2,
                refund_status = 'pending',
                updated_at = NOW()
            WHERE gateway_payment_id = $3
            `, [refundId, amount, paymentId]);

            return {
                success: true,
                refundId,
                amount,
                status: 'pending'
            };

        } catch (error) {
            console.error('[PaymentGateway] Initiate refund error:', error);
            throw error;
        }
    }

    /**
     * Get payment transaction details
     * @param {number} transactionId - Transaction ID
     */
    async getTransaction(transactionId) {
        const result = await pool.query(
            'SELECT * FROM payment_transactions WHERE id = $1',
            [transactionId]
        );
        return result.rows[0];
    }

    /**
     * Get all transactions for an invoice
     * @param {number} invoiceId - Invoice ID
     */
    async getInvoiceTransactions(invoiceId) {
        const result = await pool.query(
            'SELECT * FROM payment_transactions WHERE invoice_id = $1 ORDER BY created_at DESC',
            [invoiceId]
        );
        return result.rows;
    }

    // ==========================================
    // PRIVATE METHODS
    // ==========================================

    _generateId() {
        return crypto.randomBytes(12).toString('hex');
    }

    async _handlePaymentCaptured(payment) {
        await pool.query(`
            UPDATE payment_transactions 
            SET status = 'captured',
                payment_method = $1,
                card_last4 = $2,
                bank_name = $3,
                webhook_received_at = NOW(),
                updated_at = NOW()
            WHERE gateway_payment_id = $4
        `, [
            payment.method,
            payment.card?.last4,
            payment.bank,
            payment.id
        ]);
    }

    async _handlePaymentFailed(payment) {
        await pool.query(`
            UPDATE payment_transactions 
            SET status = 'failed',
                error_code = $1,
                error_description = $2,
                webhook_received_at = NOW(),
                updated_at = NOW()
            WHERE gateway_order_id = $3
        `, [
            payment.error_code,
            payment.error_description,
            payment.order_id
        ]);
    }

    async _handleRefundCreated(refund) {
        await pool.query(`
            UPDATE payment_transactions 
            SET refund_status = $1,
                updated_at = NOW()
            WHERE gateway_payment_id = $2
        `, [refund.status, refund.payment_id]);
    }

    async _recordPaymentToInvoice(transaction) {
        try {
            const { recordPayment } = require('./billingService');

            await recordPayment({
                invoice_id: transaction.invoice_id,
                amount: transaction.amount,
                payment_mode: 'Online - Razorpay',
                transaction_id: transaction.gateway_payment_id,
                notes: `Gateway: Razorpay | Order: ${transaction.gateway_order_id}`,
                created_by: null, // System event (Webhook)
                hospital_id: transaction.hospital_id
            });

            console.log(`[PaymentGateway] Payment recorded for Invoice #${transaction.invoice_id}`);

        } catch (error) {
            console.error('[PaymentGateway] Record payment error:', error);
        }
    }
}

// Singleton instance
let paymentGatewayInstance = null;

const getPaymentGateway = () => {
    if (!paymentGatewayInstance) {
        paymentGatewayInstance = new PaymentGatewayService();
    }
    return paymentGatewayInstance;
};

module.exports = { PaymentGatewayService, getPaymentGateway };
