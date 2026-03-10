/**
 * Paytm POS Adapter
 * All-in-One POS and EDC terminal integration
 * API Documentation: https://developer.paytm.com/docs/edc/
 */

const BasePOSAdapter = require('../BasePOSAdapter');
const axios = require('axios');
const crypto = require('crypto');

class PaytmAdapter extends BasePOSAdapter {
    constructor() {
        super('paytm', 'Paytm POS');
        this.apiUrl = process.env.PAYTM_POS_API_URL || 'https://pos.paytm.com/api';
        this.merchantId = null;
        this.merchantKey = null;
    }

    async initialize(credentials) {
        this.merchantId = credentials.merchant_id || process.env.PAYTM_POS_MID;
        this.merchantKey = credentials.merchant_key || process.env.PAYTM_POS_KEY;
        this.isProduction = credentials.isProduction || process.env.NODE_ENV === 'production';

        if (!this.isProduction) {
            this.apiUrl = 'https://securegw-stage.paytm.in';
        } else {
            this.apiUrl = 'https://securegw.paytm.in';
        }

        this.isInitialized = true;
        this.log('Initialized', { merchantId: this.merchantId, isProduction: this.isProduction });
    }

    generateChecksum(params) {
        // Paytm uses specific checksum generation
        const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('|');
        return crypto.createHmac('sha256', this.merchantKey).update(sortedParams).digest('hex');
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-MerchantId': this.merchantId
        };
    }

    async initiatePayment(device, invoiceId, amount, options = {}) {
        this.validateDevice(device);

        const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        const payload = {
            mid: device.merchant_id || this.merchantId,
            orderId: orderId,
            terminalId: device.terminal_id,
            amount: amount.toFixed(2),
            billNo: invoiceId.toString(),
            paymentMode: options.paymentMode || 'ALL', // 'CARD', 'UPI', 'ALL'
            customerMobile: options.customerPhone || '',
            txnType: 'SALE'
        };

        // Add checksum
        payload.checksum = this.generateChecksum(payload);

        this.log('Initiating Payment', payload);

        try {
            // Demo mode
            if (!this.isProduction && !this.merchantKey) {
                return this.simulatePaymentInitiation(orderId, amount);
            }

            const response = await axios.post(
                `${this.apiUrl}/v1/cpay/request`,
                payload,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            return {
                providerTxnId: response.data.txnId || orderId,
                status: 'initiated',
                message: 'Payment request sent to Paytm terminal',
                orderId: orderId
            };
        } catch (error) {
            this.log('Payment initiation failed', { error: error.message });
            throw new Error(`Paytm: ${error.response?.data?.message || error.message}`);
        }
    }

    async checkStatus(providerTxnId) {
        this.log('Checking status', { providerTxnId });

        try {
            // Demo mode
            if (!this.isProduction && !this.merchantKey) {
                return this.simulateStatusCheck(providerTxnId);
            }

            const payload = {
                mid: this.merchantId,
                orderId: providerTxnId
            };
            payload.checksum = this.generateChecksum(payload);

            const response = await axios.post(
                `${this.apiUrl}/v1/cpay/status`,
                payload,
                { headers: this.getHeaders(), timeout: 15000 }
            );

            const data = response.data;
            return {
                status: this.mapPaytmStatus(data.resultInfo?.resultStatus),
                responseCode: data.resultInfo?.resultCode,
                responseMessage: data.resultInfo?.resultMsg,
                cardType: data.paymentMode,
                cardLastFour: data.maskedCardNo?.slice(-4),
                authCode: data.authCode,
                rrn: data.bankReferenceNo,
                raw: data
            };
        } catch (error) {
            throw new Error(`Paytm status check failed: ${error.message}`);
        }
    }

    mapPaytmStatus(paytmStatus) {
        const statusMap = {
            'TXN_SUCCESS': 'success',
            'TXN_FAILURE': 'failed',
            'PENDING': 'pending',
            'NO RECORD FOUND': 'not_found'
        };
        return statusMap[paytmStatus] || 'unknown';
    }

    async cancel(providerTxnId) {
        this.log('Cancelling transaction', { providerTxnId });

        try {
            if (!this.isProduction && !this.merchantKey) {
                return { success: true, message: 'Transaction cancelled (demo)' };
            }

            const payload = {
                mid: this.merchantId,
                orderId: providerTxnId,
                txnType: 'CANCEL'
            };
            payload.checksum = this.generateChecksum(payload);

            const response = await axios.post(
                `${this.apiUrl}/v1/cpay/cancel`,
                payload,
                { headers: this.getHeaders() }
            );

            return {
                success: response.data.resultInfo?.resultStatus === 'TXN_SUCCESS',
                message: response.data.resultInfo?.resultMsg || 'Transaction cancelled'
            };
        } catch (error) {
            throw new Error(`Paytm cancel failed: ${error.message}`);
        }
    }

    async refund(providerTxnId, amount = null, reason = '') {
        this.log('Initiating refund', { providerTxnId, amount, reason });

        try {
            if (!this.isProduction && !this.merchantKey) {
                return {
                    refundId: `REF${Date.now()}`,
                    status: 'initiated',
                    message: 'Refund initiated (demo)'
                };
            }

            const refundId = `REFUND${Date.now()}`;
            const payload = {
                mid: this.merchantId,
                orderId: providerTxnId,
                refId: refundId,
                txnType: 'REFUND',
                refundAmount: amount ? amount.toFixed(2) : null,
                comments: reason
            };
            payload.checksum = this.generateChecksum(payload);

            const response = await axios.post(
                `${this.apiUrl}/v2/refund`,
                payload,
                { headers: this.getHeaders() }
            );

            return {
                refundId: response.data.refundId || refundId,
                status: response.data.resultInfo?.resultStatus === 'TXN_SUCCESS' ? 'success' : 'pending',
                message: response.data.resultInfo?.resultMsg
            };
        } catch (error) {
            throw new Error(`Paytm refund failed: ${error.message}`);
        }
    }

    async void(providerTxnId) {
        // Paytm uses cancel for void as well
        return this.cancel(providerTxnId);
    }

    async settlement(terminalId) {
        this.log('Triggering settlement', { terminalId });

        try {
            if (!this.isProduction && !this.merchantKey) {
                return {
                    batchId: `BATCH${Date.now()}`,
                    transactionCount: Math.floor(Math.random() * 15) + 3,
                    totalAmount: Math.floor(Math.random() * 80000) + 5000,
                    status: 'initiated',
                    message: 'Settlement initiated (demo)'
                };
            }

            // Paytm auto-settles, but we can trigger manual
            const response = await axios.post(
                `${this.apiUrl}/v1/terminal/settlement`,
                { mid: this.merchantId, terminalId },
                { headers: this.getHeaders() }
            );

            return {
                batchId: response.data.batchId,
                transactionCount: response.data.txnCount,
                totalAmount: parseFloat(response.data.totalAmount),
                status: 'initiated',
                message: response.data.message
            };
        } catch (error) {
            throw new Error(`Paytm settlement failed: ${error.message}`);
        }
    }

    async testConnection(device) {
        this.log('Testing connection', { terminalId: device.terminal_id });

        const startTime = Date.now();

        try {
            if (!this.isProduction && !this.merchantKey) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return {
                    success: true,
                    latency: Date.now() - startTime,
                    message: 'Connection successful (demo mode)'
                };
            }

            const response = await axios.post(
                `${this.apiUrl}/v1/terminal/ping`,
                { mid: this.merchantId, terminalId: device.terminal_id },
                { headers: this.getHeaders(), timeout: 10000 }
            );

            return {
                success: response.data.status === 'ACTIVE',
                latency: Date.now() - startTime,
                message: response.data.status === 'ACTIVE' ? 'Terminal active' : 'Terminal inactive',
                batteryLevel: response.data.batteryLevel
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
        this.log('Fetching EMI offers', { amount, cardBin });

        try {
            if (!this.isProduction && !this.merchantKey) {
                // Demo EMI offers
                return [
                    { tenure: 3, bank: 'HDFC', interestRate: 0, emiAmount: Math.round(amount / 3), processingFee: 0, planId: 'DEMO_3M' },
                    { tenure: 6, bank: 'ICICI', interestRate: 13, emiAmount: Math.round(amount / 6 * 1.065), processingFee: 199, planId: 'DEMO_6M' },
                    { tenure: 9, bank: 'SBI', interestRate: 14, emiAmount: Math.round(amount / 9 * 1.07), processingFee: 299, planId: 'DEMO_9M' },
                    { tenure: 12, bank: 'Axis', interestRate: 15, emiAmount: Math.round(amount / 12 * 1.075), processingFee: 499, planId: 'DEMO_12M' }
                ];
            }

            const payload = {
                mid: this.merchantId,
                amount: amount.toFixed(2),
                cardBin: cardBin
            };

            const response = await axios.post(
                `${this.apiUrl}/v1/emi/offers`,
                payload,
                { headers: this.getHeaders(), timeout: 15000 }
            );

            return (response.data.offers || []).map(offer => ({
                tenure: offer.tenure,
                bank: offer.bankName,
                interestRate: offer.interestRate,
                emiAmount: parseFloat(offer.emiAmount),
                processingFee: parseFloat(offer.processingFee || 0),
                planId: offer.planId
            }));
        } catch (error) {
            this.log('EMI offers fetch failed', { error: error.message });
            return [];
        }
    }

    async handleWebhook(payload, signature) {

        // Verify Paytm signature
        const computedChecksum = this.generateChecksum(payload);

        if (signature !== computedChecksum) {
            return { valid: false, event: null, data: null };
        }

        return {
            valid: true,
            event: payload.txnType,
            data: {
                transactionId: payload.orderId,
                status: this.mapPaytmStatus(payload.resultInfo?.resultStatus),
                amount: parseFloat(payload.txnAmount),
                cardLastFour: payload.maskedCardNo?.slice(-4),
                rrn: payload.bankReferenceNo
            }
        };
    }

    // Demo mode simulation
    simulatePaymentInitiation(orderId, amount) {
        return {
            providerTxnId: orderId,
            status: 'initiated',
            message: 'Payment request sent to terminal (demo mode)',
            orderId: orderId
        };
    }

    simulateStatusCheck(providerTxnId) {
        const statuses = ['success', 'success', 'success', 'pending', 'failed'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        return {
            status,
            responseCode: status === 'success' ? '01' : status === 'failed' ? '330' : '400',
            responseMessage: status === 'success' ? 'Transaction Successful' : status === 'failed' ? 'Transaction Failed' : 'Pending',
            cardType: 'DEBIT_CARD',
            cardLastFour: '1234',
            authCode: status === 'success' ? 'AUTH123' : null,
            rrn: status === 'success' ? '301234567890' : null,
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
                qr: true,
                soundbox: true,
                refund: true,
                settlement: true,
                webhook: true
            }
        };
    }
}

module.exports = PaytmAdapter;
