const express = require('express');
const { protect } = require('../middleware/auth');
const {
    initiateDeposit,
    payheroCallback,
    checkPaymentStatus,
    getUserPayments,
} = require('../controllers/paymentController');

const router = express.Router();

// Public webhook endpoint (no auth)
router.post('/callback', payheroCallback);

// Protected routes
router.use(protect);
router.post('/deposit', initiateDeposit);
router.get('/status/:externalReference', checkPaymentStatus);
router.get('/my-payments', getUserPayments);

module.exports = router;