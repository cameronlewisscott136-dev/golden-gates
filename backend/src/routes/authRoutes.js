const express = require('express');
const {
    register,
    login,
    verifyEmail,
    resendVerification,
    activateAccount,
    deposit,
    getMe,
    checkActivationStatus,
} = require('../controllers/authController');
const { protect, protectNonActive } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');

const router = express.Router();

// Public
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected (non-active users)
router.post('/verify-email', protectNonActive, verifyEmail);
router.post('/resend-verification', protectNonActive, resendVerification);
router.post('/activate', protectNonActive, activateAccount);

// Protected (active users)
router.post('/deposit', protect, deposit);
router.get('/me', protect, getMe);
router.get('/activation-status', protect, checkActivationStatus);

module.exports = router;