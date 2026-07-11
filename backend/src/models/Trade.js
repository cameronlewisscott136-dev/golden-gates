const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['buy', 'sell'], required: true },
    asset: { type: String, required: true, enum: ['BTC', 'ETH', 'USDT', 'BNB', 'XRP', 'ADA', 'SOL', 'DOT', 'DOGE', 'AVAX'] },
    amount: { type: Number, required: true, min: 10 },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    profitLoss: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'closed', 'cancelled'], default: 'open' },
    openPrice: { type: Number, required: true },
    closePrice: { type: Number },
    openTime: { type: Date, default: Date.now },
    closeTime: { type: Date },
    entryPrice: { type: Number, required: true },
    exitPrice: { type: Number },
    profitPercentage: { type: Number, default: 0 },
    lossPercentage: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Trade', tradeSchema);