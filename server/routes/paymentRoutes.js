const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/orders', protect, paymentController.createOrder);
router.post('/verify', protect, paymentController.verifyPayment);
router.post('/link', protect, paymentController.createPaymentLink);
router.get('/qr/:invoiceId', protect, paymentController.generateQR);

module.exports = router;
