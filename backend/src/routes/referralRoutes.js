const express = require('express');
const { protect } = require('../middleware/auth');
const {
    getReferrals,
    getReferralStats,
    getReferralCode,
} = require('../controllers/referralController');

const router = express.Router();

router.use(protect);

router.get('/', getReferrals);
router.get('/stats', getReferralStats);
router.get('/code', getReferralCode);

module.exports = router;