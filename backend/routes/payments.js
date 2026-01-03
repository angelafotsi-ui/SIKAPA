const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validatePaymentInput } = require('../middleware/validation');

/**
 * @route   POST /api/payments/create-intent
 * @desc    Create a Stripe Payment Intent
 * @access  Public
 */
router.post('/create-intent', validatePaymentInput, paymentController.createPaymentIntent);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify a Stripe Payment Intent
 * @access  Public
 */
router.post('/verify', paymentController.verifyPayment);

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Stripe webhook events
 * @access  Public
 */
router.post('/webhook', paymentController.handleWebhook);

/**
 * @route   GET /api/payments/history/:email
 * @desc    Get payment history for a user
 * @access  Public
 */
router.get('/history/:email', paymentController.getPaymentHistory);

module.exports = router;
