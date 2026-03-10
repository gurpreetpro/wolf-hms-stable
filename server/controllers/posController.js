/**
 * POS Controller
 * API endpoints for multi-provider POS integration
 * WOLF HMS
 */

const { getPOSService } = require('../services/pos/POSServiceManager');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const POSReconciliationService = require('../services/pos/POSReconciliationService');
const OfflineTransactionQueue = require('../services/pos/OfflineTransactionQueue');
const { getHospitalId } = require('../utils/tenantHelper');

// ============================================
// Provider Management
// ============================================

/**
 * Get all available POS providers
 */
const getProviders = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const posService = await getPOSService();
    const providers = await posService.getProviders(hospitalId);
    ResponseHandler.success(res, providers);
});

/**
 * Get active providers only
 */
const getActiveProviders = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const providers = await posService.getActiveProviders();
    ResponseHandler.success(res, providers);
});

/**
 * Get provider capabilities
 */
const getProviderCapabilities = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const adapter = posService.getAdapter(req.params.code);
    ResponseHandler.success(res, adapter.getCapabilities());
});

// ============================================
// Device Management
// ============================================

/**
 * Get all registered devices
 */
const getDevices = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const posService = await getPOSService();
    const filters = {
        status: req.query.status,
        department: req.query.department,
        location: req.query.location,
        provider: req.query.provider,
        hospital_id: hospitalId
    };
    const devices = await posService.getDevices(filters);
    ResponseHandler.success(res, devices);
});

/**
 * Get device by ID
 */
const getDeviceById = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const device = await posService.getDevice(req.params.id);
    if (!device) {
        return ResponseHandler.error(res, 'Device not found', 404);
    }
    ResponseHandler.success(res, device);
});

/**
 * Register new device
 */
const registerDevice = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const posService = await getPOSService();
    const deviceData = {
        ...req.body,
        registered_by: req.user?.id,
        hospital_id: hospitalId
    };
    const device = await posService.registerDevice(deviceData);
    ResponseHandler.success(res, device, 'Device registered successfully', 201);
});

/**
 * Update device
 */
const updateDevice = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const device = await posService.updateDevice(req.params.id, req.body);
    if (!device) {
        return ResponseHandler.error(res, 'Device not found', 404);
    }
    ResponseHandler.success(res, device);
});

/**
 * Test device connection
 */
const testDeviceConnection = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const result = await posService.testConnection(req.params.id);
    ResponseHandler.success(res, result);
});

/**
 * Deactivate device
 */
const deactivateDevice = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const device = await posService.updateDevice(req.params.id, { status: 'inactive' });
    ResponseHandler.success(res, { message: 'Device deactivated', device });
});

// ============================================
// Transaction Processing
// ============================================

/**
 * Initiate payment
 */
const initiatePayment = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const posService = await getPOSService();
    const { deviceId, invoiceId, amount, paymentMode, customerPhone, emi } = req.body;

    if (!deviceId || !invoiceId || !amount) {
        return ResponseHandler.error(res, 'Missing required fields: deviceId, invoiceId, amount', 400);
    }

    const options = {
        paymentMode,
        customerPhone,
        emi,
        initiatedBy: req.user?.id,
        department: req.body.department,
        hospital_id: hospitalId
    };

    const result = await posService.initiatePayment(deviceId, invoiceId, amount, options);
    ResponseHandler.success(res, result);
});

/**
 * Check payment status
 */
const checkPaymentStatus = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const result = await posService.checkStatus(req.params.txnId);
    ResponseHandler.success(res, result);
});

/**
 * Cancel payment
 */
const cancelPayment = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const result = await posService.cancelPayment(req.params.txnId);
    ResponseHandler.success(res, result);
});

/**
 * Initiate refund
 */
const initiateRefund = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const { amount, reason } = req.body;
    const result = await posService.initiateRefund(req.params.txnId, amount, reason);
    ResponseHandler.success(res, result);
});

/**
 * Get transaction details
 */
const getTransaction = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const txn = await posService.getTransaction(req.params.txnId);
    if (!txn) {
        return ResponseHandler.error(res, 'Transaction not found', 404);
    }
    ResponseHandler.success(res, txn);
});

// ============================================
// Settlement
// ============================================

/**
 * Initiate settlement for device
 */
const initiateSettlement = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const result = await posService.initiateSettlement(req.params.id, req.user?.id);
    ResponseHandler.success(res, result);
});

// ============================================
// Reports
// ============================================

/**
 * Get transaction report
 */
const getTransactionReport = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const posService = await getPOSService();
    const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        provider: req.query.provider,
        status: req.query.status,
        device: req.query.device,
        hospital_id: hospitalId
    };
    const transactions = await posService.getTransactionReport(filters);
    ResponseHandler.success(res, transactions);
});

/**
 * Get daily summary
 */
const getDailySummary = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const posService = await getPOSService();
    const summary = await posService.getDailySummary(req.query.date, hospitalId);
    ResponseHandler.success(res, summary);
});

// ============================================
// Webhooks
// ============================================

/**
 * Handle Pine Labs webhook
 */
const handlePineLabsWebhook = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const adapter = posService.getAdapter('pine_labs');
    const result = await adapter.handleWebhook(req.body, req.headers['x-signature']);

    if (result.valid) {
        // Update transaction status
        await posService.checkStatus(result.data.transactionId);
    }

    ResponseHandler.success(res, { received: true });
});

/**
 * Handle Paytm webhook
 */
const handlePaytmWebhook = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const adapter = posService.getAdapter('paytm');
    const result = await adapter.handleWebhook(req.body, req.body.CHECKSUMHASH);

    if (result.valid) {
        await posService.checkStatus(result.data.transactionId);
    }

    ResponseHandler.success(res, { received: true });
});

/**
 * Handle Razorpay webhook
 */
const handleRazorpayWebhook = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const adapter = posService.getAdapter('razorpay');
    const result = await adapter.handleWebhook(req.body, req.headers['x-razorpay-signature']);

    if (result.valid && result.data) {
        await posService.checkStatus(result.data.transactionId);
    }

    ResponseHandler.success(res, { received: true });
});

/**
 * Handle PhonePe webhook
 */
const handlePhonePeWebhook = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const adapter = posService.getAdapter('phonepe');
    const result = await adapter.handleWebhook(req.body, req.headers['x-verify']);

    if (result.valid) {
        await posService.checkStatus(result.data.transactionId);
    }

    ResponseHandler.success(res, { received: true });
});

// ============================================
// EMI Support
// ============================================

/**
 * Get EMI offers for a specific device
 */
const getEMIOffers = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const { deviceId, amount, cardBin } = req.query;

    if (!amount) {
        return ResponseHandler.error(res, 'Amount is required', 400);
    }

    let offers;
    if (deviceId) {
        // Get EMI offers for specific device
        offers = await posService.getEMIOffers(deviceId, parseFloat(amount), cardBin);
    } else {
        // Get EMI offers from all active devices
        offers = await posService.getAllEMIOffers(parseFloat(amount), cardBin);
    }

    ResponseHandler.success(res, {
        amount: parseFloat(amount),
        offers,
        minEMIAmount: 3000, // Minimum amount for EMI (configurable)
        eligible: parseFloat(amount) >= 3000
    });
});

// ============================================
// Reconciliation
// ============================================

/**
 * Run reconciliation for a date
 */
const runReconciliation = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const reconciliationService = new POSReconciliationService(posService);
    const result = await reconciliationService.runReconciliation(
        req.body.date,
        req.user?.id
    );
    ResponseHandler.success(res, result);
});

/**
 * Get reconciliation discrepancies
 */
const getDiscrepancies = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const reconciliationService = new POSReconciliationService(posService);
    const discrepancies = await reconciliationService.getDiscrepancies(
        req.query.startDate || new Date().toISOString().split('T')[0],
        req.query.endDate,
        req.query.status
    );
    ResponseHandler.success(res, discrepancies);
});

/**
 * Resolve a discrepancy
 */
const resolveDiscrepancy = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const reconciliationService = new POSReconciliationService(posService);
    const result = await reconciliationService.resolveDiscrepancy(
        req.params.id,
        req.body.resolution, // 'resolved' or 'ignored'
        req.body.notes,
        req.user?.id
    );
    ResponseHandler.success(res, result);
});

/**
 * Get reconciliation summary
 */
const getReconciliationSummary = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const reconciliationService = new POSReconciliationService(posService);
    const summary = await reconciliationService.getReconciliationSummary(
        parseInt(req.query.days) || 7
    );
    ResponseHandler.success(res, summary);
});

// ============================================
// Offline Queue
// ============================================

/**
 * Get offline queue status
 */
const getOfflineQueueStatus = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const offlineQueue = new OfflineTransactionQueue(posService);
    const status = await offlineQueue.getQueueStatus();
    ResponseHandler.success(res, status);
});

/**
 * Get pending offline items
 */
const getOfflinePendingItems = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const offlineQueue = new OfflineTransactionQueue(posService);
    const items = await offlineQueue.getPendingItems(parseInt(req.query.limit) || 50);
    ResponseHandler.success(res, items);
});

/**
 * Process offline queue
 */
const processOfflineQueue = asyncHandler(async (req, res) => {
    const posService = await getPOSService();
    const offlineQueue = new OfflineTransactionQueue(posService);
    const result = await offlineQueue.processQueue();
    ResponseHandler.success(res, result);
});

module.exports = {
    // Providers
    getProviders,
    getActiveProviders,
    getProviderCapabilities,

    // Devices
    getDevices,
    getDeviceById,
    registerDevice,
    updateDevice,
    testDeviceConnection,
    deactivateDevice,

    // Transactions
    initiatePayment,
    checkPaymentStatus,
    cancelPayment,
    initiateRefund,
    getTransaction,

    // Settlement
    initiateSettlement,

    // Reports
    getTransactionReport,
    getDailySummary,

    // EMI
    getEMIOffers,

    // Reconciliation
    runReconciliation,
    getDiscrepancies,
    resolveDiscrepancy,
    getReconciliationSummary,

    // Offline Queue
    getOfflineQueueStatus,
    getOfflinePendingItems,
    processOfflineQueue,

    // Webhooks
    handlePineLabsWebhook,
    handlePaytmWebhook,
    handleRazorpayWebhook,
    handlePhonePeWebhook
};
