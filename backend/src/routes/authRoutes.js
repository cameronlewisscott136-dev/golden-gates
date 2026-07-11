const express = require('express');
const {
    register,
    login,
    verifyEmail,
    resendVerification,
    getMe,
    checkActivationStatus,
    activateAccount,
    testPassword,
    forceResetPassword,
} = require('../controllers/authController');
const { protect, protectNonActive } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Debug routes (remove in production)
router.post('/test-password', testPassword);
router.post('/force-reset-password', forceResetPassword);

// ============================================
// PROTECTED ROUTES (Non-active users)
// ============================================
router.post('/verify-email', protectNonActive, verifyEmail);
router.post('/resend-verification', protectNonActive, resendVerification);
router.post('/activate', protectNonActive, activateAccount);

// ============================================
// PROTECTED ROUTES (Active users)
// ============================================
router.get('/me', protect, getMe);
router.get('/activation-status', protect, checkActivationStatus);

module.exports = router;