const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Get user statistics
router.get('/stats/:userId', (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Initialize stats
        let stats = {
            totalBalance: 0,           // user's deposit balance + withdrawable tier rewards
            withdrawableAmount: 0,     // only tier rewards (claimed rewards)
            totalRevenue: 0,           // completed cashouts only
            commissionToday: 0,
            todayEarning: 0,
            rechargeAmount: 0,         // completed withdrawals only
            friendsInvited: 0,
            referralCommission: 0,
            tasksCompleted: 0,
            taskEarnings: 0,
            tierClaimedToday: 0,
            totalTierEarnings: 0
        };

        // Track today's date for consistent comparisons
        const today = new Date().toDateString();

        // Read user balance for total balance and withdrawable amount
        let userAccountBalance = 0;
        const balancePath = path.join(__dirname, '../logs/user_balances.json');
        if (fs.existsSync(balancePath)) {
            try {
                const balanceData = fs.readFileSync(balancePath, 'utf-8');
                const balances = JSON.parse(balanceData || '[]');
                
                let userBalance = null;
                if (Array.isArray(balances)) {
                    userBalance = balances.find(b => b.userId === userId);
                } else {
                    userBalance = balances[userId];
                }
                
                userAccountBalance = userBalance?.balance || 0;
                stats.withdrawableAmount = userBalance?.withdrawable || 0;
            } catch (error) {
                console.error('Error reading balance data:', error);
            }
        }

        // Read tier claims for tier earnings
        const tierClaimsPath = path.join(__dirname, '../logs/tier_claims.json');
        if (fs.existsSync(tierClaimsPath)) {
            try {
                const tierClaimsData = fs.readFileSync(tierClaimsPath, 'utf-8');
                const tierClaims = JSON.parse(tierClaimsData || '{}');
                const userTierClaims = tierClaims[userId] || {};
                
                // Tier configuration
                const TIER_CONFIG = {
                    0: { daily_reward: 0.5 },
                    1: { daily_reward: 8 },
                    2: { daily_reward: 21 },
                    3: { daily_reward: 60 },
                    4: { daily_reward: 100 }
                };
                
                let tierEarningsToday = 0;
                let totalTierEarnings = 0;
                
                Object.keys(userTierClaims).forEach(tierId => {
                    const claimTime = userTierClaims[tierId];
                    const reward = TIER_CONFIG[tierId]?.daily_reward || 0;
                    
                    totalTierEarnings += reward;
                    
                    // Check if claimed today
                    if (new Date(claimTime).toDateString() === today) {
                        tierEarningsToday += reward;
                        stats.tierClaimedToday += 1;
                    }
                });
                
                stats.totalTierEarnings = totalTierEarnings;
                stats.commissionToday = tierEarningsToday; // Tier earnings as commission today
                stats.todayEarning = tierEarningsToday;    // Today's earning includes tier rewards
                
                // Calculate total balance = account balance + withdrawable tier rewards
                stats.totalBalance = userAccountBalance + stats.withdrawableAmount;
            } catch (error) {
                console.error('Error reading tier claims data:', error);
            }
        }

        // Read cashout requests for revenue (only approved/completed cashouts)
        const cashoutPath = path.join(__dirname, '../logs/cashout_requests.json');
        if (fs.existsSync(cashoutPath)) {
            try {
                const cashoutData = fs.readFileSync(cashoutPath, 'utf-8');
                const cashouts = JSON.parse(cashoutData || '[]');
                
                // Only count approved/completed cashouts for total revenue
                const userCashouts = cashouts.filter(c => 
                    c.userId === userId && (c.status === 'approved' || c.status === 'completed' || c.status === 'success')
                );
                stats.totalRevenue = userCashouts.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
                
                // Calculate today's earnings from approved cashouts
                const todaysCashouts = userCashouts.filter(c => 
                    new Date(c.createdAt).toDateString() === today
                );
                // Add cashout earnings to today's earning (which already includes tier rewards)
                stats.todayEarning += todaysCashouts.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
            } catch (error) {
                console.error('Error reading cashout data:', error);
            }
        }

        // Read withdraw requests for recharge amount (only approved/completed)
        const withdrawPath = path.join(__dirname, '../logs/withdraw_requests.json');
        if (fs.existsSync(withdrawPath)) {
            try {
                const withdrawData = fs.readFileSync(withdrawPath, 'utf-8');
                const withdrawals = JSON.parse(withdrawData || '[]');
                
                // Only count approved/completed withdrawals
                const userWithdrawals = withdrawals.filter(w => 
                    w.userId === userId && (w.status === 'approved' || w.status === 'completed' || w.status === 'success')
                );
                stats.rechargeAmount = userWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
            } catch (error) {
                console.error('Error reading withdraw data:', error);
            }
        }

        // Calculate referral stats
        stats.friendsInvited = 0;
        stats.referralCommission = 0;

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('Error getting user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user statistics'
        });
    }
});

// Get user profile by ID
router.get('/profile/:userId', (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // In a real app, this would query from Firebase
        // For now, return basic profile structure
        res.json({
            success: true,
            profile: {
                userId: userId,
                name: 'User',
                email: 'user@example.com',
                createdAt: new Date().toISOString(),
                referralCode: `SKP${userId.substring(0, 8).toUpperCase()}`
            }
        });

    } catch (error) {
        console.error('Error getting user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile'
        });
    }
});

// Change user password
router.post('/change-password', (req, res) => {
    try {
        const { userId, newPassword } = req.body;

        if (!userId || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'User ID and new password are required'
            });
        }

        // In a real app, this would update password in Firebase
        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

// Update user profile
router.put('/profile/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // In a real app, this would update profile in Firebase
        res.json({
            success: true,
            message: 'Profile updated successfully',
            profile: {
                userId: userId,
                name: name || 'User',
                email: email || 'user@example.com'
            }
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

module.exports = router;
