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
    isAdmin: { type: Boolean, default: false }, // ← ADD THIS FIELD
    balance: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralEarnings: { type: Number, default: 0 },
    totalReferrals: { type: Number, default: 0 },
    totalTrades: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    totalLoss: { type: Number, default: 0 },
    totalDeposited: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.pre('save', function (next) {
    if (!this.referralCode) {
        this.referralCode = this.generateReferralCode();
    }
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

module.exports = mongoose.model('User', userSchema);