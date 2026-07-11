const express = require('express');
const { protect } = require('../middleware/auth');
const {
    getPendingWithdrawals,
    approveWithdrawal,
    completeWithdrawal,
    rejectWithdrawal,
    getAllWithdrawalsAdmin,
    getWithdrawalDetails,
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes require authentication
router.use(protect);

// Withdrawal management
router.get('/withdrawals/pending', getPendingWithdrawals);
router.get('/withdrawals/all', getAllWithdrawalsAdmin);
router.get('/withdrawals/:id', getWithdrawalDetails);
router.put('/withdrawals/:id/approve', approveWithdrawal);
router.put('/withdrawals/:id/complete', completeWithdrawal);
router.put('/withdrawals/:id/reject', rejectWithdrawal);

module.exports = router;