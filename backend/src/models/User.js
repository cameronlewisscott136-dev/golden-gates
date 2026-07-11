const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    verificationCode: { type: String, select: false },
    verificationCodeExpiry: { type: Date, select: false },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },

    // NEW: Separate balances
    initialCapital: { type: Number, default: 0 },        // The 200 KES activation deposit - NEVER touched
    profitBalance: { type: Number, default: 0 },         // Trading profits - can be used for trading
    bonusBalance: { type: Number, default: 0 },          // Referral bonuses - can be withdrawn or traded
    totalBalance: { type: Number, default: 0 },          // Calculated: initialCapital + profitBalance + bonusBalance

    // Referral system
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralEarnings: { type: Number, default: 0 },
    totalReferrals: { type: Number, default: 0 },

    // Trading stats
    totalTrades: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    totalLoss: { type: Number, default: 0 },

    // Deposits/Withdrawals
    totalDeposited: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },

    // Admin
    isAdmin: { type: Boolean, default: false },
}, { timestamps: true });

// Pre-save hooks
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.pre('save', function (next) {
    if (!this.referralCode) {
        this.referralCode = this.generateReferralCode();
    }
    // Calculate total balance
    this.totalBalance = this.initialCapital + this.profitBalance + this.bonusBalance;
    next();
});

userSchema.methods.generateReferralCode = function () {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.isVerificationCodeValid = function (code) {
    return this.verificationCode === code && this.verificationCodeExpiry > Date.now();
};

// Method to get available trading balance (profits + bonuses)
userSchema.methods.getTradingBalance = function () {
    return this.profitBalance + this.bonusBalance;
};

// Method to get withdrawable balance (bonuses only)
userSchema.methods.getWithdrawableBalance = function () {
    return this.bonusBalance;
};

module.exports = mongoose.model('User', userSchema);