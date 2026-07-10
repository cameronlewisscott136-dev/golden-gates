const express = require('express');
const { protect } = require('../middleware/auth');
const { getTransactions } = require('../controllers/transactionController');

const router = express.Router();

router.use(protect);
router.get('/', getTransactions);

module.exports = router;