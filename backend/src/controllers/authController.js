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
// REGISTER USER
// ============================================
const register = async (req, res) => {
    try {
        const { email, phone, password, firstName, lastName, referralCode } = req.body;

        // Check if user exists
        const existing = await User.findOne({ $or: [{ email }, { phone }] });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: existing.email === email ? 'Email already registered' : 'Phone already registered'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        const verificationCode = generateCode();

        // Create user
        const user = new User({
            email,
            phone,
            password: hashedPassword,
            firstName,
            lastName,
            verificationCode,
            verificationCodeExpiry: new Date(Date.now() + 10 * 60 * 1000)
        });

        // Generate referral code
        user.referralCode = user.generateReferralCode();

        // Handle referral
        if (referralCode) {
            const referrer = await User.findOne({ referralCode });
            if (referrer) {
                user.referredBy = referrer._id;
            }
        }

        await user.save();

        // Create referral record
        if (user.referredBy) {
            await Referral.create({
                referrer: user.referredBy,
                referredUser: user._id,
                status: 'pending'
            });
        }

        // Send verification email
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

// ============================================
// LOGIN USER
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

// ============================================
// RESEND VERIFICATION CODE
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

// ============================================
// ACTIVATE ACCOUNT (PayHero Integration)
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

        // Validation
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
                message: `Minimum deposit for activation is KES ${requiredAmount}`,
            });
        }

        // Generate references
        const timestamp = Date.now();
        const orderId = `ACT${timestamp}`;
        const externalReference = `ACT${timestamp}`;

        // Initiate PayHero STK Push
        const result = await payheroService.initiateSTKPush(
            phoneNumber,
            depositAmount,
            externalReference,
            `${user.firstName} ${user.lastName}`
        );

        if (!result.success) {
            console.error("❌ PayHero error:", result.error);
            return res.status(500).json({
                success: false,
                message: result.error || "Failed to initiate payment. Please try again.",
            });
        }

        // Create payment record
        const payment = new Payment({
            user: user._id,
            orderId,
            externalReference,
            phoneNumber: result.formattedPhone,
            email: user.email,
            amount: Math.round(depositAmount),
            customerName: `${user.firstName} ${user.lastName}`,
            description: "Account Activation - Golden Gates",
            status: "pending",
            payheroTransactionId: result.payheroReference || "",
            paymentChannel: "mpesa",
            isActivation: true,
        });

        await payment.save();

        console.log("✅ Payment record saved");
        console.log(`📋 Order ID: ${orderId}`);
        console.log(`📱 External Ref: ${externalReference}`);
        console.log("========================================\n");

        return res.json({
            success: true,
            message: "STK Push sent. Check your phone for the M-Pesa prompt.",
            data: {
                orderId,
                externalReference,
                phoneNumber: result.formattedPhone,
                amount: depositAmount,
                paymentId: payment._id,
                status: 'pending',
            },
        });
    } catch (error) {
        console.error("❌ Activation error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to initiate activation",
        });
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
                    balance: user.balance,
                    referralCode: user.referralCode,
                    referralEarnings: user.referralEarnings,
                    totalReferrals: user.totalReferrals,
                    totalTrades: user.totalTrades,
                    totalProfit: user.totalProfit,
                    totalLoss: user.totalLoss,
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
                balance: user.balance,
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

// ============================================
// UPDATE PROFILE
// ============================================
const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.phone = phone;

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
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
                    referralCode: user.referralCode
                }
            }
        });
    } catch (error) {
        console.error('Update profile error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile'
        });
    }
};

// ============================================
// CHANGE PASSWORD
// ============================================
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select('+password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isValid = await user.comparePassword(currentPassword);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error changing password'
        });
    }
};

// ============================================
// GET USER BY ID (Admin)
// ============================================
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

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
                    balance: user.balance,
                    referralCode: user.referralCode,
                    referralEarnings: user.referralEarnings,
                    totalReferrals: user.totalReferrals,
                    totalTrades: user.totalTrades,
                    totalProfit: user.totalProfit,
                    totalLoss: user.totalLoss,
                    createdAt: user.createdAt
                }
            }
        });
    } catch (error) {
        console.error('Get user error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// ============================================
// EXPORT ALL CONTROLLER FUNCTIONS
// ============================================
module.exports = {
    register,
    login,
    verifyEmail,
    resendVerification,
    activateAccount,
    getMe,
    checkActivationStatus,
    updateProfile,
    changePassword,
    getUserById,
};