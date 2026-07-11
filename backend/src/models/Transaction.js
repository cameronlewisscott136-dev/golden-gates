const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'trade_profit', 'trade_loss', 'referral_bonus', 'capital_activation', 'trade_open'],
        required: true
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    reference: { type: String, unique: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

transactionSchema.pre('save', function (next) {
    if (!this.reference) {
        this.reference = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    next();
});

module.exports = mongoose.model('Transaction', transactionSchema);