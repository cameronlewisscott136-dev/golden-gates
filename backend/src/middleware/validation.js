const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

const registerValidation = [
    body('email').isEmail().withMessage('Valid email required'),
    body('phone').matches(/^\+?[\d\s-]{10,}$/).withMessage('Valid phone required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 characters'),
    body('firstName').notEmpty().withMessage('First name required'),
    body('lastName').notEmpty().withMessage('Last name required'),
    validate
];

const loginValidation = [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
    validate
];

module.exports = { validate, registerValidation, loginValidation };