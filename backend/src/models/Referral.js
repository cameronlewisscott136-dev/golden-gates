const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    referredUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
    bonusEarned: { type: Number, default: 0 },
    bonusPaid: { type: Boolean, default: false },
    activatedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Referral', referralSchema);