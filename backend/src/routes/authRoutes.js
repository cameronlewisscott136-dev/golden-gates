const express = require('express');
const {
    register,
    login,
    verifyEmail,
    resendVerification,
    getMe,
    checkActivationStatus,
    activateAccount, // Add this import
} = require('../controllers/authController');
const { protect, protectNonActive } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes (non-active users)
router.post('/verify-email', protectNonActive, verifyEmail);
router.post('/resend-verification', protectNonActive, resendVerification);

// Activation route - User must be authenticated but can be non-active
router.post('/activate', protectNonActive, activateAccount); // Add this line

// Protected routes (active users)
router.get('/me', protect, getMe);
router.get('/activation-status', protect, checkActivationStatus);

module.exports = router;