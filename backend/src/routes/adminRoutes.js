const express = require('express');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

// ============================================
// VERIFY ADMIN TOKEN
// ============================================
const verifyAdminToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized as admin'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// ============================================
// ADMIN LOGIN
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not an admin account'
            });
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Admin login successful',
            data: {
                token,
                admin: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName
                }
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// GET ALL PENDING WITHDRAWALS
// ============================================
router.get('/withdrawals/pending', verifyAdminToken, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({
            status: 'pending'
        }).populate('user', 'firstName lastName email phone').sort({ createdAt: 1 });

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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// APPROVE WITHDRAWAL
// ============================================
router.put('/withdrawals/:id/approve', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;

        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) {
            return res.status(404).json({
                success: false,
                message: 'Withdrawal not found'
            });
        }

        if (withdrawal.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Withdrawal already ${withdrawal.status}`
            });
        }

        withdrawal.status = 'completed';
        withdrawal.processedAt = new Date();
        await withdrawal.save();

        res.json({
            success: true,
            message: 'Withdrawal approved successfully',
            data: withdrawal
        });
    } catch (error) {
        console.error('Approve withdrawal error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// REJECT WITHDRAWAL
// ============================================
router.put('/withdrawals/:id/reject', verifyAdminToken, async (req, res) => {
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
            return res.status(404).json({
                success: false,
                message: 'Withdrawal not found'
            });
        }

        if (withdrawal.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Withdrawal already ${withdrawal.status}`
            });
        }

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
        }

        res.json({
            success: true,
            message: 'Withdrawal rejected and funds refunded',
            data: withdrawal
        });
    } catch (error) {
        console.error('Reject withdrawal error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;