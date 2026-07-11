const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ============================================
// REQUEST WITHDRAWAL - Only from bonus balance
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

        // Check if user has enough bonus balance (withdrawable)
        const withdrawableBalance = user.getWithdrawableBalance();
        if (amount > withdrawableBalance) {
            return res.status(400).json({
                success: false,
                message: `Insufficient withdrawable balance. You have KES ${withdrawableBalance.toFixed(2)} in bonuses. Initial capital and profits cannot be withdrawn.`
            });
        }

        if (!user.phone) {
            return res.status(400).json({
                success: false,
                message: 'No phone number registered'
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

        // Deduct from bonus balance
        const bonusBefore = user.bonusBalance;
        user.bonusBalance -= amount;
        user.totalWithdrawn = (user.totalWithdrawn || 0) + amount;
        await user.save();

        await Transaction.create({
            user: user._id,
            type: 'withdrawal',
            amount: -amount,
            balanceBefore: bonusBefore,
            balanceAfter: user.bonusBalance,
            description: `Withdrawal request of KES ${amount} from bonus balance`,
            status: 'pending',
            metadata: { withdrawalId: withdrawal._id }
        });

        console.log(`📤 Withdrawal request: ${user.email} | KES ${amount} | Phone: ${user.phone}`);

        res.json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            data: {
                withdrawal,
                remainingBonusBalance: user.bonusBalance,
                initialCapital: user.initialCapital,
                profitBalance: user.profitBalance
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
// GET WITHDRAWAL SUMMARY
// ============================================
const getWithdrawalSummary = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        const totalWithdrawn = user.totalWithdrawn || 0;
        const withdrawableBalance = user.getWithdrawableBalance();
        const minWithdrawal = parseInt(process.env.MINIMUM_WITHDRAWAL) || 100;
        const maxWithdrawal = parseInt(process.env.MAXIMUM_WITHDRAWAL) || 10000;

        const pendingWithdrawals = await Withdrawal.countDocuments({
            user: req.user._id,
            status: 'pending'
        });

        res.json({
            success: true,
            data: {
                phoneNumber: user.phone,
                initialCapital: user.initialCapital,
                profitBalance: user.profitBalance,
                bonusBalance: user.bonusBalance,
                withdrawableBalance,
                totalWithdrawn,
                pendingWithdrawals,
                minWithdrawal,
                maxWithdrawal,
                canWithdraw: withdrawableBalance >= minWithdrawal && pendingWithdrawals === 0
            }
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
                user.bonusBalance += withdrawal.amount;
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