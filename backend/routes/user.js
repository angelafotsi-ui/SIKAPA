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
            totalBalance: 0,           // user's deposit balance + withdrawable tier rewards + referral commission
            withdrawableAmount: 0,     // tier rewards + referral commission
            totalRevenue: 0,           // total tier rewards claimed (earning from tiers)
            commissionToday: 0,        // tier rewards claimed today + referral commission
            todayEarning: 0,           // tier rewards claimed today
            rechargeAmount: 0,         // total amount deposited by user (approved deposits only)
            friendsInvited: 0,
            referralCommission: 0,
            tasksCompleted: 0,
            taskEarnings: 0,
            tierClaimedToday: 0,
            totalTierEarnings: 0,
            depositedAmount: 0         // track deposited amount separately
        };

        // Track today's date for consistent comparisons
        const today = new Date().toDateString();

        // Read user balance for total balance and withdrawable amount (tier rewards)
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
                
                if (userBalance) {
                    userAccountBalance = userBalance.balance || 0;
                    stats.withdrawableAmount = userBalance.withdrawable || 0;
                    stats.totalBalance = userAccountBalance + stats.withdrawableAmount;
                    console.log('[Stats] User balance found:', { userId, balance: userAccountBalance, withdrawable: stats.withdrawableAmount, totalBalance: stats.totalBalance });
                }
            } catch (error) {
                console.error('Error reading balance data:', error);
            }
        }

        // Read tier earnings from tier_earnings.json (cumulative)
        const tierEarningsPath = path.join(__dirname, '../logs/tier_earnings.json');
        if (fs.existsSync(tierEarningsPath)) {
            try {
                const tierEarningsData = fs.readFileSync(tierEarningsPath, 'utf-8');
                const tierEarnings = JSON.parse(tierEarningsData || '{}');
                const userEarnings = tierEarnings[userId];
                
                if (userEarnings && userEarnings.totalEarned !== undefined) {
                    stats.totalTierEarnings = userEarnings.totalEarned;
                    stats.totalRevenue = userEarnings.totalEarned; // Total revenue = cumulative tier earnings
                    console.log('[Stats] Tier earnings found:', { userId, totalEarned: userEarnings.totalEarned, withdrawn: userEarnings.withdrawn });
                }
            } catch (error) {
                console.error('Error reading tier earnings data:', error);
            }
        }
        
        // Read tier claims for today's earnings
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
                
                Object.keys(userTierClaims).forEach(tierId => {
                    const claimTime = userTierClaims[tierId];
                    const reward = TIER_CONFIG[tierId]?.daily_reward || 0;
                    
                    // Check if claimed today
                    if (new Date(claimTime).toDateString() === today) {
                        tierEarningsToday += reward;
                        stats.tierClaimedToday += 1;
                    }
                });
                
                stats.commissionToday = tierEarningsToday; // Tier earnings as commission today
                stats.todayEarning = tierEarningsToday;    // Today's earning = tier rewards claimed today
                console.log('[Stats] Today tier claims:', { userId, tierEarningsToday, tierClaimedToday: stats.tierClaimedToday });
            } catch (error) {
                console.error('Error reading tier claims data:', error);
            }
        }

        // Read deposits for recharge amount (only approved deposits)
        const depositPath = path.join(__dirname, '../logs/deposit_requests.json');
        if (fs.existsSync(depositPath)) {
            try {
                const depositData = fs.readFileSync(depositPath, 'utf-8');
                const deposits = JSON.parse(depositData || '[]');
                
                // Only count approved deposits for recharge amount
                const userDeposits = deposits.filter(d => 
                    d.userId === userId && d.status === 'approved'
                );
                stats.rechargeAmount = userDeposits.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
                stats.depositedAmount = stats.rechargeAmount; // Store separately as well
                console.log('[Stats] Deposits found:', { userId, depositCount: userDeposits.length, rechargeAmount: stats.rechargeAmount });
            } catch (error) {
                console.error('Error reading deposit data:', error);
            }
        }

        // Read cashout requests (kept for reference, but not used for total revenue anymore)
        const cashoutPath = path.join(__dirname, '../logs/cashout_requests.json');
        if (fs.existsSync(cashoutPath)) {
            try {
                const cashoutData = fs.readFileSync(cashoutPath, 'utf-8');
                const cashouts = JSON.parse(cashoutData || '[]');
                
                // Calculate today's earnings from approved cashouts (if needed)
                const userCashouts = cashouts.filter(c => 
                    c.userId === userId && (c.status === 'approved' || c.status === 'completed' || c.status === 'success')
                );
                const todaysCashouts = userCashouts.filter(c => 
                    new Date(c.createdAt).toDateString() === today
                );
                // Cashout earnings are not included in today's earning (only tier rewards are)
                // If you want to include them, uncomment the line below:
                // stats.todayEarning += todaysCashouts.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
            } catch (error) {
                console.error('Error reading cashout data:', error);
            }
        }

        // Read withdraw requests (keeping for backwards compatibility)
        const withdrawPath = path.join(__dirname, '../logs/withdraw_requests.json');
        if (fs.existsSync(withdrawPath)) {
            try {
                const withdrawData = fs.readFileSync(withdrawPath, 'utf-8');
                const withdrawals = JSON.parse(withdrawData || '[]');
                
                // This section can be used for other purposes if needed
                // Currently, recharge amount is from deposits, not withdrawals
            } catch (error) {
                console.error('Error reading withdraw data:', error);
            }
        }

        // Calculate referral stats and commission
        let referralCommissionEarned = 0;
        
        const referralsPath = path.join(__dirname, '../logs/referrals.json');
        if (fs.existsSync(referralsPath)) {
            try {
                const referralsData = JSON.parse(fs.readFileSync(referralsPath, 'utf8'));
                const referralCode = `SKP${userId.substring(0, 8).toUpperCase()}`;
                
                if (referralsData[referralCode]) {
                    const referredUsers = referralsData[referralCode].referredUsers || [];
                    stats.friendsInvited = referredUsers.length;
                    
                    // Calculate 1% commission from referred user deposits
                    if (fs.existsSync(depositPath)) {
                        const allDeposits = JSON.parse(fs.readFileSync(depositPath, 'utf8'));
                        const referredUserIds = referredUsers.map(u => u.userId);
                        const referredUserDeposits = allDeposits.filter(d => 
                            referredUserIds.includes(d.userId) && d.status === 'approved'
                        );
                        const totalReferredDeposits = referredUserDeposits.reduce(
                            (sum, d) => sum + parseFloat(d.amount || 0), 
                            0
                        );
                        referralCommissionEarned = totalReferredDeposits * 0.01; // 1% commission
                        console.log('[Stats] Referral commission calculated:', { referralCode, referralCommissionEarned });
                    }
                } else {
                    stats.friendsInvited = 0;
                }
            } catch (e) {
                console.error('[Stats] Error reading referrals:', e);
                stats.friendsInvited = 0;
            }
        } else {
            stats.friendsInvited = 0;
        }

        // Add referral commission to total balance, commission today, and withdrawable amount
        stats.totalBalance = (stats.totalBalance || 0) + referralCommissionEarned;
        stats.commissionToday = (stats.commissionToday || 0) + referralCommissionEarned;
        stats.withdrawableAmount = (stats.withdrawableAmount || 0) + referralCommissionEarned;
        stats.referralCommission = referralCommissionEarned;

        console.log('[Stats] Final stats:', { totalBalance: stats.totalBalance, commissionToday: stats.commissionToday, withdrawableAmount: stats.withdrawableAmount, referralCommission: stats.referralCommission });

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

// Debug endpoint to check referrals file
router.get('/debug/referrals', (req, res) => {
    try {
        const referralsPath = path.join(__dirname, '../logs/referrals.json');
        if (fs.existsSync(referralsPath)) {
            const referralsData = JSON.parse(fs.readFileSync(referralsPath, 'utf8'));
            res.json({
                success: true,
                fileExists: true,
                keys: Object.keys(referralsData),
                fullData: referralsData
            });
        } else {
            res.json({
                success: true,
                fileExists: false,
                message: 'Referrals file does not exist'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error reading referrals file',
            error: error.message
        });
    }
});

// Get referral statistics for a user
router.get('/referrals/:userId', (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Generate referral code for this user (based on their userId)
        const referralCode = `SKP${userId.substring(0, 8).toUpperCase()}`;
        console.log('[User] Referral request:', { userId, referralCode });

        let friendsInvited = 0;
        let commissionEarned = 0;
        let referredUsers = [];

        // Read referrals file
        const referralsPath = path.join(__dirname, '../logs/referrals.json');
        if (fs.existsSync(referralsPath)) {
            try {
                const referralsData = JSON.parse(fs.readFileSync(referralsPath, 'utf8'));
                console.log('[User] Referrals data:', Object.keys(referralsData));
                
                if (referralsData[referralCode]) {
                    referredUsers = referralsData[referralCode].referredUsers || [];
                    friendsInvited = referredUsers.length;
                    console.log('[User] Found referral code:', { referralCode, friendsInvited });

                    // Calculate commission: 1% of all deposits from referred users
                    const depositPath = path.join(__dirname, '../logs/deposit_requests.json');
                    if (fs.existsSync(depositPath)) {
                        try {
                            const allDeposits = JSON.parse(fs.readFileSync(depositPath, 'utf8'));
                            
                            // Find deposits from referred users
                            const referredUserIds = referredUsers.map(u => u.userId);
                            console.log('[User] Referred user IDs:', referredUserIds);
                            
                            const referredUserDeposits = allDeposits.filter(d => 
                                referredUserIds.includes(d.userId) && d.status === 'approved'
                            );

                            // Calculate 1% commission
                            const totalReferredDeposits = referredUserDeposits.reduce(
                                (sum, d) => sum + parseFloat(d.amount || 0), 
                                0
                            );
                            commissionEarned = totalReferredDeposits * 0.01; // 1% commission
                            console.log('[User] Commission calculated:', { totalReferredDeposits, commissionEarned });
                        } catch (e) {
                            console.error('[User] Error reading deposits for commission:', e);
                        }
                    }
                } else {
                    console.log('[User] Referral code not found:', referralCode);
                }
            } catch (e) {
                console.error('[User] Error reading referrals:', e);
            }
        } else {
            console.log('[User] Referrals file not found:', referralsPath);
        }

        res.json({
            success: true,
            referrals: {
                referralCode,
                friendsInvited,
                commissionEarned: parseFloat(commissionEarned.toFixed(2)),
                referredUsers: referredUsers.map(u => ({
                    name: u.name,
                    email: u.email,
                    signupDate: u.signupDate
                }))
            }
        });
    } catch (error) {
        console.error('[User] Error getting referrals:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving referral information'
        });
    }
});

module.exports = router;
