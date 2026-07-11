const express = require('express');
const { protect } = require('../middleware/auth');
const {
    requestWithdrawal,
    getUserWithdrawals,
    getAllWithdrawals,
    updateWithdrawalStatus,
} = require('../controllers/withdrawalController');

const router = express.Router();

// Protected
router.post('/request', protect, requestWithdrawal);
router.get('/my-withdrawals', protect, getUserWithdrawals);

// Admin routes (add admin check in production)
router.get('/all', protect, getAllWithdrawals);
router.put('/:id/status', protect, updateWithdrawalStatus);

module.exports = router;