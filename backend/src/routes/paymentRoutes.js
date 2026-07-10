const express = require('express');
const { protect } = require('../middleware/auth');
const {
    initiateActivationPayment,
    payheroCallback,
    checkPaymentStatus,
    getUserPayments,
    getPaymentByOrderId,
    getPayments,
    updatePaymentStatus,
    testCallback,
} = require('../controllers/paymentController');

const router = express.Router();

// Public webhook endpoint (no auth)
router.post('/callback', payheroCallback);

// Public test endpoint (no auth)
router.post('/test/:externalReference', testCallback);

// Protected routes (require authentication)
router.use(protect);

// Initiate activation payment
router.post('/activate', initiateActivationPayment);

// Check payment status
router.get('/status/:externalReference', checkPaymentStatus);

// Get user's payments
router.get('/my-payments', getUserPayments);

// Get payment by order ID
router.get('/order/:orderId', getPaymentByOrderId);

// Admin routes (optional)
router.get('/all', getPayments);
router.put('/:orderId/status', updatePaymentStatus);

module.exports = router;