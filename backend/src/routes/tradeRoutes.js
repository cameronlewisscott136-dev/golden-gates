const express = require('express');
const { protect } = require('../middleware/auth');
const { createTrade, getUserTrades, getTradeStats, getTradeById } = require('../controllers/tradeController');

const router = express.Router();

router.use(protect);

router.post('/', createTrade);
router.get('/', getUserTrades);
router.get('/stats', getTradeStats);
router.get('/:id', getTradeById);

module.exports = router;