const Referral = require('../models/Referral');

exports.getReferrals = async (req, res) => {
    try {
        const referrals = await Referral.find({ referrer: req.user._id })
            .populate('referredUser', 'email phone firstName lastName isVerified isActive')
            .sort({ createdAt: -1 });

        const totalBonuses = await Referral.aggregate([
            { $match: { referrer: req.user._id } },
            { $group: { _id: null, total: { $sum: '$bonusEarned' } } }
        ]);

        res.json({
            success: true,
            data: {
                referrals,
                totalEarned: totalBonuses.length > 0 ? totalBonuses[0].total : 0,
                totalReferrals: referrals.length
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

exports.getReferralStats = async (req, res) => {
    try {
        const stats = await Referral.aggregate([
            { $match: { referrer: req.user._id } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const total = stats.reduce((sum, stat) => sum + stat.count, 0);
        const active = stats.find(s => s._id === 'active')?.count || 0;
        const pending = stats.find(s => s._id === 'pending')?.count || 0;

        res.json({
            success: true,
            data: {
                total,
                active,
                pending,
                bonusRate: parseInt(process.env.REFERRAL_BONUS) || 100
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