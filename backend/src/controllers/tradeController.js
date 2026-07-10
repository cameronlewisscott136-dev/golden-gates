const Trade = require('../models/Trade');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

exports.createTrade = async (req, res) => {
    try {
        const { type, asset, amount, price, quantity } = req.body;
        const user = await User.findById(req.user._id);

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account not activated'
            });
        }

        if (user.balance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }

        const trade = await Trade.create({
            user: user._id,
            type,
            asset,
            amount,
            price,
            quantity,
            openPrice: price
        });

        const balanceBefore = user.balance;
        user.balance -= amount;
        user.totalTrades += 1;
        await user.save();

        await Transaction.create({
            user: user._id,
            type: 'deposit',
            amount: -amount,
            balanceBefore,
            balanceAfter: user.balance,
            description: `Trade opened: ${type} ${quantity} ${asset} at ${price}`
        });

        res.status(201).json({
            success: true,
            message: 'Trade created successfully',
            data: { trade, remainingBalance: user.balance }
        });
    } catch (error) {
        console.error('Create trade error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error creating trade'
        });
    }
};

exports.closeTrade = async (req, res) => {
    try {
        const { closePrice } = req.body;
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).json({ success: false, message: 'Trade not found' });
        }

        if (trade.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (trade.status === 'closed') {
            return res.status(400).json({ success: false, message: 'Trade already closed' });
        }

        const profitLoss = (closePrice - trade.openPrice) * trade.quantity * (trade.type === 'buy' ? 1 : -1);

        trade.status = 'closed';
        trade.closePrice = closePrice;
        trade.closeTime = new Date();
        trade.profitLoss = profitLoss;
        await trade.save();

        const user = await User.findById(req.user._id);
        const balanceBefore = user.balance;
        user.balance += trade.amount + profitLoss;

        if (profitLoss > 0) {
            user.totalProfit += profitLoss;
        } else {
            user.totalLoss += Math.abs(profitLoss);
        }
        await user.save();

        await Transaction.create({
            user: user._id,
            type: profitLoss >= 0 ? 'trade_profit' : 'trade_loss',
            amount: trade.amount + profitLoss,
            balanceBefore,
            balanceAfter: user.balance,
            description: `Trade closed: ${trade.type} ${trade.quantity} ${trade.asset}`
        });

        res.json({
            success: true,
            message: 'Trade closed successfully',
            data: { trade, profitLoss, newBalance: user.balance }
        });
    } catch (error) {
        console.error('Close trade error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error closing trade'
        });
    }
};

exports.getUserTrades = async (req, res) => {
    try {
        const { status, limit = 20, page = 1 } = req.query;
        const skip = (page - 1) * limit;

        const filter = { user: req.user._id };
        if (status) filter.status = status;

        const trades = await Trade.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Trade.countDocuments(filter);

        res.json({
            success: true,
            data: {
                trades,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get trades error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error getting trades'
        });
    }
};

exports.getTradeById = async (req, res) => {
    try {
        const trade = await Trade.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!trade) {
            return res.status(404).json({ success: false, message: 'Trade not found' });
        }

        res.json({ success: true, data: { trade } });
    } catch (error) {
        console.error('Get trade error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error getting trade'
        });
    }
};

exports.getTradeStats = async (req, res) => {
    try {
        const stats = await Trade.aggregate([
            { $match: { user: req.user._id, status: 'closed' } },
            {
                $group: {
                    _id: null,
                    totalProfit: { $sum: { $cond: [{ $gte: ['$profitLoss', 0] }, '$profitLoss', 0] } },
                    totalLoss: { $sum: { $cond: [{ $lt: ['$profitLoss', 0] }, '$profitLoss', 0] } },
                    totalTrades: { $sum: 1 },
                    winningTrades: { $sum: { $cond: [{ $gte: ['$profitLoss', 0] }, 1, 0] } },
                    losingTrades: { $sum: { $cond: [{ $lt: ['$profitLoss', 0] }, 1, 0] } }
                }
            }
        ]);

        const openTrades = await Trade.countDocuments({
            user: req.user._id,
            status: 'open'
        });

        const result = stats.length > 0 ? stats[0] : {
            totalProfit: 0,
            totalLoss: 0,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0
        };

        result.openTrades = openTrades;
        result.winRate = result.totalTrades > 0
            ? (result.winningTrades / result.totalTrades * 100).toFixed(2)
            : 0;

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get stats error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error getting stats'
        });
    }
};