const Transaction = require('../models/Transaction');

exports.getTransactions = async (req, res) => {
    try {
        const { type, limit = 20, page = 1 } = req.query;
        const skip = (page - 1) * limit;

        const filter = { user: req.user._id };
        if (type) filter.type = type;

        const transactions = await Transaction.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Transaction.countDocuments(filter);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error getting transactions'
        });
    }
};