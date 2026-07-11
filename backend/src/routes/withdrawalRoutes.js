const express = require('express');
const { protect } = require('../middleware/auth');
const {
    requestWithdrawal,
    getUserWithdrawals,
    getAllWithdrawals,
    updateWithdrawalStatus,
    getWithdrawalSummary,
} = require('../controllers/withdrawalController');

const router = express.Router();

// Protected routes
router.post('/request', protect, requestWithdrawal);
router.get('/my-withdrawals', protect, getUserWithdrawals);
router.get('/summary', protect, getWithdrawalSummary);

// Admin routes (add admin check in production)
router.get('/all', protect, getAllWithdrawals);
router.put('/:id/status', protect, updateWithdrawalStatus);

module.exports = router;