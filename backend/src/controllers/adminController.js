const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ============================================
// ADMIN: GET PENDING WITHDRAWALS
// ============================================
const getPendingWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ status: 'pending' })
            .populate('user', 'firstName lastName email phone balance')
            .sort({ createdAt: 1 });

        // Calculate total pending amount
        const totalPending = withdrawals.reduce((sum, w) => sum + w.amount, 0);

        res.json({
            success: true,
            data: {
                withdrawals,
                totalPending,
                count: withdrawals.length
            }
        });
    } catch (error) {
        console.error('Get pending withdrawals error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// ADMIN: APPROVE WITHDRAWAL (Mark as Processing)
// ============================================
const approveWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Withdrawal not found' });
        }

        if (withdrawal.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Withdrawal already ${withdrawal.status}`
            });
        }

        // Update status to processing
        withdrawal.status = 'processing';
        withdrawal.processedAt = new Date();
        if (notes) withdrawal.notes = notes;
        await withdrawal.save();

        // Update transaction
        await Transaction.findOneAndUpdate(
            { 'metadata.withdrawalId': withdrawal._id },
            { status: 'processing' }
        );

        console.log(`✅ Withdrawal approved: ${withdrawal.reference} | Amount: KES ${withdrawal.amount}`);

        res.json({
            success: true,
            message: 'Withdrawal approved and is being processed',
            data: withdrawal
        });
    } catch (error) {
        console.error('Approve withdrawal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// ADMIN: COMPLETE WITHDRAWAL (Mark as Completed)
// ============================================
const completeWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { mpesaReference, notes } = req.body;

        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Withdrawal not found' });
        }

        if (!['pending', 'processing'].includes(withdrawal.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot complete withdrawal with status: ${withdrawal.status}`
            });
        }

        // Update status to completed
        withdrawal.status = 'completed';
        withdrawal.processedAt = new Date();
        withdrawal.notes = notes || `Completed. M-Pesa Ref: ${mpesaReference || 'N/A'}`;
        await withdrawal.save();

        // Update transaction
        await Transaction.findOneAndUpdate(
            { 'metadata.withdrawalId': withdrawal._id },
            { status: 'completed' }
        );

        console.log(`✅ Withdrawal completed: ${withdrawal.reference} | Amount: KES ${withdrawal.amount}`);

        res.json({
            success: true,
            message: 'Withdrawal completed successfully',
            data: withdrawal
        });
    } catch (error) {
        console.error('Complete withdrawal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// ADMIN: REJECT WITHDRAWAL (Mark as Failed)
// ============================================
const rejectWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a reason for rejection'
            });
        }

        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Withdrawal not found' });
        }

        if (!['pending', 'processing'].includes(withdrawal.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot reject withdrawal with status: ${withdrawal.status}`
            });
        }

        // Update status to failed
        withdrawal.status = 'failed';
        withdrawal.processedAt = new Date();
        withdrawal.notes = `Rejected: ${reason}`;
        await withdrawal.save();

        // Refund user
        const user = await User.findById(withdrawal.user);
        if (user) {
            user.balance += withdrawal.amount;
            user.totalWithdrawn = Math.max(0, (user.totalWithdrawn || 0) - withdrawal.amount);
            await user.save();

            // Update transaction
            await Transaction.findOneAndUpdate(
                { 'metadata.withdrawalId': withdrawal._id },
                {
                    status: 'failed',
                    description: `Withdrawal rejected: ${reason} - Refunded KES ${withdrawal.amount}`
                }
            );
        }

        console.log(`❌ Withdrawal rejected: ${withdrawal.reference} | Reason: ${reason}`);

        res.json({
            success: true,
            message: 'Withdrawal rejected and funds refunded',
            data: withdrawal
        });
    } catch (error) {
        console.error('Reject withdrawal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// ADMIN: GET ALL WITHDRAWALS WITH STATS
// ============================================
const getAllWithdrawalsAdmin = async (req, res) => {
    try {
        const { status, limit = 50, page = 1 } = req.query;
        const skip = (page - 1) * limit;

        const filter = {};
        if (status) filter.status = status;

        const withdrawals = await Withdrawal.find(filter)
            .populate('user', 'firstName lastName email phone balance')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Withdrawal.countDocuments(filter);

        // Calculate stats
        const stats = await Withdrawal.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        const statsMap = {};
        stats.forEach(s => {
            statsMap[s._id] = { count: s.count, totalAmount: s.totalAmount };
        });

        res.json({
            success: true,
            data: {
                withdrawals,
                stats: {
                    pending: statsMap.pending || { count: 0, totalAmount: 0 },
                    processing: statsMap.processing || { count: 0, totalAmount: 0 },
                    completed: statsMap.completed || { count: 0, totalAmount: 0 },
                    failed: statsMap.failed || { count: 0, totalAmount: 0 }
                },
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all withdrawals error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// ADMIN: GET WITHDRAWAL DETAILS
// ============================================
const getWithdrawalDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const withdrawal = await Withdrawal.findById(id)
            .populate('user', 'firstName lastName email phone balance totalWithdrawn');

        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Withdrawal not found' });
        }

        // Get related transaction
        const transaction = await Transaction.findOne({
            'metadata.withdrawalId': withdrawal._id
        });

        res.json({
            success: true,
            data: {
                withdrawal,
                transaction
            }
        });
    } catch (error) {
        console.error('Get withdrawal details error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getPendingWithdrawals,
    approveWithdrawal,
    completeWithdrawal,
    rejectWithdrawal,
    getAllWithdrawalsAdmin,
    getWithdrawalDetails,
};