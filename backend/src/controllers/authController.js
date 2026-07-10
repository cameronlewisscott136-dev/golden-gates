const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Referral = require('../models/Referral');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/jwt');
const { sendVerificationEmail } = require('../config/email');
const Payment = require('../models/Payment');
const payheroService = require('../utils/payhero');

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

// @desc    Activate account - Uses Payment Controller
// @route   POST /api/auth/activate
// @access  Private
exports.activateAccount = async (req, res) => {
    try {
        const { amount, phoneNumber } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Account already activated'
            });
        }

        if (!user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Please verify your email first'
            });
        }

        const requiredAmount = parseInt(process.env.CAPITAL_REQUIRED) || 200;
        const depositAmount = parseFloat(amount);

        if (!depositAmount || depositAmount < requiredAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum deposit for activation is KES ${requiredAmount}`
            });
        }

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required for M-Pesa payment'
            });
        }

        // Generate references
        const timestamp = Date.now();
        const orderId = `ACT${timestamp}`;
        const externalReference = `ACT${timestamp}`;

        // Initiate PayHero STK Push
        const payheroResult = await payheroService.initiateSTKPush(
            phoneNumber,
            depositAmount,
            externalReference,
            `${user.firstName} ${user.lastName}`
        );

        if (!payheroResult.success) {
            return res.status(500).json({
                success: false,
                message: payheroResult.error || 'Failed to initiate payment'
            });
        }

        // Create payment record
        const payment = new Payment({
            user: user._id,
            orderId,
            externalReference,
            phoneNumber: payheroResult.formattedPhone,
            email: user.email,
            amount: depositAmount,
            customerName: `${user.firstName} ${user.lastName}`,
            description: 'Account Activation Deposit - Golden Gates',
            status: 'pending',
            payheroTransactionId: payheroResult.payheroReference || '',
            paymentChannel: 'mpesa',
            isActivation: true,
        });

        await payment.save();

        res.json({
            success: true,
            message: 'STK Push sent. Please check your phone for M-Pesa prompt.',
            data: {
                externalReference,
                phoneNumber: payheroResult.formattedPhone,
                amount: depositAmount,
                paymentId: payment._id,
                status: 'pending',
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

// Create payment record
const payment = new Payment({
    user: user._id,
    orderId: `ACT${timestamp}`,
    externalReference,
    phoneNumber: payheroResult.formattedPhone,
    email: user.email,
    amount: depositAmount,
    customerName: `${user.firstName} ${user.lastName}`,
    description: 'Account Activation Deposit',
    status: 'pending',
    payheroTransactionId: payheroResult.payheroReference || '',
    paymentChannel: 'mpesa',
    isActivation: true,
});

await payment.save();

res.json({
    success: true,
    message: 'STK Push sent. Please check your phone for M-Pesa prompt.',
    data: {
        externalReference,
        phoneNumber: payheroResult.formattedPhone,
        amount: depositAmount,
        paymentId: payment._id,
        status: 'pending',
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