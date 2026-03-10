/**
 * Payment Controller
 * WOLF HMS - Multi-Tenant Razorpay Integration
 * Uses hospital-specific credentials from database
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Cache for Razorpay instances per hospital
const razorpayInstances = new Map();

/**
 * Get Razorpay instance for a specific hospital
 * Fetches credentials from database (payment_settings table)
 */
const getRazorpayInstance = async (hospitalId) => {
    // Check cache first
    if (razorpayInstances.has(hospitalId)) {
        return razorpayInstances.get(hospitalId);
    }

    // Fetch credentials from payment_settings table
    const result = await pool.query(`
        SELECT key_id, key_secret, webhook_secret, is_enabled
        FROM payment_settings 
        WHERE hospital_id = $1 AND provider = 'razorpay'
    `, [hospitalId]);

    let keyId, keySecret;

    if (result.rows.length > 0 && result.rows[0].key_id && result.rows[0].is_enabled) {
        // Use hospital-specific credentials
        keyId = result.rows[0].key_id;
        keySecret = result.rows[0].key_secret;
    } else {
        // Fallback to environment variables (for testing/default)
        keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_demo';
        keySecret = process.env.RAZORPAY_KEY_SECRET || 'demo_secret';
    }

    const instance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
    });

    // Cache the instance (clear cache on settings update)
    razorpayInstances.set(hospitalId, { instance, keyId, keySecret });

    return { instance, keyId, keySecret };
};

/**
 * Clear cached Razorpay instance for a hospital (call when settings change)
 */
const clearRazorpayCache = (hospitalId) => {
    razorpayInstances.delete(hospitalId);
};

/**
 * Create Razorpay order for payment
 */
const createOrder = asyncHandler(async (req, res) => {
    const { amount, currency = 'INR', description, invoice_id, patient_id } = req.body;
    const hospitalId = req.hospitalId || 1;

    const { instance, keyId } = await getRazorpayInstance(hospitalId);
    
    const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency,
        receipt: `inv_${invoice_id || Date.now()}`,
        notes: {
            invoice_id: invoice_id?.toString() || '',
            patient_id: patient_id?.toString() || '',
            hospital_id: hospitalId.toString()
        }
    };

    const order = await instance.orders.create(options);

    // Return order with checkout options for frontend
    ResponseHandler.success(res, {
        order,
        options: {
            key: keyId, // Public key for frontend
            amount: order.amount,
            currency: order.currency,
            order_id: order.id,
            name: 'Wolf HMS',
            description: description || `Invoice Payment`,
            prefill: {
                contact: req.body.customer_phone || '',
                email: req.body.customer_email || ''
            },
            theme: {
                color: '#10b981'
            }
        }
    });
});

/**
 * Verify Razorpay payment signature
 */
const verifyPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const hospitalId = req.hospitalId || 1;

    const { keySecret } = await getRazorpayInstance(hospitalId);
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        // Payment verified - optionally record to database here
        ResponseHandler.success(res, { 
            status: 'success', 
            message: 'Payment Verified',
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id
        });
    } else {
        ResponseHandler.error(res, 'Invalid Signature - Payment verification failed', 400);
    }
});

/**
 * Create shareable payment link
 */
const createPaymentLink = asyncHandler(async (req, res) => {
    const { amount, invoice_id, customer_name, customer_phone, customer_email } = req.body;
    const hospitalId = req.hospitalId || 1;

    const { instance } = await getRazorpayInstance(hospitalId);
    
    const paymentLink = await instance.paymentLink.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency: "INR",
        accept_partial: false,
        reference_id: "inv_" + invoice_id,
        description: `Payment for Invoice #${invoice_id}`,
        customer: {
            name: customer_name || 'Patient',
            contact: customer_phone || '',
            email: customer_email || ''
        },
        notify: {
            sms: !!customer_phone,
            email: !!customer_email
        },
        reminder_enable: true,
        notes: {
            invoice_id: invoice_id?.toString() || '',
            hospital_id: hospitalId.toString()
        }
    });

    ResponseHandler.success(res, { 
        paymentLink: paymentLink,
        short_url: paymentLink.short_url,
        shareMessage: `Please pay invoice #${invoice_id} of ₹${amount} using this link: ${paymentLink.short_url}` 
    });
});

/**
 * Generate UPI QR code for payment
 */
const generateQR = asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;
    const hospitalId = req.hospitalId || 1;

    // Fetch hospital UPI ID from settings if available
    const settingsResult = await pool.query(`
        SELECT upi_id FROM hospital_settings WHERE hospital_id = $1
    `, [hospitalId]);

    const upiId = settingsResult.rows[0]?.upi_id || 'wolfhms@icici';

    // Get invoice amount
    const invoiceResult = await pool.query(`
        SELECT total_amount, amount_paid FROM invoices WHERE id = $1
    `, [invoiceId]);

    const balance = invoiceResult.rows[0] 
        ? parseFloat(invoiceResult.rows[0].total_amount) - parseFloat(invoiceResult.rows[0].amount_paid || 0)
        : 100;

    // Generate UPI deep link
    const upiLink = `upi://pay?pa=${upiId}&pn=WolfHMS&tr=${invoiceId}&am=${balance}&cu=INR`;
    
    ResponseHandler.success(res, { 
        upiLink,
        amount: balance,
        // QR code can be generated on frontend using a library like qrcode.react
        qrCodeData: upiLink
    });
});

module.exports = { 
    createOrder, 
    verifyPayment, 
    createPaymentLink, 
    generateQR,
    clearRazorpayCache // Export for use when settings are updated
};
