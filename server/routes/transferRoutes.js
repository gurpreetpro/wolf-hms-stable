const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createTransferRequest,
    getPendingApprovals,
    getWardPendingTransfers,
    approveTransfer,
    rejectTransfer,
    acknowledgeTransfer,
    executeTransfer,
    getTransferHistory,
    getBillingSegments,
    getAvailableBeds
} = require('../controllers/transferController');

// Available beds for transfer selection
router.get('/available-beds', protect, getAvailableBeds);

// Create transfer request (doctor or ward can initiate)
router.post('/request', protect, createTransferRequest);

// Doctor's pending approvals (ward-initiated requests)
router.get('/pending-approvals', protect, authorize('doctor', 'admin'), getPendingApprovals);

// Ward's pending acknowledgements (doctor-ordered transfers)
router.get('/ward/:wardId/pending', protect, getWardPendingTransfers);

// Doctor approves ward-initiated transfer
router.post('/:id/approve', protect, authorize('doctor', 'admin'), approveTransfer);

// Doctor rejects ward-initiated transfer (with reason)
router.post('/:id/reject', protect, authorize('doctor', 'admin'), rejectTransfer);

// Ward acknowledges doctor-ordered transfer
router.post('/:id/acknowledge', protect, acknowledgeTransfer);

// Execute approved transfer
router.post('/:id/execute', protect, executeTransfer);

// Transfer history for an admission
router.get('/history/:admissionId', protect, getTransferHistory);

// Billing segments for an admission
router.get('/billing/:admissionId', protect, getBillingSegments);

module.exports = router;
