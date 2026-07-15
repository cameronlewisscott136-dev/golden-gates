const express = require('express');
const { protect } = require('../middleware/auth');
const {
    createTrade,
    getUserTrades,
    getTradeStats,
    getTradeById,
    getDailyTradeStatus
} = require('../controllers/tradeController');

const router = express.Router();

router.use(protect);

// Get daily trade limit status
router.get('/daily-status', getDailyTradeStatus);

// Trade routes
router.post('/', createTrade);
router.get('/', getUserTrades);
router.get('/stats', getTradeStats);
router.get('/:id', getTradeById);

module.exports = router;