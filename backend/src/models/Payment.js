const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: String, unique: true, required: true },
    externalReference: { type: String, unique: true, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true },
    amount: { type: Number, required: true },
    customerName: { type: String, required: true },
    description: { type: String, default: 'Account Deposit - Golden Gates' },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'timeout', 'cancelled'], default: 'pending' },
    payheroTransactionId: { type: String },
    mpesaReceiptNumber: { type: String },
    transactionDate: { type: Date },
    resultCode: { type: Number },
    resultDesc: { type: String },
    paymentChannel: { type: String, default: 'mpesa' },
    isActivation: { type: Boolean, default: false },
    isDeposit: { type: Boolean, default: false },
}, { timestamps: true });

paymentSchema.pre('save', function (next) {
    if (!this.orderId) this.orderId = `PAY${Date.now()}`;
    if (!this.externalReference) this.externalReference = `REF${Date.now()}`;
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);