/**
 * Pine Labs POS Adapter
 * Enterprise-grade EDC terminal integration
 * API Documentation: https://developer.pinelabs.com
 */

const BasePOSAdapter = require('../BasePOSAdapter');
const axios = require('axios');
const crypto = require('crypto');

class PineLabsAdapter extends BasePOSAdapter {
    constructor() {
        super('pine_labs', 'Pine Labs');
        this.apiUrl = process.env.PINELABS_API_URL || 'https://api.pluralonline.com';
        this.merchantId = null;
        this.securityToken = null;
    }

    async initialize(credentials) {
        this.merchantId = credentials.merchant_id || process.env.PINELABS_MERCHANT_ID;
        this.securityToken = credentials.security_token || process.env.PINELABS_SECURITY_TOKEN;
        this.isProduction = credentials.isProduction || process.env.NODE_ENV === 'production';

        if (!this.isProduction) {
            // Sandbox URL
            this.apiUrl = 'https://sandbox.pluralonline.com';
        }

        this.isInitialized = true;
        this.log('Initialized', { merchantId: this.merchantId, isProduction: this.isProduction });
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.securityToken}`,
            'X-Merchant-Id': this.merchantId
        };
    }

    async initiatePayment(device, invoiceId, amount, options = {}) {
        this.validateDevice(device);

        const transactionId = this.generateTransactionId();

        const payload = {
            MerchantID: device.merchant_id || this.merchantId,
            TerminalID: device.terminal_id,
            TransactionType: options.emi ? 'EMI_SALE' : 'SALE',
            Amount: this.formatAmountToPaise(amount),
            BillNumber: invoiceId.toString(),
            TransactionID: transactionId,
            CustomerMobile: options.customerPhone || '',
            CustomerEmail: options.customerEmail || '',
            Notes: options.notes || `Invoice #${invoiceId}`
        };

        // Add EMI options if applicable
        if (options.emi) {
            payload.EMI = {
                Tenure: options.emiTenure,
                BankCode: options.emiBank,
                PlanID: options.emiPlanId
            };
        }

        this.log('Initiating Payment', payload);

        try {
            // In demo mode, simulate response
            if (!this.isProduction && !this.securityToken) {
                return this.simulatePaymentInitiation(transactionId, amount);
            }

            const response = await axios.post(
                `${this.apiUrl}/v1/transaction/initiate`,
                payload,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            return {
                providerTxnId: response.data.TransactionId || transactionId,
                status: 'initiated',
                message: 'Payment initiated on Pine Labs terminal',
                terminalMessage: response.data.TerminalMessage
            };
        } catch (error) {
            this.log('Payment initiation failed', { error: error.message });
            throw new Error(`Pine Labs: ${error.response?.data?.message || error.message}`);
        }
    }

    async checkStatus(providerTxnId) {
        this.log('Checking status', { providerTxnId });

        try {
            // Demo mode simulation
            if (!this.isProduction && !this.securityToken) {
                return this.simulateStatusCheck(providerTxnId);
            }

            const response = await axios.get(
                `${this.apiUrl}/v1/transaction/${providerTxnId}/status`,
                { headers: this.getHeaders(), timeout: 15000 }
            );

            const data = response.data;
            return {
                status: this.mapStatus(data.Status),
                responseCode: data.ResponseCode,
                responseMessage: data.ResponseMessage,
                cardType: data.CardType,
                cardNetwork: data.CardScheme,
                cardLastFour: data.CardLastFour,
                authCode: data.AuthCode,
                rrn: data.RRN,
                batchNumber: data.BatchNumber,
                raw: data
            };
        } catch (error) {
            throw new Error(`Pine Labs status check failed: ${error.message}`);
        }
    }

    async cancel(providerTxnId) {
        this.log('Cancelling transaction', { providerTxnId });

        try {
            if (!this.isProduction && !this.securityToken) {
                return { success: true, message: 'Transaction cancelled (demo)' };
            }

            const response = await axios.post(
                `${this.apiUrl}/v1/transaction/${providerTxnId}/cancel`,
                {},
                { headers: this.getHeaders() }
            );

            return {
                success: response.data.Status === 'CANCELLED',
                message: response.data.Message || 'Transaction cancelled'
            };
        } catch (error) {
            throw new Error(`Pine Labs cancel failed: ${error.message}`);
        }
    }

    async refund(providerTxnId, amount = null, reason = '') {
        this.log('Initiating refund', { providerTxnId, amount, reason });

        try {
            if (!this.isProduction && !this.securityToken) {
                return {
                    refundId: `REF${Date.now()}`,
                    status: 'initiated',
                    message: 'Refund initiated (demo)'
                };
            }

            const payload = {
                OriginalTransactionId: providerTxnId,
                RefundReason: reason
            };

            if (amount) {
                payload.RefundAmount = this.formatAmountToPaise(amount);
            }

            const response = await axios.post(
                `${this.apiUrl}/v1/refund/initiate`,
                payload,
                { headers: this.getHeaders() }
            );

            return {
                refundId: response.data.RefundId,
                status: this.mapStatus(response.data.Status),
                message: response.data.Message
            };
        } catch (error) {
            throw new Error(`Pine Labs refund failed: ${error.message}`);
        }
    }

    async void(providerTxnId) {
        this.log('Voiding transaction', { providerTxnId });

        try {
            if (!this.isProduction && !this.securityToken) {
                return { success: true, message: 'Transaction voided (demo)' };
            }

            const response = await axios.post(
                `${this.apiUrl}/v1/transaction/${providerTxnId}/void`,
                {},
                { headers: this.getHeaders() }
            );

            return {
                success: response.data.Status === 'VOIDED',
                message: response.data.Message
            };
        } catch (error) {
            throw new Error(`Pine Labs void failed: ${error.message}`);
        }
    }

    async settlement(terminalId) {
        this.log('Triggering settlement', { terminalId });

        try {
            if (!this.isProduction && !this.securityToken) {
                return {
                    batchId: `BATCH${Date.now()}`,
                    transactionCount: Math.floor(Math.random() * 20) + 5,
                    totalAmount: Math.floor(Math.random() * 100000) + 10000,
                    status: 'initiated',
                    message: 'Settlement initiated (demo)'
                };
            }

            const response = await axios.post(
                `${this.apiUrl}/v1/settlement/initiate`,
                { TerminalId: terminalId },
                { headers: this.getHeaders() }
            );

            return {
                batchId: response.data.BatchId,
                transactionCount: response.data.TransactionCount,
                totalAmount: this.formatPaiseToAmount(response.data.TotalAmount),
                status: 'initiated',
                message: response.data.Message
            };
        } catch (error) {
            throw new Error(`Pine Labs settlement failed: ${error.message}`);
        }
    }

    async testConnection(device) {
        this.log('Testing connection', { terminalId: device.terminal_id });

        const startTime = Date.now();

        try {
            if (!this.isProduction && !this.securityToken) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulate latency
                return {
                    success: true,
                    latency: Date.now() - startTime,
                    message: 'Connection successful (demo mode)'
                };
            }

            const response = await axios.get(
                `${this.apiUrl}/v1/terminal/${device.terminal_id}/status`,
                { headers: this.getHeaders(), timeout: 10000 }
            );

            return {
                success: response.data.Online === true,
                latency: Date.now() - startTime,
                message: response.data.Online ? 'Terminal online' : 'Terminal offline',
                firmwareVersion: response.data.FirmwareVersion
            };
        } catch (error) {
            return {
                success: false,
                latency: Date.now() - startTime,
                message: `Connection failed: ${error.message}`
            };
        }
    }

    async getEMIOffers(amount, cardBin = null) {
        try {
            if (!this.isProduction && !this.securityToken) {
                return [
                    { tenure: 3, bank: 'HDFC', interestRate: 0, emiAmount: amount / 3 },
                    { tenure: 6, bank: 'HDFC', interestRate: 12, emiAmount: amount / 6 * 1.06 },
                    { tenure: 12, bank: 'ICICI', interestRate: 14, emiAmount: amount / 12 * 1.07 }
                ];
            }

            const response = await axios.get(
                `${this.apiUrl}/v1/emi/offers?amount=${this.formatAmountToPaise(amount)}${cardBin ? `&bin=${cardBin}` : ''}`,
                { headers: this.getHeaders() }
            );

            return response.data.Offers.map(offer => ({
                tenure: offer.Tenure,
                bank: offer.BankName,
                interestRate: offer.InterestRate,
                emiAmount: this.formatPaiseToAmount(offer.EMIAmount),
                processingFee: this.formatPaiseToAmount(offer.ProcessingFee || 0)
            }));
        } catch (error) {
            this.log('EMI offers fetch failed', { error: error.message });
            return [];
        }
    }

    async handleWebhook(payload, signature) {
        // Verify signature
        const computedSignature = crypto
            .createHmac('sha256', this.securityToken)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (signature !== computedSignature) {
            return { valid: false, event: null, data: null };
        }

        return {
            valid: true,
            event: payload.Event,
            data: {
                transactionId: payload.TransactionId,
                status: this.mapStatus(payload.Status),
                amount: this.formatPaiseToAmount(payload.Amount),
                cardLastFour: payload.CardLastFour,
                authCode: payload.AuthCode,
                rrn: payload.RRN
            }
        };
    }

    // Demo mode simulation helpers
    simulatePaymentInitiation(transactionId, amount) {
        return {
            providerTxnId: `PL${transactionId}`,
            status: 'initiated',
            message: 'Payment initiated on terminal (demo mode)',
            terminalMessage: `Please pay ₹${amount} on the terminal`
        };
    }

    simulateStatusCheck(providerTxnId) {
        // Randomly return success or pending for demo
        const statuses = ['success', 'success', 'success', 'pending', 'failed'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        return {
            status,
            responseCode: status === 'success' ? '00' : status === 'failed' ? '05' : '99',
            responseMessage: status === 'success' ? 'Approved' : status === 'failed' ? 'Declined' : 'Processing',
            cardType: 'DEBIT',
            cardNetwork: 'VISA',
            cardLastFour: '4242',
            authCode: status === 'success' ? '123456' : null,
            rrn: status === 'success' ? '412345678901' : null,
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
                emi: true,
                nfc: true,
                qr: false,
                refund: true,
                settlement: true,
                webhook: true
            }
        };
    }
}

module.exports = PineLabsAdapter;
