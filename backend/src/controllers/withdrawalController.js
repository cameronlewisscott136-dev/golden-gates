const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ============================================
// REQUEST WITHDRAWAL
// ============================================
const requestWithdrawal = async (req, res) => {
    try {
        const { amount, bankName, bankAccount, bankHolder, phoneNumber } = req.body;
        const user = await User.findById(req.user._id);

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account not activated' });
        }

        const minWithdrawal = parseInt(process.env.MINIMUM_WITHDRAWAL) || 100;
        const maxWithdrawal = parseInt(process.env.MAXIMUM_WITHDRAWAL) || 10000;

        if (amount < minWithdrawal) {
            return res.status(400).json({ success: false, message: `Minimum withdrawal is KES ${minWithdrawal}` });
        }
        if (amount > maxWithdrawal) {
            return res.status(400).json({ success: false, message: `Maximum withdrawal is KES ${maxWithdrawal}` });
        }
        if (amount > user.balance) {
            return res.status(400).json({ success: false, message: `Insufficient balance. You have KES ${user.balance.toFixed(2)}` });
        }

        if (!bankName || !bankAccount || !bankHolder || !phoneNumber) {
            return res.status(400).json({ success: false, message: 'All bank details are required' });
        }

        const withdrawal = new Withdrawal({
            user: user._id,
            amount,
            bankName,
            bankAccount,
            bankHolder,
            phoneNumber,
            status: 'pending'
        });
        await withdrawal.save();

        // Deduct from user balance immediately
        const balanceBefore = user.balance;
        user.balance -= amount;
        user.totalWithdrawn = (user.totalWithdrawn || 0) + amount;
        await user.save();

        await Transaction.create({
            user: user._id,
            type: 'withdrawal',
            amount: -amount,
            balanceBefore,
            balanceAfter: user.balance,
            description: `Withdrawal request of KES ${amount} to ${bankName}`,
            status: 'pending',
            metadata: { withdrawalId: withdrawal._id }
        });

        res.json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            data: {
                withdrawal,
                remainingBalance: user.balance
            }
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET USER WITHDRAWALS
// ============================================
const getUserWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: withdrawals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// ADMIN: GET ALL WITHDRAWALS
// ============================================
const getAllWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find().populate('user', 'email firstName lastName phone').sort({ createdAt: -1 });
        res.json({ success: true, data: withdrawals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// ADMIN: UPDATE WITHDRAWAL STATUS
// ============================================
const updateWithdrawalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Withdrawal not found' });
        }

        withdrawal.status = status;
        if (notes) withdrawal.notes = notes;
        if (['completed', 'processing'].includes(status)) {
            withdrawal.processedAt = new Date();
        }
        await withdrawal.save();

        // If failed, refund the user
        if (status === 'failed') {
            const user = await User.findById(withdrawal.user);
            if (user) {
                user.balance += withdrawal.amount;
                user.totalWithdrawn = Math.max(0, (user.totalWithdrawn || 0) - withdrawal.amount);
                await user.save();
            }
        }

        res.json({
            success: true,
            message: 'Withdrawal status updated',
            data: withdrawal
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    requestWithdrawal,
    getUserWithdrawals,
    getAllWithdrawals,
    updateWithdrawalStatus,
};