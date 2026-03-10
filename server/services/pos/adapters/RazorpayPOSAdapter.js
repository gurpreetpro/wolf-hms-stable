/**
 * Razorpay POS Adapter
 * Card and UPI payment terminal integration
 * Uses existing Razorpay infrastructure
 */

const BasePOSAdapter = require('../BasePOSAdapter');
const axios = require('axios');
const crypto = require('crypto');

class RazorpayPOSAdapter extends BasePOSAdapter {
    constructor() {
        super('razorpay', 'Razorpay POS');
        this.apiUrl = 'https://api.razorpay.com/v1';
        this.keyId = null;
        this.keySecret = null;
    }

    async initialize(credentials) {
        this.keyId = credentials.key_id || process.env.RAZORPAY_KEY_ID;
        this.keySecret = credentials.key_secret || process.env.RAZORPAY_KEY_SECRET;
        this.isProduction = !this.keyId?.startsWith('rzp_test');
        this.isInitialized = true;
        this.log('Initialized', { keyId: this.keyId?.substr(0, 12) + '...', isProduction: this.isProduction });
    }

    getAuth() {
        return {
            username: this.keyId,
            password: this.keySecret
        };
    }

    async initiatePayment(device, invoiceId, amount, options = {}) {
        this.validateDevice(device);

        const orderId = `order_${Date.now()}${Math.random().toString(36).substr(2, 6)}`;

        try {
            // Demo mode
            if (!this.keyId || !this.keySecret) {
                return this.simulatePaymentInitiation(orderId, amount);
            }

            // Create Razorpay order
            const orderPayload = {
                amount: this.formatAmountToPaise(amount),
                currency: 'INR',
                receipt: `INV-${invoiceId}`,
                notes: {
                    invoice_id: invoiceId.toString(),
                    terminal_id: device.terminal_id,
                    department: options.department || device.department
                }
            };

            const orderResponse = await axios.post(
                `${this.apiUrl}/orders`,
                orderPayload,
                { auth: this.getAuth(), timeout: 30000 }
            );

            // For POS, generate payment link or QR
            const linkPayload = {
                amount: this.formatAmountToPaise(amount),
                currency: 'INR',
                description: `Payment for Invoice #${invoiceId}`,
                customer: {
                    name: options.customerName || 'Patient',
                    contact: options.customerPhone,
                    email: options.customerEmail
                },
                notify: {
                    sms: !!options.customerPhone,
                    email: !!options.customerEmail
                },
                reminder_enable: false,
                notes: orderPayload.notes
            };

            const linkResponse = await axios.post(
                `${this.apiUrl}/payment_links`,
                linkPayload,
                { auth: this.getAuth() }
            );

            return {
                providerTxnId: orderResponse.data.id,
                status: 'initiated',
                message: 'Payment initiated',
                orderId: orderResponse.data.id,
                paymentLink: linkResponse.data.short_url,
                qrCode: linkResponse.data.short_url // Can be used to generate QR
            };
        } catch (error) {
            this.log('Payment initiation failed', { error: error.message });
            throw new Error(`Razorpay: ${error.response?.data?.error?.description || error.message}`);
        }
    }

    async checkStatus(providerTxnId) {
        this.log('Checking status', { providerTxnId });

        try {
            // Demo mode
            if (!this.keyId || !this.keySecret) {
                return this.simulateStatusCheck(providerTxnId);
            }

            // Check order payments
            const response = await axios.get(
                `${this.apiUrl}/orders/${providerTxnId}/payments`,
                { auth: this.getAuth(), timeout: 15000 }
            );

            const payments = response.data.items;
            if (payments.length === 0) {
                return {
                    status: 'pending',
                    responseCode: 'NO_PAYMENT',
                    responseMessage: 'Waiting for payment'
                };
            }

            const payment = payments[0];
            return {
                status: this.mapRazorpayStatus(payment.status),
                responseCode: payment.error_code || 'SUCCESS',
                responseMessage: payment.error_description || 'Payment captured',
                cardType: payment.card?.type,
                cardNetwork: payment.card?.network,
                cardLastFour: payment.card?.last4,
                paymentMethod: payment.method,
                raw: payment
            };
        } catch (error) {
            throw new Error(`Razorpay status check failed: ${error.message}`);
        }
    }

    mapRazorpayStatus(razorpayStatus) {
        const statusMap = {
            'captured': 'success',
            'authorized': 'success',
            'failed': 'failed',
            'refunded': 'refunded',
            'created': 'pending'
        };
        return statusMap[razorpayStatus] || 'unknown';
    }

    async cancel(providerTxnId) {
        this.log('Cancelling', { providerTxnId });

        // Razorpay doesn't have explicit cancel - order expires
        return {
            success: true,
            message: 'Order will expire automatically'
        };
    }

    async refund(providerTxnId, amount = null, reason = '') {
        this.log('Initiating refund', { providerTxnId, amount, reason });

        try {
            if (!this.keyId || !this.keySecret) {
                return {
                    refundId: `rfnd_${Date.now()}`,
                    status: 'initiated',
                    message: 'Refund initiated (demo)'
                };
            }

            // Get payment ID from order
            const paymentsRes = await axios.get(
                `${this.apiUrl}/orders/${providerTxnId}/payments`,
                { auth: this.getAuth() }
            );

            if (paymentsRes.data.items.length === 0) {
                throw new Error('No payment found for this order');
            }

            const paymentId = paymentsRes.data.items[0].id;

            const refundPayload = {
                notes: { reason }
            };
            if (amount) {
                refundPayload.amount = this.formatAmountToPaise(amount);
            }

            const response = await axios.post(
                `${this.apiUrl}/payments/${paymentId}/refund`,
                refundPayload,
                { auth: this.getAuth() }
            );

            return {
                refundId: response.data.id,
                status: 'success',
                message: 'Refund processed'
            };
        } catch (error) {
            throw new Error(`Razorpay refund failed: ${error.message}`);
        }
    }

    async void(providerTxnId) {
        // Use refund for void
        return this.refund(providerTxnId, null, 'Void same day');
    }

    async settlement(terminalId) {
        // Razorpay handles settlement automatically
        return {
            batchId: `AUTO_${Date.now()}`,
            transactionCount: 0,
            totalAmount: 0,
            status: 'auto',
            message: 'Razorpay settles automatically to your bank account'
        };
    }

    async testConnection(device) {
        const startTime = Date.now();

        try {
            if (!this.keyId || !this.keySecret) {
                await new Promise(resolve => setTimeout(resolve, 200));
                return {
                    success: true,
                    latency: Date.now() - startTime,
                    message: 'Connection successful (demo mode)'
                };
            }

            // Test with a simple API call
            await axios.get(
                `${this.apiUrl}/payments?count=1`,
                { auth: this.getAuth(), timeout: 10000 }
            );

            return {
                success: true,
                latency: Date.now() - startTime,
                message: 'Razorpay API connected'
            };
        } catch (error) {
            return {
                success: false,
                latency: Date.now() - startTime,
                message: `Connection failed: ${error.message}`
            };
        }
    }

    async handleWebhook(payload, signature) {
        const expectedSignature = crypto
            .createHmac('sha256', this.keySecret)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (signature !== expectedSignature) {
            return { valid: false, event: null, data: null };
        }

        const event = payload.event;
        const payment = payload.payload?.payment?.entity;

        return {
            valid: true,
            event: event,
            data: payment ? {
                transactionId: payment.order_id,
                paymentId: payment.id,
                status: this.mapRazorpayStatus(payment.status),
                amount: this.formatPaiseToAmount(payment.amount),
                method: payment.method,
                cardLastFour: payment.card?.last4
            } : null
        };
    }

    // Demo mode simulation
    simulatePaymentInitiation(orderId, amount) {
        return {
            providerTxnId: orderId,
            status: 'initiated',
            message: 'Payment initiated (demo mode)',
            paymentLink: `https://rzp.io/demo/${orderId}`,
            qrCode: `https://rzp.io/demo/${orderId}`
        };
    }

    simulateStatusCheck(providerTxnId) {
        const statuses = ['success', 'success', 'pending', 'failed'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        return {
            status,
            responseCode: status === 'success' ? 'SUCCESS' : status === 'failed' ? 'FAILED' : 'PENDING',
            responseMessage: status === 'success' ? 'Payment captured' : status === 'failed' ? 'Payment failed' : 'Awaiting payment',
            cardNetwork: 'visa',
            cardLastFour: '4242',
            paymentMethod: 'card',
            raw: { demo: true }
        };
    }

    getCapabilities() {
        return {
            provider: this.providerCode,
            name: this.providerName,
            features: {
                card: true,
                upi: true,
                emi: false,
                nfc: true,
                qr: true,
                payment_links: true,
                refund: true,
                settlement: false,
                webhook: true
            }
        };
    }
}

module.exports = RazorpayPOSAdapter;
