const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { auth, db } = require('../config/firebase');
const { sendPaymentConfirmation } = require('../services/emailService');

// Get all users
router.get('/users', async (req, res) => {
    try {
        // Get all users from Firebase Auth
        const listUsersResult = await auth.listUsers(1000);
        
        const users = listUsersResult.users.map(user => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            disabled: user.disabled,
            createdAt: user.metadata.creationTime,
            lastSignInTime: user.metadata.lastSignInTime
        }));

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('[Admin] Error getting users:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving users'
        });
    }
});

// Get all transactions (combine withdrawals and cashouts)
router.get('/transactions', (req, res) => {
    try {
        const logsDir = path.join(__dirname, '../logs');
        let allTransactions = [];

        // Read withdraw logs
        const withdrawLogFile = path.join(logsDir, 'withdraw_requests.json');
        if (fs.existsSync(withdrawLogFile)) {
            const withdrawData = JSON.parse(fs.readFileSync(withdrawLogFile, 'utf8'));
            allTransactions.push(...withdrawData.map(t => ({ ...t, type: 'withdraw' })));
        }

        // Read cashout logs
        const cashoutLogFile = path.join(logsDir, 'cashout_requests.json');
        if (fs.existsSync(cashoutLogFile)) {
            const cashoutData = JSON.parse(fs.readFileSync(cashoutLogFile, 'utf8'));
            allTransactions.push(...cashoutData.map(t => ({ ...t, type: 'cashout' })));
        }

        // Sort by date descending
        allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            transactions: allTransactions
        });
    } catch (error) {
        console.error('[Admin] Error getting transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving transactions'
        });
    }
});

// Get dashboard stats
router.get('/stats', (req, res) => {
    try {
        const logsDir = path.join(__dirname, '../logs');
        const stats = {
            totalWithdrawals: 0,
            pendingWithdrawals: 0,
            approvedWithdrawals: 0,
            totalCashouts: 0,
            pendingCashouts: 0,
            approvedCashouts: 0,
            totalUsers: 0
        };

        // Count withdrawals
        const withdrawLogFile = path.join(logsDir, 'withdraw_requests.json');
        if (fs.existsSync(withdrawLogFile)) {
            const withdrawData = JSON.parse(fs.readFileSync(withdrawLogFile, 'utf8'));
            stats.totalWithdrawals = withdrawData.length;
            stats.pendingWithdrawals = withdrawData.filter(w => w.status === 'pending').length;
            stats.approvedWithdrawals = withdrawData.filter(w => w.status === 'approved').length;
        }

        // Count cashouts
        const cashoutLogFile = path.join(logsDir, 'cashout_requests.json');
        if (fs.existsSync(cashoutLogFile)) {
            const cashoutData = JSON.parse(fs.readFileSync(cashoutLogFile, 'utf8'));
            stats.totalCashouts = cashoutData.length;
            stats.pendingCashouts = cashoutData.filter(c => c.status === 'pending').length;
            stats.approvedCashouts = cashoutData.filter(c => c.status === 'approved').length;
        }

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('[Admin] Error getting stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving stats'
        });
    }
});

// Update withdrawal status
router.put('/withdraw/:userId/status', (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const logsDir = path.join(__dirname, '../logs');
        const logFile = path.join(logsDir, 'withdraw_requests.json');

        if (!fs.existsSync(logFile)) {
            return res.status(404).json({
                success: false,
                message: 'No withdrawal requests found'
            });
        }

        let requests = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        const requestIndex = requests.findIndex(r => r.userId === userId);
        const request = requests[requestIndex];

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Withdrawal request not found'
            });
        }

        request.status = status;
        request.updatedAt = new Date().toISOString();

        // If approved, debit the amount from user's balance and withdrawable amount
        if (status === 'approved') {
            const balanceFile = path.join(logsDir, 'user_balances.json');
            const tierEarningsFile = path.join(logsDir, 'tier_earnings.json');
            
            if (fs.existsSync(balanceFile)) {
                try {
                    let balances = JSON.parse(fs.readFileSync(balanceFile, 'utf8'));
                    const userBalanceIndex = balances.findIndex(b => b.userId === userId);

                    if (userBalanceIndex !== -1) {
                        const userBalance = balances[userBalanceIndex];
                        const withdrawalAmount = parseFloat(request.amount);

                        // Deduct from balance and withdrawable
                        userBalance.balance = Math.max(0, userBalance.balance - withdrawalAmount);
                        userBalance.withdrawable = Math.max(0, userBalance.withdrawable - withdrawalAmount);
                        userBalance.lastUpdated = new Date().toISOString();

                        // Save updated balance
                        fs.writeFileSync(balanceFile, JSON.stringify(balances, null, 2));

                        console.log('[Admin] Withdrawal approved and balance debited:', {
                            userId,
                            amount: withdrawalAmount,
                            newBalance: userBalance.balance,
                            newWithdrawable: userBalance.withdrawable
                        });
                    }
                } catch (e) {
                    console.error('[Admin] Error updating user balance:', e);
                    // Continue even if balance update fails
                }
            }

            // Update tier_earnings.json to track withdrawn amount
            if (fs.existsSync(tierEarningsFile)) {
                try {
                    let tierEarnings = JSON.parse(fs.readFileSync(tierEarningsFile, 'utf8'));
                    
                    if (tierEarnings[userId]) {
                        const withdrawalAmount = parseFloat(request.amount);
                        tierEarnings[userId].withdrawn = (tierEarnings[userId].withdrawn || 0) + withdrawalAmount;
                        
                        fs.writeFileSync(tierEarningsFile, JSON.stringify(tierEarnings, null, 2));
                        
                        console.log('[Admin] Updated tier_earnings withdrawn amount for user:', {
                            userId,
                            amount: withdrawalAmount,
                            totalWithdrawn: tierEarnings[userId].withdrawn
                        });
                    }
                } catch (e) {
                    console.error('[Admin] Error updating tier earnings:', e);
                    // Continue even if tier earnings update fails
                }
            }
        }

        fs.writeFileSync(logFile, JSON.stringify(requests, null, 2));

        // Send email notification for approval
        if (status === 'approved' && request.userEmail) {
            try {
                const dateStr = new Date().toLocaleString();
                sendPaymentConfirmation(request.userEmail, request.amount, request.walletId || 'Withdrawal', dateStr)
                    .catch(emailError => {
                        console.error(`[Admin] Failed to send withdrawal approval email:`, emailError.message);
                    });
            } catch (emailError) {
                console.error(`[Admin] Error sending withdrawal email:`, emailError.message);
            }
        }

        res.json({
            success: true,
            message: `Withdrawal status updated to ${status}`
        });
    } catch (error) {
        console.error('[Admin] Error updating withdrawal status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
});

// Update cashout status
router.put('/cashout/:userId/status', (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const logsDir = path.join(__dirname, '../logs');
        const logFile = path.join(logsDir, 'cashout_requests.json');

        if (!fs.existsSync(logFile)) {
            return res.status(404).json({
                success: false,
                message: 'No cashout requests found'
            });
        }

        let requests = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        const request = requests.find(r => r.userId === userId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Cashout request not found'
            });
        }

        request.status = status;
        request.updatedAt = new Date().toISOString();

        fs.writeFileSync(logFile, JSON.stringify(requests, null, 2));

        // Send email notification for approval
        if (status === 'approved' && request.userEmail) {
            try {
                const dateStr = new Date().toLocaleString();
                sendPaymentConfirmation(request.userEmail, request.amount, request.walletId || 'Cashout', dateStr)
                    .catch(emailError => {
                        console.error(`[Admin] Failed to send cashout approval email:`, emailError.message);
                    });
            } catch (emailError) {
                console.error(`[Admin] Error sending cashout email:`, emailError.message);
            }
        }

        res.json({
            success: true,
            message: `Cashout status updated to ${status}`
        });
    } catch (error) {
        console.error('[Admin] Error updating cashout status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
});

// Delete a user permanently
router.delete('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Delete from Firebase Auth
        await auth.deleteUser(userId);
        console.log('[Admin] Deleted user from Firebase:', userId);

        // Remove user data from all log files
        const logsDir = path.join(__dirname, '../logs');
        const logFiles = [
            'user_balances.json',
            'tier_claims.json',
            'tier_earnings.json',
            'deposit_requests.json',
            'withdraw_requests.json',
            'cashout_requests.json',
            'tier_purchases.json',
            'referrals.json'
        ];

        for (const file of logFiles) {
            const filePath = path.join(logsDir, file);
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    let data = JSON.parse(content);

                    // Handle different data structures
                    if (Array.isArray(data)) {
                        // For arrays (deposit, withdraw, cashout, tier_purchases)
                        data = data.filter(item => item.userId !== userId);
                    } else if (typeof data === 'object') {
                        // For objects (user_balances, tier_claims, tier_earnings)
                        if (data[userId]) {
                            delete data[userId];
                        }
                        // Also check for referral codes
                        const referralCode = `SKP${userId.substring(0, 8).toUpperCase()}`;
                        if (data[referralCode]) {
                            delete data[referralCode];
                        }
                    }

                    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                    console.log('[Admin] Removed user data from:', file);
                } catch (error) {
                    console.error(`[Admin] Error processing ${file}:`, error);
                    // Continue with other files if one fails
                }
            }
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('[Admin] Error deleting user:', error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error deleting user'
        });
    }
});

module.exports = router;
