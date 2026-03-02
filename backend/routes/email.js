/**
 * Email Routes
 * Endpoints for sending test emails and managing email functionality
 */

const express = require('express');
const router = express.Router();
const { sendWelcomeEmail, sendPaymentConfirmation, sendCustomEmail } = require('../services/emailService');

/**
 * Test email endpoint - Send a test welcome email
 * POST /api/email/test
 */
router.post('/test', async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email || !name) {
            return res.status(400).json({
                success: false,
                message: 'Email and name are required'
            });
        }

        const result = await sendWelcomeEmail(name, email);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Test welcome email sent successfully',
                messageId: result.messageId
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Failed to send email',
                error: result.error
            });
        }
    } catch (error) {
        console.error('[Email API] Test endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * Send welcome email
 * POST /api/email/welcome
 */
router.post('/welcome', async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email || !name) {
            return res.status(400).json({
                success: false,
                message: 'Email and name are required'
            });
        }

        const result = await sendWelcomeEmail(name, email);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Welcome email sent',
                messageId: result.messageId
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Failed to send welcome email',
                error: result.error
            });
        }
    } catch (error) {
        console.error('[Email API] Welcome endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * Send payment confirmation email
 * POST /api/email/payment
 */
router.post('/payment', async (req, res) => {
    try {
        const { email, amount, reference } = req.body;

        if (!email || !amount || !reference) {
            return res.status(400).json({
                success: false,
                message: 'Email, amount, and reference are required'
            });
        }

        const date = new Date().toLocaleString();
        const result = await sendPaymentConfirmation(email, amount, reference, date);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Payment confirmation email sent',
                messageId: result.messageId
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Failed to send payment email',
                error: result.error
            });
        }
    } catch (error) {
        console.error('[Email API] Payment endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * Send custom email
 * POST /api/email/send
 */
router.post('/send', async (req, res) => {
    try {
        const { to, subject, html } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).json({
                success: false,
                message: 'To, subject, and html are required'
            });
        }

        const result = await sendCustomEmail(to, subject, html);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Email sent successfully',
                messageId: result.messageId
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Failed to send email',
                error: result.error
            });
        }
    } catch (error) {
        console.error('[Email API] Send endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;
