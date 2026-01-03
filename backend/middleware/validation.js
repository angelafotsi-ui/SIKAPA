const { body, validationResult } = require('express-validator');

/**
 * Validate authentication input
 */
exports.validateAuthInput = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .trim()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate payment input
 */
exports.validatePaymentInput = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a valid number greater than 0'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: true,
        messages: errors.array()
      });
    }
    next();
  }
];

/**
 * Error handling middleware
 */
exports.errorHandler = (err, req, res, next) => {
  console.error('Middleware error:', err);
  res.status(500).json({
    error: true,
    message: 'Internal server error'
  });
};
