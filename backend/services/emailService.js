/**
 * Email Service
 * Handles all email sending functionality for SIKAPA
 */

const transporter = require('../config/email');

/**
 * Email Templates
 */
const emailTemplates = {
    welcome: (userName, userEmail) => ({
        subject: 'Welcome to SIKAPA 🎉',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
                </style>
            </head>
            <body>
                <div style="background-color: #f8f9fa; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto;">
                        
                        <!-- Header Background -->
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
                            <h1 style="color: white; margin: 0; font-size: 36px; font-weight: 700;">Welcome to SIKAPA!</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Let's get you started on your journey</p>
                        </div>

                        <!-- Main Content -->
                        <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            
                            <!-- Greeting -->
                            <p style="color: #333; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">
                                Hi <strong>${userName}</strong>,<br><br>
                                We're absolutely thrilled to have you join the SIKAPA community! 🚀
                            </p>

                            <!-- Value Proposition -->
                            <p style="color: #555; font-size: 15px; line-height: 1.8; margin-bottom: 30px;">
                                You're now part of an amazing platform designed to help you manage payments, earn rewards, and grow your network. Whether you're tracking transactions, claiming rewards, or inviting friends, we've got the tools to make it all seamless and rewarding.
                            </p>

                            <!-- Account Details Card -->
                            <div style="background: linear-gradient(135deg, #f5f7fa 0%, #f8f9fb 100%); border-left: 4px solid #667eea; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                <h3 style="color: #333; margin: 0 0 15px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Your Account</h3>
                                <div style="margin-bottom: 10px;">
                                    <p style="color: #999; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Email Address</p>
                                    <p style="color: #333; font-size: 15px; margin: 0; word-break: break-all;">${userEmail}</p>
                                </div>
                                <div>
                                    <p style="color: #999; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Member Since</p>
                                    <p style="color: #333; font-size: 15px; margin: 0;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            </div>

                            <!-- Quick Start Guide -->
                            <div style="margin-bottom: 30px;">
                                <h3 style="color: #333; margin: 0 0 20px 0; font-size: 16px; font-weight: 700;">🚀 Quick Start Guide</h3>
                                
                                <!-- Feature Cards -->
                                <div style="margin-bottom: 15px; background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
                                    <div style="display: flex; gap: 15px;">
                                        <div style="font-size: 28px; min-width: 40px;">📊</div>
                                        <div>
                                            <h4 style="color: #333; margin: 0 0 5px 0; font-size: 14px; font-weight: 700;">View Your Dashboard</h4>
                                            <p style="color: #666; margin: 0; font-size: 13px;">Track your balance, view transactions, and monitor your earnings in real-time.</p>
                                        </div>
                                    </div>
                                </div>

                                <div style="margin-bottom: 15px; background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #764ba2;">
                                    <div style="display: flex; gap: 15px;">
                                        <div style="font-size: 28px; min-width: 40px;">💰</div>
                                        <div>
                                            <h4 style="color: #333; margin: 0 0 5px 0; font-size: 14px; font-weight: 700;">Earn Rewards</h4>
                                            <p style="color: #666; margin: 0; font-size: 13px;">Start earning rewards instantly and unlock bonuses through tier progression.</p>
                                        </div>
                                    </div>
                                </div>

                                <div style="margin-bottom: 15px; background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
                                    <div style="display: flex; gap: 15px;">
                                        <div style="font-size: 28px; min-width: 40px;">👥</div>
                                        <div>
                                            <h4 style="color: #333; margin: 0 0 5px 0; font-size: 14px; font-weight: 700;">Invite Friends</h4>
                                            <p style="color: #666; margin: 0; font-size: 13px;">Share your unique referral code and earn 1% commission on your friends' activities.</p>
                                        </div>
                                    </div>
                                </div>

                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #764ba2;">
                                    <div style="display: flex; gap: 15px;">
                                        <div style="font-size: 28px; min-width: 40px;">🏆</div>
                                        <div>
                                            <h4 style="color: #333; margin: 0 0 5px 0; font-size: 14px; font-weight: 700;">Unlock Tiers</h4>
                                            <p style="color: #666; margin: 0; font-size: 13px;">Climb through reward tiers and claim exclusive bonuses at each level.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="http://localhost:3000/dashboard.html" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">Go to Dashboard</a>
                            </div>

                            <!-- Support Section -->
                            <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin-top: 30px; text-align: center;">
                                <p style="color: #555; font-size: 14px; margin: 0;">Need help? We're here for you!</p>
                                <p style="color: #999; font-size: 13px; margin: 8px 0 0 0;">Contact our support team or check out our documentation.</p>
                            </div>

                            <!-- Footer -->
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                                <p style="color: #999; font-size: 12px; margin: 0;">Best regards,<br><strong style="color: #667eea;">The SIKAPA Team</strong></p>
                            </div>
                        </div>

                        <!-- Bottom Footer -->
                        <div style="text-align: center; margin-top: 20px;">
                            <p style="color: #999; font-size: 11px; margin: 0;">© 2026 SIKAPA. All rights reserved.</p>
                            <p style="color: #bbb; font-size: 10px; margin: 5px 0 0 0;">Made with ❤️ for blockchain payments in Ghana</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    resetPassword: (resetLink) => ({
        subject: 'Reset Your SIKAPA Password',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; }
                    .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1); }
                    .header { background: linear-gradient(135deg, #ee7752, #e73c7e); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
                    .header-icon { font-size: 40px; margin-bottom: 10px; }
                    .content { padding: 25px; }
                    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
                    .alert-box p { margin: 0; color: #856404; font-size: 14px; }
                    .reset-btn { background: linear-gradient(135deg, #ee7752, #e73c7e); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 25px 0; font-weight: 600; box-shadow: 0 4px 12px rgba(233, 115, 126, 0.3); transition: transform 0.2s; }
                    .reset-btn:hover { transform: translateY(-2px); }
                    .info-section { background: #f0f0f0; padding: 15px; border-radius: 6px; margin: 20px 0; }
                    .info-section h3 { color: #667eea; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
                    .info-section p { margin: 8px 0; font-size: 14px; color: #555; }
                    .footer { border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center; }
                    .footer p { color: #999; font-size: 12px; margin: 5px 0; }
                    .footer-brand { color: #667eea; font-weight: 600; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <div class="header-icon">🔐</div>
                            <h1>Password Reset Request</h1>
                        </div>

                        <div class="content">
                            <p style="font-size: 16px; color: #333; line-height: 1.6;">We received a request to reset your SIKAPA password. If you didn't make this request, you can safely ignore this email.</p>

                            <div class="alert-box">
                                <p><strong>⏱️ This link expires in 1 hour</strong></p>
                            </div>

                            <p style="text-align: center; margin: 30px 0;">
                                <a href="${resetLink}" class="reset-btn">Reset Your Password</a>
                            </p>

                            <div class="info-section">
                                <h3>🛡️ Security Tips</h3>
                                <p>• Use a strong, unique password</p>
                                <p>• Never share your password with anyone</p>
                                <p>• Enable two-factor authentication for extra security</p>
                            </div>

                            <p style="margin-top: 25px; color: #666; font-size: 13px; line-height: 1.6;">
                                <strong>Alternatively,</strong> copy this link and paste it in your browser:<br>
                                <span style="word-break: break-all; color: #999; font-size: 11px;">${resetLink}</span>
                            </p>

                            <div class="footer">
                                <p style="margin-bottom: 10px;">If you have any questions, contact our support team.</p>
                                <p>© 2026 SIKAPA. All rights reserved.</p>
                                <p style="color: #bbb; font-size: 10px;">Made with ❤️ for blockchain payments in Ghana</p>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    paymentConfirmation: (amount, reference, date) => ({
        subject: 'Payment Confirmation - SIKAPA',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; }
                    .card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(102, 126, 234, 0.15); }
                    .header { background: linear-gradient(135deg, #00b894, #00d2d3); color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
                    .header-icon { font-size: 45px; margin-bottom: 10px; }
                    .checkmark { display: inline-block; width: 50px; height: 50px; background: rgba(255,255,255,0.3); border-radius: 50%; text-align: center; line-height: 50px; }
                    .content { padding: 30px; }
                    .transaction-box { background: linear-gradient(135deg, #f5f9ff, #f0f5ff); border-left: 4px solid #667eea; padding: 20px; border-radius: 6px; margin: 25px 0; }
                    .transaction-row { display: flex; justify-content: space-between; margin: 12px 0; font-size: 15px; }
                    .transaction-row strong { color: #333; }
                    .transaction-row span { color: #00b894; font-weight: 600; }
                    .transaction-row.label { color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
                    .receipt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; }
                    .receipt-item { background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 3px solid #667eea; }
                    .receipt-item-label { color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
                    .receipt-item-value { color: #333; font-size: 16px; font-weight: 600; }
                    .amount-highlight { font-size: 32px; color: #00b894; font-weight: 700; margin: 20px 0; text-align: center; }
                    .section-title { color: #667eea; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-top: 25px; margin-bottom: 12px; }
                    .cta-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px auto; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); }
                    .cta-btn:hover { transform: translateY(-2px); }
                    .support-box { background: #f0f7ff; border-left: 4px solid #667eea; padding: 15px; border-radius: 4px; margin-top: 20px; }
                    .support-box p { margin: 5px 0; color: #555; font-size: 13px; }
                    .footer { border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center; }
                    .footer p { color: #999; font-size: 11px; margin: 5px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <div class="header-icon">✓</div>
                            <h1>Payment Confirmed!</h1>
                        </div>

                        <div class="content">
                            <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Thank you for your transaction! Your payment has been successfully processed and secured on the blockchain.</p>

                            <div class="amount-highlight">₵${amount}</div>

                            <div class="transaction-box">
                                <div class="transaction-row label">Transaction Details</div>
                                <div class="transaction-row">
                                    <strong>Reference ID:</strong>
                                    <span>${reference}</span>
                                </div>
                                <div class="transaction-row">
                                    <strong>Date & Time:</strong>
                                    <span>${date}</span>
                                </div>
                            </div>

                            <div class="receipt-grid">
                                <div class="receipt-item">
                                    <div class="receipt-item-label">📊 Status</div>
                                    <div class="receipt-item-value" style="color: #00b894;">Completed</div>
                                </div>
                                <div class="receipt-item">
                                    <div class="receipt-item-label">🔒 Type</div>
                                    <div class="receipt-item-value">Blockchain</div>
                                </div>
                            </div>

                            <p style="color: #666; font-size: 13px; line-height: 1.6; background: #f9f9f9; padding: 15px; border-radius: 6px;">
                                📝 <strong>What happens next?</strong><br>
                                Your transaction is now recorded on the blockchain. You can track this payment anytime from your SIKAPA dashboard. All transactions are permanent and cannot be reversed.
                            </p>

                            <p style="text-align: center; margin: 25px 0;">
                                <a href="https://sikapamobile.onrender.com/dashboard.html" class="cta-btn" style="text-decoration: none;">View Your Dashboard</a>
                            </p>

                            <div class="support-box">
                                <p><strong>💬 Need Help?</strong></p>
                                <p>If you have any questions about this transaction or need assistance, our support team is ready to help.</p>
                            </div>

                            <div class="footer">
                                <p style="margin-bottom: 15px;">© 2026 SIKAPA. All rights reserved.</p>
                                <p style="color: #bbb; font-size: 10px;">Made with ❤️ for blockchain payments in Ghana</p>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `
    })
};

/**
 * Send Welcome Email
 */
async function sendWelcomeEmail(userName, userEmail) {
    try {
        const mailOptions = {
            from: `SIKAPA <${process.env.GMAIL_USER || 'sikapaghana96@gmail.com'}>`,
            to: userEmail,
            ...emailTemplates.welcome(userName, userEmail)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Welcome email sent to ${userEmail} - Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[Email] Failed to send welcome email to ${userEmail}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send Password Reset Email
 */
async function sendPasswordResetEmail(userEmail, resetLink) {
    try {
        const mailOptions = {
            from: `SIKAPA <${process.env.GMAIL_USER || 'sikapaghana96@gmail.com'}>`,
            to: userEmail,
            ...emailTemplates.resetPassword(resetLink)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Password reset email sent to ${userEmail}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[Email] Failed to send password reset email:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send Payment Confirmation Email
 */
async function sendPaymentConfirmation(userEmail, amount, reference, date) {
    try {
        const mailOptions = {
            from: `SIKAPA <${process.env.GMAIL_USER || 'sikapaghana96@gmail.com'}>`,
            to: userEmail,
            ...emailTemplates.paymentConfirmation(amount, reference, date)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Payment confirmation sent to ${userEmail}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[Email] Failed to send payment confirmation:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send Custom Email
 */
async function sendCustomEmail(to, subject, html) {
    try {
        const mailOptions = {
            from: `SIKAPA <${process.env.GMAIL_USER || 'sikapaghana96@gmail.com'}>`,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Custom email sent to ${to}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[Email] Failed to send custom email:`, error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendPaymentConfirmation,
    sendCustomEmail,
    emailTemplates
};
