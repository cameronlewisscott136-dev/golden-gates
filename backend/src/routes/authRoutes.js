const express = require('express');
const {
    register,
    login,
    verifyEmail,
    resendVerification,
    activateAccount,
    getMe
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
router.post('/activate', protectNonActive, activateAccount);

// Protected routes (active users)
router.get('/me', protect, getMe);

module.exports = router;