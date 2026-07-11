const User = require('../models/User');

// Check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        next();
    } catch (error) {
        console.error('Admin check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error checking admin status'
        });
    }
};

module.exports = { isAdmin };