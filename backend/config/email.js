/**
 * Email Configuration
 * Nodemailer setup for Gmail SMTP
 */

const nodemailer = require('nodemailer');

// Get Gmail credentials
const GMAIL_USER = process.env.GMAIL_USER || 'sikapaghana96@gmail.com';
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD || '';

console.log('[Email] Initializing Gmail SMTP configuration...');
console.log('[Email] Gmail User:', GMAIL_USER);
console.log('[Email] Gmail Password Length:', GMAIL_PASSWORD.length, 'characters');

// Create transporter for Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASSWORD
    }
});

/**
 * Verify Gmail connection
 */
transporter.verify((error, success) => {
    if (error) {
        console.error('[Email] ❌ Gmail SMTP connection FAILED:', error.message);
        console.error('[Email] Please verify GMAIL_USER and GMAIL_PASSWORD in your .env file');
    } else {
        console.log('[Email] ✓ Gmail SMTP connection verified and ready');
    }
});

module.exports = transporter;
