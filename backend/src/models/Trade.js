const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['buy', 'sell'],
        required: true,
    },
    asset: {
        type: String,
        required: true,
        enum: ['BTC', 'ETH', 'USDT', 'BNB', 'XRP', 'ADA', 'SOL', 'DOT', 'DOGE', 'AVAX'],
    },
    amount: {
        type: Number,
        required: true,
        min: 1,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },
    profitLoss: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['open', 'closed', 'cancelled'],
        default: 'open',
    },
    openPrice: {
        type: Number,
        required: true,
    },
    closePrice: {
        type: Number,
    },
    openTime: {
        type: Date,
        default: Date.now,
    },
    closeTime: {
        type: Date,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Trade', tradeSchema);