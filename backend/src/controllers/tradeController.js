const Trade = require('../models/Trade');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const MIN_TRADE = parseInt(process.env.MINIMUM_TRADE) || 10;
const MAX_TRADE = parseInt(process.env.MAXIMUM_TRADE) || 1000;
const PROFIT_CHANCE = 0.55;

// ============================================
// GENERATE REALISTIC PRICE
// ============================================
const generatePrice = (asset) => {
    const basePrices = {
        BTC: 4500000, ETH: 250000, USDT: 150, BNB: 50000,
        XRP: 80, ADA: 40, SOL: 15000, DOT: 5000, DOGE: 15, AVAX: 10000
    };
    const basePrice = basePrices[asset] || 1000;
    const fluctuation = (Math.random() * 4) - 2;
    return Math.round((basePrice * (1 + (fluctuation / 100))) * 100) / 100;
};

// ============================================
// CREATE TRADE
// ============================================
const createTrade = async (req, res) => {
    try {
        const { type, asset, amount } = req.body;
        const user = await User.findById(req.user._id);

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account not activated'
            });
        }

        if (amount < MIN_TRADE || amount > MAX_TRADE) {
            return res.status(400).json({
                success: false,
                message: `Trade must be between KES ${MIN_TRADE} and KES ${MAX_TRADE}`
            });
        }

        if (amount > user.balance) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. You have KES ${user.balance.toFixed(2)}`
            });
        }

        const price = generatePrice(asset);
        const quantity = amount / price;

        // Create trade
        const trade = new Trade({
            user: user._id,
            type,
            asset,
            amount,
            price,
            quantity,
            openPrice: price,
            entryPrice: price,
        });

        await trade.save();

        // Deduct from user balance
        const balanceBefore = user.balance;
        user.balance -= amount;
        user.totalTrades += 1;
        await user.save();

        // Record transaction
        await Transaction.create({
            user: user._id,
            type: 'trade_open',
            amount: -amount,
            balanceBefore,
            balanceAfter: user.balance,
            description: `Trade opened: ${type.toUpperCase()} ${quantity.toFixed(4)} ${asset} at KES ${price}`,
            status: 'completed',
            metadata: { tradeId: trade._id }
        });

        console.log(`📊 Trade opened: ${type.toUpperCase()} ${quantity.toFixed(4)} ${asset} | KES ${amount}`);

        // Auto close after random delay (10-40 seconds)
        const closeDelay = Math.floor(Math.random() * 30000) + 10000;
        setTimeout(async () => {
            await autoCloseTrade(trade._id);
        }, closeDelay);

        res.status(201).json({
            success: true,
            message: 'Trade opened successfully!',
            data: {
                trade,
                remainingBalance: user.balance,
                price,
                quantity: quantity.toFixed(4),
                estimatedCloseTime: new Date(Date.now() + closeDelay)
            }
        });
    } catch (error) {
        console.error('Create trade error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error creating trade'
        });
    }
};

// ============================================
// AUTO CLOSE TRADE
// ============================================
const autoCloseTrade = async (tradeId) => {
    try {
        const trade = await Trade.findById(tradeId);
        if (!trade || trade.status !== 'open') {
            console.log(`⚠️ Trade ${tradeId} not found or already closed`);
            return;
        }

        console.log(`📊 Closing trade: ${trade.asset} ${trade.type} | Amount: KES ${trade.amount}`);

        // Generate realistic small profit or loss
        const isProfit = Math.random() < PROFIT_CHANCE;
        let percentageChange;
        if (isProfit) {
            percentageChange = (Math.random() * 2.4) + 0.1; // 0.1% - 2.5% profit
        } else {
            percentageChange = -((Math.random() * 1.7) + 0.1); // 0.1% - 1.8% loss
        }

        // Calculate close price
        const closePrice = Math.round((trade.openPrice * (1 + (percentageChange / 100))) * 100) / 100;

        // Calculate profit/loss
        let profitLoss;
        if (trade.type === 'buy') {
            profitLoss = (closePrice - trade.openPrice) * trade.quantity;
        } else {
            profitLoss = (trade.openPrice - closePrice) * trade.quantity;
        }
        profitLoss = Math.round(profitLoss * 100) / 100;

        // Update trade
        trade.status = 'closed';
        trade.closePrice = closePrice;
        trade.closeTime = new Date();
        trade.profitLoss = profitLoss;
        trade.exitPrice = closePrice;
        trade.profitPercentage = profitLoss > 0 ? (profitLoss / trade.amount) * 100 : 0;
        trade.lossPercentage = profitLoss < 0 ? Math.abs(profitLoss / trade.amount) * 100 : 0;
        trade.duration = Math.floor((trade.closeTime - trade.openTime) / 1000);
        await trade.save();

        // Update user balance
        const user = await User.findById(trade.user);
        if (!user) {
            console.error(`❌ User not found for trade: ${tradeId}`);
            return;
        }

        const balanceBefore = user.balance;
        const totalReturn = trade.amount + profitLoss;
        user.balance += profitLoss; // Add only the profit/loss (amount was already deducted)

        if (profitLoss >= 0) {
            user.totalProfit += profitLoss;
        } else {
            user.totalLoss += Math.abs(profitLoss);
        }
        await user.save();

        // Record transaction
        await Transaction.create({
            user: user._id,
            type: profitLoss >= 0 ? 'trade_profit' : 'trade_loss',
            amount: totalReturn,
            balanceBefore,
            balanceAfter: user.balance,
            description: `Trade closed: ${trade.type.toUpperCase()} ${trade.quantity.toFixed(4)} ${trade.asset} | ${profitLoss >= 0 ? 'Profit' : 'Loss'} of KES ${Math.abs(profitLoss).toFixed(2)} (${trade.profitPercentage.toFixed(2)}%)`,
            status: 'completed',
            metadata: {
                tradeId: trade._id,
                profitLoss,
                percentage: profitLoss >= 0 ? trade.profitPercentage : -trade.lossPercentage
            }
        });

        console.log(`✅ Trade closed: ${trade.asset} ${trade.type} | P/L: ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)} KES (${trade.profitPercentage.toFixed(2)}%)`);
        console.log(`💰 New balance: KES ${user.balance.toFixed(2)}`);

    } catch (error) {
        console.error('❌ Auto-close trade error:', error.message);
    }
};

// ============================================
// GET USER TRADES
// ============================================
const getUserTrades = async (req, res) => {
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

        // Calculate total P/L for the current view
        const totalProfitLoss = trades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);

        res.json({
            success: true,
            data: {
                trades,
                totalProfitLoss: Math.round(totalProfitLoss * 100) / 100,
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
            message: error.message
        });
    }
};

// ============================================
// GET TRADE STATS
// ============================================
const getTradeStats = async (req, res) => {
    try {
        // Get closed trades stats
        const stats = await Trade.aggregate([
            { $match: { user: req.user._id, status: 'closed' } },
            {
                $group: {
                    _id: null,
                    totalProfit: { $sum: { $cond: [{ $gte: ['$profitLoss', 0] }, '$profitLoss', 0] } },
                    totalLoss: { $sum: { $cond: [{ $lt: ['$profitLoss', 0] }, '$profitLoss', 0] } },
                    totalTrades: { $sum: 1 },
                    winningTrades: { $sum: { $cond: [{ $gte: ['$profitLoss', 0] }, 1, 0] } },
                    losingTrades: { $sum: { $cond: [{ $lt: ['$profitLoss', 0] }, 1, 0] } },
                    totalAmount: { $sum: '$amount' },
                    avgProfit: { $avg: { $cond: [{ $gte: ['$profitLoss', 0] }, '$profitLoss', null] } },
                    avgLoss: { $avg: { $cond: [{ $lt: ['$profitLoss', 0] }, '$profitLoss', null] } },
                }
            }
        ]);

        const openTrades = await Trade.countDocuments({
            user: req.user._id,
            status: 'open'
        });

        const result = stats.length > 0 ? {
            totalProfit: Math.round(stats[0].totalProfit * 100) / 100 || 0,
            totalLoss: Math.round(Math.abs(stats[0].totalLoss) * 100) / 100 || 0,
            netProfit: Math.round(((stats[0].totalProfit || 0) + (stats[0].totalLoss || 0)) * 100) / 100,
            totalTrades: stats[0].totalTrades || 0,
            winningTrades: stats[0].winningTrades || 0,
            losingTrades: stats[0].losingTrades || 0,
            winRate: stats[0].totalTrades > 0
                ? Math.round((stats[0].winningTrades / stats[0].totalTrades) * 100 * 100) / 100
                : 0,
            totalAmount: Math.round(stats[0].totalAmount * 100) / 100 || 0,
            avgProfit: Math.round((stats[0].avgProfit || 0) * 100) / 100,
            avgLoss: Math.round(Math.abs(stats[0].avgLoss || 0) * 100) / 100,
        } : {
            totalProfit: 0,
            totalLoss: 0,
            netProfit: 0,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            totalAmount: 0,
            avgProfit: 0,
            avgLoss: 0,
        };

        result.openTrades = openTrades;
        result.currentBalance = req.user.balance || 0;

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get stats error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET TRADE BY ID
// ============================================
const getTradeById = async (req, res) => {
    try {
        const trade = await Trade.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!trade) {
            return res.status(404).json({
                success: false,
                message: 'Trade not found'
            });
        }

        res.json({
            success: true,
            data: { trade }
        });
    } catch (error) {
        console.error('Get trade error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createTrade,
    getUserTrades,
    getTradeStats,
    getTradeById,
};