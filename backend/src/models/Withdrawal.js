const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    phoneNumber: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    reference: { type: String, unique: true },
    processedAt: { type: Date },
    notes: { type: String },
}, { timestamps: true });

withdrawalSchema.pre('save', function (next) {
    if (!this.reference) {
        this.reference = `WTH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    next();
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);