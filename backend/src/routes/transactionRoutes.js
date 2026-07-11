const express = require('express');
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
    try {
        const { limit = 20, page = 1, type } = req.query;
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
                pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;