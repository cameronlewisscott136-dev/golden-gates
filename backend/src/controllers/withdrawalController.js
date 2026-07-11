const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ============================================
// REQUEST WITHDRAWAL - Phone Only
// ============================================
const requestWithdrawal = async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findById(req.user._id);

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account not activated'
            });
        }

        const minWithdrawal = parseInt(process.env.MINIMUM_WITHDRAWAL) || 100;
        const maxWithdrawal = parseInt(process.env.MAXIMUM_WITHDRAWAL) || 10000;

        if (!amount || amount < minWithdrawal) {
            return res.status(400).json({
                success: false,
                message: `Minimum withdrawal is KES ${minWithdrawal}`
            });
        }

        if (amount > maxWithdrawal) {
            return res.status(400).json({
                success: false,
                message: `Maximum withdrawal is KES ${maxWithdrawal}`
            });
        }

        if (amount > user.balance) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. You have KES ${user.balance.toFixed(2)}`
            });
        }

        // Use the registered phone number
        if (!user.phone) {
            return res.status(400).json({
                success: false,
                message: 'No phone number registered. Please update your profile.'
            });
        }

        // Create withdrawal request
        const withdrawal = new Withdrawal({
            user: user._id,
            amount,
            phoneNumber: user.phone,
            status: 'pending'
        });
        await withdrawal.save();

        // Deduct from user balance immediately
        const balanceBefore = user.balance;
        user.balance -= amount;
        user.totalWithdrawn = (user.totalWithdrawn || 0) + amount;
        await user.save();

        // Create transaction record
        await Transaction.create({
            user: user._id,
            type: 'withdrawal',
            amount: -amount,
            balanceBefore,
            balanceAfter: user.balance,
            description: `Withdrawal request of KES ${amount} to ${user.phone}`,
            status: 'pending',
            metadata: { withdrawalId: withdrawal._id }
        });

        console.log(`📤 Withdrawal request: ${user.email} | KES ${amount} | Phone: ${user.phone}`);

        res.json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            data: {
                withdrawal,
                remainingBalance: user.balance,
                phoneNumber: user.phone
            }
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET USER WITHDRAWALS
// ============================================
const getUserWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ user: req.user._id })
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: withdrawals
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// ADMIN: GET ALL WITHDRAWALS
// ============================================
const getAllWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find()
            .populate('user', 'email firstName lastName phone balance')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: withdrawals
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
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
            return res.status(404).json({
                success: false,
                message: 'Withdrawal not found'
            });
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

                // Update transaction status
                await Transaction.findOneAndUpdate(
                    { 'metadata.withdrawalId': withdrawal._id },
                    { status: 'failed' }
                );
            }
        }

        // If completed, update transaction status
        if (status === 'completed') {
            await Transaction.findOneAndUpdate(
                { 'metadata.withdrawalId': withdrawal._id },
                { status: 'completed' }
            );
        }

        res.json({
            success: true,
            message: 'Withdrawal status updated',
            data: withdrawal
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET WITHDRAWAL SUMMARY
// ============================================
const getWithdrawalSummary = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        const totalWithdrawn = user.totalWithdrawn || 0;
        const availableBalance = user.balance || 0;
        const minWithdrawal = parseInt(process.env.MINIMUM_WITHDRAWAL) || 100;
        const maxWithdrawal = parseInt(process.env.MAXIMUM_WITHDRAWAL) || 10000;

        // Get pending withdrawals
        const pendingWithdrawals = await Withdrawal.countDocuments({
            user: req.user._id,
            status: 'pending'
        });

        res.json({
            success: true,
            data: {
                phoneNumber: user.phone,
                availableBalance,
                totalWithdrawn,
                pendingWithdrawals,
                minWithdrawal,
                maxWithdrawal,
                canWithdraw: availableBalance >= minWithdrawal && pendingWithdrawals === 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    requestWithdrawal,
    getUserWithdrawals,
    getAllWithdrawals,
    updateWithdrawalStatus,
    getWithdrawalSummary,
};