const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Referral = require('../models/Referral');
const Payment = require('../models/Payment');
const payheroService = require('../utils/payhero');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/jwt');
const { sendVerificationEmail } = require('../config/email');

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// ============================================
// REGISTER
// ============================================
const register = async (req, res) => {
    try {
        const { email, phone, password, firstName, lastName, referralCode } = req.body;

        console.log('📝 Registration attempt for:', email);

        if (!email || !phone || !password || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const existing = await User.findOne({ $or: [{ email }, { phone }] });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: existing.email === email ? 'Email already registered' : 'Phone already registered'
            });
        }

        const verificationCode = generateCode();
        const user = new User({
            email,
            phone,
            password,
            firstName,
            lastName,
            verificationCode,
            verificationCodeExpiry: new Date(Date.now() + 10 * 60 * 1000)
        });

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
                    initialCapital: user.initialCapital,
                    profitBalance: user.profitBalance,
                    bonusBalance: user.bonusBalance,
                    totalBalance: user.totalBalance
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

// ============================================
// LOGIN
// ============================================
const login = async (req, res) => {
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
                    initialCapital: user.initialCapital,
                    profitBalance: user.profitBalance,
                    bonusBalance: user.bonusBalance,
                    tradingBalance: user.getTradingBalance(),
                    withdrawableBalance: user.getWithdrawableBalance(),
                    totalBalance: user.totalBalance,
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

// ============================================
// VERIFY EMAIL
// ============================================
const verifyEmail = async (req, res) => {
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
                    isActive: user.isActive,
                    initialCapital: user.initialCapital,
                    profitBalance: user.profitBalance,
                    bonusBalance: user.bonusBalance,
                    totalBalance: user.totalBalance
                },
                token
            }
        });
    } catch (error) {
        console.error('Verification error:', error.message);
        res.status(500).json({ success: false, message: 'Server error during verification' });
    }
};

// ============================================
// RESEND VERIFICATION
// ============================================
const resendVerification = async (req, res) => {
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

        await sendVerificationEmail(user.email, code);
        res.json({ success: true, message: 'Verification code sent' });
    } catch (error) {
        console.error('Resend error:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ============================================
// ACTIVATE ACCOUNT
// ============================================
const activateAccount = async (req, res) => {
    try {
        const { phoneNumber, amount } = req.body;
        const user = await User.findById(req.user._id);

        console.log("\n========================================");
        console.log("🚀 ACCOUNT ACTIVATION REQUEST");
        console.log("========================================");
        console.log(`👤 User: ${user.email}`);
        console.log(`📱 Phone: ${phoneNumber}`);
        console.log(`💰 Amount: KES ${amount}`);
        console.log("========================================\n");

        if (!phoneNumber || !amount) {
            return res.status(400).json({
                success: false,
                message: "Phone number and amount are required",
            });
        }

        if (user.isActive) {
            return res.status(400).json({
                success: false,
                message: "Account already activated",
            });
        }

        if (!user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Please verify your email first",
            });
        }

        const requiredAmount = parseInt(process.env.CAPITAL_REQUIRED) || 200;
        const depositAmount = parseFloat(amount);

        if (!depositAmount || depositAmount < requiredAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum activation capital is KES ${requiredAmount}`,
            });
        }

        const externalReference = `ACT${Date.now()}`;
        const result = await payheroService.initiateSTKPush(
            phoneNumber,
            depositAmount,
            externalReference,
            `${user.firstName} ${user.lastName}`,
            'Account Activation - Initial Capital'
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.error || 'Payment initiation failed'
            });
        }

        const payment = new Payment({
            user: user._id,
            orderId: externalReference,
            externalReference,
            phoneNumber: result.formattedPhone,
            email: user.email,
            amount: depositAmount,
            customerName: `${user.firstName} ${user.lastName}`,
            description: 'Account Activation - Initial Capital',
            status: 'pending',
            payheroTransactionId: result.payheroReference || '',
            isActivation: true,
        });

        await payment.save();

        res.json({
            success: true,
            message: 'STK Push sent. Complete payment to activate your account.',
            data: {
                externalReference,
                phoneNumber: result.formattedPhone,
                amount: depositAmount,
                status: 'pending',
                paymentId: payment._id,
                message: 'Your initial capital of KES 200 will be locked and never used for trading.'
            }
        });
    } catch (error) {
        console.error('Activation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// DEPOSIT
// ============================================
const deposit = async (req, res) => {
    try {
        const { phoneNumber, amount } = req.body;
        const user = await User.findById(req.user._id);

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account not activated' });
        }

        if (amount < 100) {
            return res.status(400).json({ success: false, message: 'Minimum deposit is KES 100' });
        }

        console.log('hi')

        const externalReference = `DEP${Date.now()}`;
        const result = await payheroService.initiateSTKPush(
            phoneNumber,
            amount,
            externalReference,
            `${user.firstName} ${user.lastName}`,
            'Deposit'
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.error || 'Payment initiation failed'
            });
        }

        const payment = new Payment({
            user: user._id,
            orderId: externalReference,
            externalReference,
            phoneNumber: result.formattedPhone,
            email: user.email,
            amount: amount,
            customerName: `${user.firstName} ${user.lastName}`,
            description: 'Deposit',
            status: 'pending',
            payheroTransactionId: result.payheroReference || '',
            isDeposit: true,
        });

        await payment.save();

        res.json({
            success: true,
            message: 'STK Push sent. Complete payment to deposit funds.',
            data: {
                externalReference,
                phoneNumber: result.formattedPhone,
                amount: amount,
                status: 'pending',
                paymentId: payment._id,
            }
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET CURRENT USER
// ============================================
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

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
                    initialCapital: user.initialCapital,
                    profitBalance: user.profitBalance,
                    bonusBalance: user.bonusBalance,
                    tradingBalance: user.getTradingBalance(),
                    withdrawableBalance: user.getWithdrawableBalance(),
                    totalBalance: user.totalBalance,
                    referralCode: user.referralCode,
                    referralEarnings: user.referralEarnings,
                    totalReferrals: user.totalReferrals,
                    totalTrades: user.totalTrades,
                    totalProfit: user.totalProfit,
                    totalLoss: user.totalLoss,
                    totalDeposited: user.totalDeposited,
                    totalWithdrawn: user.totalWithdrawn,
                    createdAt: user.createdAt
                }
            }
        });
    } catch (error) {
        console.error('Get me error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// ============================================
// CHECK ACTIVATION STATUS
// ============================================
const checkActivationStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                isActive: user.isActive,
                isVerified: user.isVerified,
                initialCapital: user.initialCapital,
                profitBalance: user.profitBalance,
                bonusBalance: user.bonusBalance,
                totalBalance: user.totalBalance,
            }
        });
    } catch (error) {
        console.error('Check activation error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    register,
    login,
    verifyEmail,
    resendVerification,
    activateAccount,
    deposit,
    getMe,
    checkActivationStatus,
};