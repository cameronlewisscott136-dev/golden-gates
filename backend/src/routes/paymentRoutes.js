const express = require('express');
const { protect } = require('../middleware/auth');
const { payheroCallback, checkPaymentStatus, getUserPayments } = require('../controllers/paymentController');

const router = express.Router();

// Public webhook
router.post('/callback', payheroCallback);

// Protected
router.use(protect);
router.get('/status/:externalReference', checkPaymentStatus);
router.get('/my-payments', getUserPayments);

module.exports = router;