const express = require('express');
const { protect } = require('../middleware/auth');
const {
    createTrade,
    closeTrade,
    getUserTrades,
    getTradeById,
    getTradeStats
} = require('../controllers/tradeController');

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getUserTrades)
    .post(createTrade);

router.get('/stats', getTradeStats);
router.get('/:id', getTradeById);
router.put('/:id/close', closeTrade);

module.exports = router;