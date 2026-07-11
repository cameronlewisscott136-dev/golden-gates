const Referral = require('../models/Referral');
const User = require('../models/User');

// ============================================
// GET USER REFERRALS
// ============================================
const getReferrals = async (req, res) => {
    try {
        const referrals = await Referral.find({ referrer: req.user._id })
            .populate('referredUser', 'email phone firstName lastName isVerified isActive createdAt')
            .sort({ createdAt: -1 });

        // Calculate total earnings from referrals
        const totalEarnings = referrals.reduce((sum, ref) => sum + (ref.bonusEarned || 0), 0);

        // Count active referrals
        const activeReferrals = referrals.filter(ref => ref.status === 'active').length;
        const pendingReferrals = referrals.filter(ref => ref.status === 'pending').length;

        res.json({
            success: true,
            data: {
                referrals,
                totalEarnings,
                activeReferrals,
                pendingReferrals,
                totalReferrals: referrals.length,
                bonusRate: parseInt(process.env.REFERRAL_BONUS) || 100,
            }
        });
    } catch (error) {
        console.error('Get referrals error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error getting referrals'
        });
    }
};

// ============================================
// GET REFERRAL STATS
// ============================================
const getReferralStats = async (req, res) => {
    try {
        const stats = await Referral.aggregate([
            { $match: { referrer: req.user._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalBonus: { $sum: '$bonusEarned' }
                }
            }
        ]);

        const total = stats.reduce((sum, stat) => sum + stat.count, 0);
        const active = stats.find(s => s._id === 'active')?.count || 0;
        const pending = stats.find(s => s._id === 'pending')?.count || 0;
        const totalEarnings = stats.reduce((sum, stat) => sum + (stat.totalBonus || 0), 0);

        res.json({
            success: true,
            data: {
                total,
                active,
                pending,
                totalEarnings,
                bonusRate: parseInt(process.env.REFERRAL_BONUS) || 100,
                conversionRate: total > 0 ? ((active / total) * 100).toFixed(2) : 0,
            }
        });
    } catch (error) {
        console.error('Get referral stats error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error getting referral stats'
        });
    }
};

// ============================================
// GET REFERRAL CODE
// ============================================
const getReferralCode = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const referralLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${user.referralCode}`;

        res.json({
            success: true,
            data: {
                referralCode: user.referralCode,
                referralLink,
                bonusAmount: parseInt(process.env.REFERRAL_BONUS) || 100,
            }
        });
    } catch (error) {
        console.error('Get referral code error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    getReferrals,
    getReferralStats,
    getReferralCode,
};