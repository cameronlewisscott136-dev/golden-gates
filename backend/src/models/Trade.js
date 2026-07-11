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
        min: 10, // Minimum KES 10
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
    // Realistic trade metrics
    entryPrice: {
        type: Number,
        required: true,
    },
    exitPrice: {
        type: Number,
    },
    profitPercentage: {
        type: Number,
        default: 0,
    },
    lossPercentage: {
        type: Number,
        default: 0,
    },
    duration: {
        type: Number, // in seconds
        default: 0,
    },
}, {
    timestamps: true,
});

// Calculate profit/loss before saving
tradeSchema.pre('save', function (next) {
    if (this.status === 'closed' && this.closePrice) {
        // Calculate profit/loss based on trade type
        if (this.type === 'buy') {
            this.profitLoss = (this.closePrice - this.openPrice) * this.quantity;
        } else {
            this.profitLoss = (this.openPrice - this.closePrice) * this.quantity;
        }

        // Calculate percentages
        const investment = this.amount;
        if (investment > 0) {
            this.profitPercentage = (this.profitLoss / investment) * 100;
            this.lossPercentage = Math.abs(this.profitPercentage);
        }

        // Calculate duration
        if (this.closeTime) {
            this.duration = Math.floor((this.closeTime - this.openTime) / 1000);
        }
    }
    next();
});

module.exports = mongoose.model('Trade', tradeSchema);