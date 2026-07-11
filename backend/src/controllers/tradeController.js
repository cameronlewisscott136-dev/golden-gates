const Trade = require('../models/Trade');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const MIN_TRADE = parseInt(process.env.MINIMUM_TRADE) || 10;
const MAX_TRADE = parseInt(process.env.MAXIMUM_TRADE) || 1000;
const PROFIT_CHANCE = 0.55;

// ============================================
// GENERATE PRICE
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
// CREATE TRADE - Uses profit balance only
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

        // Check if user has enough trading balance (profits + bonuses)
        const tradingBalance = user.getTradingBalance();
        if (amount > tradingBalance) {
            return res.status(400).json({
                success: false,
                message: `Insufficient trading balance. You have KES ${tradingBalance.toFixed(2)} available for trading. Initial capital of KES ${user.initialCapital} is locked.`
            });
        }

        // Determine which balance to use (profits first, then bonuses)
        let profitDeduction = 0;
        let bonusDeduction = 0;

        if (user.profitBalance >= amount) {
            profitDeduction = amount;
        } else {
            profitDeduction = user.profitBalance;
            bonusDeduction = amount - user.profitBalance;
        }

        const price = generatePrice(asset);
        const quantity = amount / price;

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

        // Deduct from balances
        const profitBefore = user.profitBalance;
        const bonusBefore = user.bonusBalance;

        user.profitBalance -= profitDeduction;
        user.bonusBalance -= bonusDeduction;
        user.totalTrades += 1;
        await user.save();

        // Record transaction
        await Transaction.create({
            user: user._id,
            type: 'trade_open',
            amount: -amount,
            balanceBefore: profitBefore + bonusBefore,
            balanceAfter: user.getTradingBalance(),
            description: `Trade opened: ${type.toUpperCase()} ${quantity.toFixed(4)} ${asset} at KES ${price}`,
            status: 'completed',
            metadata: {
                tradeId: trade._id,
                profitDeduction,
                bonusDeduction
            }
        });

        console.log(`📊 Trade opened: ${type.toUpperCase()} ${quantity.toFixed(4)} ${asset} | KES ${amount}`);
        console.log(`💰 Trading balance after: KES ${user.getTradingBalance().toFixed(2)}`);

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
                remainingTradingBalance: user.getTradingBalance(),
                initialCapital: user.initialCapital,
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
        if (!trade || trade.status !== 'open') return;

        // Generate realistic small profit or loss
        const isProfit = Math.random() < PROFIT_CHANCE;
        let percentageChange;
        if (isProfit) {
            percentageChange = (Math.random() * 2.4) + 0.1; // 0.1% - 2.5% profit
        } else {
            percentageChange = -((Math.random() * 1.7) + 0.1); // 0.1% - 1.8% loss
        }

        const closePrice = Math.round((trade.openPrice * (1 + (percentageChange / 100))) * 100) / 100;
        let profitLoss;
        if (trade.type === 'buy') {
            profitLoss = (closePrice - trade.openPrice) * trade.quantity;
        } else {
            profitLoss = (trade.openPrice - closePrice) * trade.quantity;
        }
        profitLoss = Math.round(profitLoss * 100) / 100;

        trade.status = 'closed';
        trade.closePrice = closePrice;
        trade.closeTime = new Date();
        trade.profitLoss = profitLoss;
        trade.exitPrice = closePrice;
        trade.profitPercentage = profitLoss > 0 ? (profitLoss / trade.amount) * 100 : 0;
        trade.lossPercentage = profitLoss < 0 ? Math.abs(profitLoss / trade.amount) * 100 : 0;
        trade.duration = Math.floor((trade.closeTime - trade.openTime) / 1000);
        await trade.save();

        const user = await User.findById(trade.user);
        if (!user) return;

        // Update profit balance with the result
        const profitBefore = user.profitBalance;
        user.profitBalance += profitLoss; // Add profit or subtract loss

        if (profitLoss >= 0) {
            user.totalProfit += profitLoss;
        } else {
            user.totalLoss += Math.abs(profitLoss);
        }
        await user.save();

        // Record transaction
        const totalReturn = trade.amount + profitLoss;
        await Transaction.create({
            user: user._id,
            type: profitLoss >= 0 ? 'trade_profit' : 'trade_loss',
            amount: totalReturn,
            balanceBefore: profitBefore,
            balanceAfter: user.profitBalance,
            description: `Trade closed: ${trade.type.toUpperCase()} ${trade.quantity.toFixed(4)} ${trade.asset} | ${profitLoss >= 0 ? 'Profit' : 'Loss'} of KES ${Math.abs(profitLoss).toFixed(2)}`,
            status: 'completed',
            metadata: { tradeId: trade._id }
        });

        console.log(`✅ Trade closed: ${trade.asset} ${trade.type} | P/L: ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)} KES`);
        console.log(`💰 New trading balance: KES ${user.getTradingBalance().toFixed(2)}`);
        console.log(`🔒 Initial capital: KES ${user.initialCapital} (locked)`);
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
                }
            }
        ]);

        const openTrades = await Trade.countDocuments({
            user: req.user._id,
            status: 'open'
        });

        const user = await User.findById(req.user._id);
        const result = stats.length > 0 ? {
            totalProfit: Math.round(stats[0].totalProfit * 100) / 100 || 0,
            totalLoss: Math.round(Math.abs(stats[0].totalLoss) * 100) / 100 || 0,
            netProfit: Math.round(((stats[0].totalProfit || 0) + (stats[0].totalLoss || 0)) * 100) / 100,
            totalTrades: stats[0].totalTrades || 0,
            winningTrades: stats[0].winningTrades || 0,
            losingTrades: stats[0].losingTrades || 0,
            winRate: stats[0].totalTrades > 0 ? Math.round((stats[0].winningTrades / stats[0].totalTrades) * 100 * 100) / 100 : 0,
            totalAmount: Math.round(stats[0].totalAmount * 100) / 100 || 0,
        } : {
            totalProfit: 0,
            totalLoss: 0,
            netProfit: 0,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            totalAmount: 0,
        };

        result.openTrades = openTrades;
        result.initialCapital = user?.initialCapital || 0;
        result.profitBalance = user?.profitBalance || 0;
        result.bonusBalance = user?.bonusBalance || 0;
        result.tradingBalance = user?.getTradingBalance() || 0;
        result.totalBalance = user?.totalBalance || 0;

        res.json({ success: true, data: result });
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