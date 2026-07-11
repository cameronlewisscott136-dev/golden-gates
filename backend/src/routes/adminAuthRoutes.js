const express = require('express');
const { protect } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');
const User = require('../models/User');
const { generateToken } = require('../config/jwt');

const router = express.Router();

// ============================================
// ADMIN LOGIN (Different endpoint for admin)
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password required'
            });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is admin
        if (!user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Not an admin account.'
            });
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Admin login successful',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isAdmin: user.isAdmin,
                    isActive: user.isActive
                },
                token
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during admin login'
        });
    }
});

// ============================================
// ADMIN CHECK (Check if current user is admin)
// ============================================
router.get('/check', protect, isAdmin, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Admin access confirmed',
            data: {
                isAdmin: true,
                user: {
                    id: req.user._id,
                    email: req.user.email,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName
                }
            }
        });
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// CREATE ADMIN USER (For setup - remove in production)
// ============================================
router.post('/create', async (req, res) => {
    try {
        const { email, phone, password, firstName, lastName } = req.body;

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Admin already exists'
            });
        }

        // Create admin user
        const admin = new User({
            email,
            phone,
            password,
            firstName,
            lastName,
            isVerified: true,
            isActive: true,
            isAdmin: true,
            balance: 0
        });

        await admin.save();

        res.status(201).json({
            success: true,
            message: 'Admin user created successfully',
            data: {
                admin: {
                    id: admin._id,
                    email: admin.email,
                    firstName: admin.firstName,
                    lastName: admin.lastName,
                    isAdmin: admin.isAdmin
                }
            }
        });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating admin'
        });
    }
});

module.exports = router;