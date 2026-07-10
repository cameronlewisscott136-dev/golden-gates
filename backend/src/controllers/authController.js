const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Referral = require('../models/Referral');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/jwt');
const { sendVerificationEmail } = require('../config/email');

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// @desc    Register user
exports.register = async (req, res) => {
    try {
        const { email, phone, password, firstName, lastName, referralCode } = req.body;

        const existing = await User.findOne({ $or: [{ email }, { phone }] });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: existing.email === email ? 'Email already registered' : 'Phone already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const verificationCode = generateCode();

        const user = new User({
            email,
            phone,
            password: hashedPassword,
            firstName,
            lastName,
            verificationCode,
            verificationCodeExpiry: new Date(Date.now() + 10 * 60 * 1000)
        });

        user.referralCode = user.generateReferralCode();

        if (referralCode) {
            const referrer = await User.findOne({ referralCode });
            if (referrer) {
                user.referredBy = referrer._id;
            }
        }

        await user.save();

        if (user.referredBy) {
            await Referral.create({
                referrer: user.referredBy,
                referredUser: user._id,
                status: 'pending'
            });
        }

        try {
            await sendVerificationEmail(email, verificationCode);
            console.log('📧 Verification email sent to:', email);
            console.log('🔑 Code:', verificationCode);
        } catch (emailError) {
            console.error('Email error:', emailError.message);
        }

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Registration successful. Check your email for verification code.',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    phone: user.phone,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isVerified: user.isVerified,
                    isActive: user.isActive,
                    referralCode: user.referralCode,
                    balance: user.balance
                },
                token
            }
        });
    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

// @desc    Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    phone: user.phone,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isVerified: user.isVerified,
                    isActive: user.isActive,
                    balance: user.balance,
                    referralCode: user.referralCode,
                    referralEarnings: user.referralEarnings,
                    totalReferrals: user.totalReferrals
                },
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

// @desc    Verify email
exports.verifyEmail = async (req, res) => {
    try {
        const { code } = req.body;
        const user = await User.findById(req.user._id).select('+verificationCode +verificationCodeExpiry');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Email already verified' });
        }

        if (!user.isVerificationCodeValid(code)) {
            return res.status(400).json({ success: false, message: 'Invalid or expired code' });
        }

        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpiry = undefined;
        await user.save();

        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Email verified successfully',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    isVerified: user.isVerified,
                    isActive: user.isActive
                },
                token
            }
        });
    } catch (error) {
        console.error('Verification error:', error.message);
        res.status(500).json({ success: false, message: 'Server error during verification' });
    }
};

// @desc    Resend verification code
exports.resendVerification = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('+verificationCode +verificationCodeExpiry');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Email already verified' });
        }

        const code = generateCode();
        user.verificationCode = code;
        user.verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        try {
            await sendVerificationEmail(user.email, code);
            console.log('📧 Resent verification email to:', user.email);
            console.log('🔑 Code:', code);
        } catch (emailError) {
            console.error('Email error:', emailError.message);
        }

        res.json({ success: true, message: 'Verification code sent' });
    } catch (error) {
        console.error('Resend error:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Activate account
exports.activateAccount = async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isActive) {
            return res.status(400).json({ success: false, message: 'Account already activated' });
        }

        if (!user.isVerified) {
            return res.status(400).json({ success: false, message: 'Please verify your email first' });
        }

        const required = parseInt(process.env.CAPITAL_REQUIRED) || 200;
        const deposit = parseFloat(amount);

        if (!deposit || deposit < required) {
            return res.status(400).json({
                success: false,
                message: `Minimum deposit is ${required}`
            });
        }

        const balanceBefore = user.balance;
        user.balance += deposit;
        user.isActive = true;
        await user.save();

        await Transaction.create({
            user: user._id,
            type: 'capital_activation',
            amount: deposit,
            balanceBefore,
            balanceAfter: user.balance,
            description: `Account activation deposit of ${deposit}`
        });

        if (user.referredBy) {
            const referrer = await User.findById(user.referredBy);
            if (referrer) {
                const bonus = parseInt(process.env.REFERRAL_BONUS) || 100;
                const refBalanceBefore = referrer.balance;

                referrer.balance += bonus;
                referrer.referralEarnings += bonus;
                referrer.totalReferrals += 1;
                await referrer.save();

                await Referral.findOneAndUpdate(
                    { referrer: referrer._id, referredUser: user._id },
                    {
                        status: 'active',
                        bonusEarned: bonus,
                        bonusPaid: true,
                        activatedAt: new Date()
                    }
                );

                await Transaction.create({
                    user: referrer._id,
                    type: 'referral_bonus',
                    amount: bonus,
                    balanceBefore: refBalanceBefore,
                    balanceAfter: referrer.balance,
                    description: `Referral bonus for ${user.email}`
                });
            }
        }

        res.json({
            success: true,
            message: 'Account activated successfully',
            data: {
                balance: user.balance,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Activation error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error during activation'
        });
    }
};

// @desc    Get current user
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    phone: user.phone,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isVerified: user.isVerified,
                    isActive: user.isActive,
                    balance: user.balance,
                    referralCode: user.referralCode,
                    referralEarnings: user.referralEarnings,
                    totalReferrals: user.totalReferrals,
                    totalTrades: user.totalTrades,
                    totalProfit: user.totalProfit,
                    totalLoss: user.totalLoss
                }
            }
        });
    } catch (error) {
        console.error('Get me error:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};